from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/doctors")
async def get_doctors(specialty: str = "Family Medicine"):
    # Demonstrating Airbyte Agent Connectors usage
    try:
        from airbyte_agent_notion import NotionConnector
        from airbyte_agent_notion.models import NotionAuthConfig
        
        token = os.environ.get("NOTION_TOKEN")
        if token:
            print("Fetching live data from Notion via Airbyte...")
            connector = NotionConnector(auth_config=NotionAuthConfig(access_token=token))
            result = await connector.execute("pages", "list", {})
            return {"data": result.data}
    except ImportError as e:
        print(f"Airbyte packages not fully loaded: {e}")
    except Exception as e:
        print(f"Airbyte connector error (expected if no key): {type(e).__name__}: {e}")

    # Fallback to demo mock data returning the requested specialty
    return {
        "data": [
            {
                "id": "airbyte-1",
                "name": f"Dr. Airbyte ({specialty})",
                "specialty": specialty,
                "location": "Real-Time Data Clinic",
                "distance": "0.5 mi",
                "rating": 5.0,
                "reviewCount": 128,
                "availability": "Today, 1:00 PM",
                "phone": "(555) 001-0002",
                "imageUrl": "",
                "acceptsNewPatients": True
            }
        ]
    }
