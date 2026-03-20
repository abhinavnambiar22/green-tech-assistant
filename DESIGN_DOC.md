# Technical Design Document: Green-Tech Assistant

## 1. System Architecture
The application is built on a decoupled architecture to ensure scalability across different institutional departments.

### A. Data Isolation (Multi-Tenancy)
We utilize **Supabase User Metadata** to implement Row-Level Security (RLS) concepts. 
- During `auth.signUp`, the user's selected `organization` is stored in the JWT.
- The frontend extracts this "Badge" and passes it to every API call.
- The Backend filters all `GET` and `POST` requests by the `domain` column, ensuring tenant isolation.

### B. AI Logic & Taxonomy Enforcement
To prevent "AI Hallucinations," we implemented a **Strict Taxonomy Engine** in the Python backend:
- **Prompt Engineering:** The AI is provided a JSON-only schema and a list of allowed keywords.
- **Perishability Logic:** The backend dynamically injects "Expiry Instructions" only if the user's domain is marked as "Perishable" (e.g., Cafe Supplies).

## 2. Database Schema (`inventory_logs`)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `item_name` | String | Limited to domain taxonomy |
| `estimated_count` | Integer | Aggregated on repeated scans |
| `domain` | String | Used for tenant filtering |
| `metadata` | JSONB | Stores dynamic attributes (Brand, Expiry, Size) |
| `confidence_score`| Float | AI certainty level |

## 3. Challenges & Tradeoffs
- **Rate Limiting:** Encountered `429 Resource Exhausted` errors on the Gemini Free Tier. Solved by implementing a fallback mechanism between `gemini-2.5-flash` and `gemini-2.5-pro`.
- **Data Integrity:** Users often scan the same item twice. We built a **UPSERT** (Update or Insert) logic in the backend to merge metadata instead of creating duplicate rows.

## 4. Future Enhancements
- **Carbon Footprint Tracking:** Mapping item types to CO2 emission data to show "Total Carbon Saved" on the dashboard.
- **Barcode Fallback:** Adding a Tesseract OCR layer to read barcodes when the visual classifier is uncertain.