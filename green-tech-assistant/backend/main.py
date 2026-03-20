import base64
import json
from io import BytesIO
from PIL import Image
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load the variables from .env
load_dotenv()

# Replace your hardcoded strings with these
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# --- 1. CONFIGURATION ---
client = genai.Client(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageData(BaseModel):
    image: str
    domain: str 

# UPGRADE 1: Add the dynamic metadata dictionary to our strict Pydantic model
class InventoryItem(BaseModel):
    item_name: str
    estimated_count: int
    confidence_score: float
    metadata: dict 

class SavePayload(BaseModel):
    items: list[InventoryItem]
    domain: str

@app.get("/")
def read_root():
    return {"message": "Green-Tech API is live and connected!"}

@app.post("/analyze-image")
def analyze_image(payload: ImageData):
    try:
        print(f"📸 Scanning image for domain: {payload.domain}")
        
        # --- THE STRICT TAXONOMY ---
        # We define exactly what the AI is allowed to call things.
        taxonomies = {
            "IT Equipment": [
                "Smartphone", "Charging Cable", "Earbuds Case", 
                "Power Adapter", "Extension Board", "Laptop", 
                "Keyboard", "Mouse", "Monitor"
            ],
            "Cafe Supplies": [
                "Coffee Cup", "Napkins", "Coffee Beans", "Syrup Bottle"
            ],
            "Lab Chemicals": [
                "Beaker", "Test Tube", "Flask", "Safety Goggles"
            ],
            "Clothing Drive": [
                "Shirt", "Pants", "Jacket", "Shoes", "Hat"
            ]
        }
        
        # Get the allowed list for the user's selected domain
        allowed_list = taxonomies.get(payload.domain, ["Unknown Item"])
        allowed_str = ", ".join(allowed_list)
        print(f"🔒 Enforcing Strict Taxonomy: {allowed_str}")
            
        image_data = payload.image.split(",")[1]
        image_bytes = base64.b64decode(image_data)
        img = Image.open(BytesIO(image_bytes))
        
        # --- SMART PERISHABILITY LOGIC ---
        expiry_instruction = ""
        if payload.domain == "Cafe Supplies":
            expiry_instruction = "CRITICAL: For PERISHABLE consumables ONLY (like Coffee Beans, Syrup Bottle, Milk), you MUST include an 'expiration_date' key (Format: YYYY-MM-DD). Do NOT add expiration dates to hardware or assets like Coffee Cups, Napkins, or Machines."
        elif payload.domain == "Lab Chemicals":
            expiry_instruction = "CRITICAL: For chemical reagents, you MUST include an 'expiration_date' key (Format: YYYY-MM-DD). Do NOT add expiration dates to hardware like Beakers, Flasks, or Safety Goggles."

        # --- THE LOCKDOWN PROMPT ---
        prompt = f"""
        You are an expert inventory classifier for: {payload.domain}.
        
        STRICT ALLOWED ITEM NAMES:
        [{allowed_str}]
        
        Task: Identify ALL distinct items in the image.
        
        CRITICAL RULES:
        1. FOR NAMING: You MUST classify every item using ONLY ONE of the exact names from the STRICT ALLOWED ITEM NAMES list.
        2. DO NOT invent new names.
        3. If an item does not fit anything on the list, ignore it.
        4. For each item, extract 2 to 3 highly specific attributes and put them in the 'metadata' object.
        {expiry_instruction}
        
        Return ONLY a JSON object using this exact structure:
        {{
            "items": [
                {{
                    "item_name": "EXACT_NAME_FROM_ALLOWED_LIST",
                    "estimated_count": 1,
                    "confidence_score": 0.95,
                    "metadata": {{
                        "brand": "Example",
                        "expiration_date": "2026-04-10"
                    }}
                }}
            ]
        }}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, img],
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        
        ai_result = json.loads(response.text)
        print(f"✅ AI found {len(ai_result.get('items', []))} items using strict classification!")
        return {"status": "success", "ai_analysis": ai_result}
        
    except Exception as e:
        print(f"❌ Error during AI analysis: {e}")
        return {"status": "error", "message": "AI failed to analyze image"}

@app.post("/save-items")
def save_items(payload: SavePayload):
    try:
        print(f"💾 Processing {len(payload.items)} items for database aggregation...")
        
        for item in payload.items:
            # 1. Check if the item already exists in this specific domain
            existing_response = supabase.table("inventory_logs").select("*").eq("item_name", item.item_name).eq("domain", payload.domain).execute()
            
            if existing_response.data:
                # 2. ITEM EXISTS: Aggregate the count
                existing_record = existing_response.data[0]
                new_count = existing_record["estimated_count"] + item.estimated_count
                
                # --- NEW: THE SMART METADATA MERGE ---
                # Grab the old metadata from the database (default to empty dict if none exists)
                old_metadata = existing_record.get("metadata") or {}
                
                # Combine the old dictionary with the new dictionary from the AI
                # (If they both have a "color" key, the newest scan will overwrite just that key)
                merged_metadata = {**old_metadata, **item.metadata}
                
                # Update the database with the new total count and the MERGED metadata
                supabase.table("inventory_logs").update({
                    "estimated_count": new_count,
                    "confidence_score": item.confidence_score, 
                    "metadata": merged_metadata 
                }).eq("id", existing_record["id"]).execute()
                
                print(f"🔄 AGGREGATED: Updated '{item.item_name}'. Merged metadata: {merged_metadata}")
                
            else:
                # 3. NEW ITEM: Insert a brand new row
                supabase.table("inventory_logs").insert({
                    "item_name": item.item_name,
                    "estimated_count": item.estimated_count,
                    "domain": payload.domain,
                    "confidence_score": item.confidence_score,
                    "metadata": item.metadata
                }).execute()
                
                print(f"➕ INSERTED: Created new record for '{item.item_name}'")
                
        return {"status": "success", "message": "Items logged and aggregated successfully!"}
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return {"status": "error", "message": "Failed to save items to database."}

@app.get("/get-inventory")
def get_inventory(domain: str = None):
    try:
        # If a domain is provided, filter the database. Otherwise, get nothing (security first!)
        if domain:
            response = supabase.table("inventory_logs").select("*").eq("domain", domain).order("created_at", desc=True).execute()
        else:
            return {"status": "error", "message": "Unauthorized: No department specified."}
            
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": "Failed to fetch inventory from database."}