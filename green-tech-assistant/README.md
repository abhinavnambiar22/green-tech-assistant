# Green-Tech Inventory Assistant 🌿

An AI-powered inventory management system designed to reduce waste in institutional environments (Cafes, IT Departments, and Labs) using Computer Vision and Automated Metadata Extraction.

## 🚀 Quick Start
1. **Backend:** `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
2. **Frontend:** `cd frontend && npm install && npm run dev`
3. **Database:** Powered by Supabase (PostgreSQL + Auth).

## ✨ Key Features
- **Domain-Specific AI Vision:** Uses Gemini 2.5 Flash to identify items based on a strict departmental taxonomy (e.g., Cafe vs. IT).
- **Automated Shelf-Life Alerts:** AI automatically extracts expiration dates for perishable items (Milk, Beans) but ignores them for hardware.
- **Multi-Tenant Security:** Sign-up metadata locks users into specific departments; a Cafe Manager cannot see IT inventory.
- **Smart Metadata Merging:** When scanning existing items, the system aggregates counts and merges new attributes (like color or brand) into the existing record.

## 🛠 Tech Stack
- **Frontend:** React.js, Tailwind CSS (Vite)
- **Backend:** FastAPI (Python)
- **AI Model:** Google Gemini 2.5 Flash
- **Database & Auth:** Supabase (PostgreSQL)

## 📊 Design Overview
The system follows a **Controller-Service-Repository** pattern. The React frontend captures high-resolution frames, which are processed by the FastAPI backend. The backend acts as a "Gatekeeper," enforcing strict naming conventions on the AI output before it ever touches the Supabase database to ensure data integrity.

## 🧪 Synthetic Dataset
A sample of the data structure used for testing can be found in `synthetic_data.json`.