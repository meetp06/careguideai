from database import db, namespace
import uuid

# Simulate Airbyte syncing a curated CSV of hospital doctors into our real-time DB
mock_doctors = [
    {
        "id": str(uuid.uuid4()),
        "name": "Dr. Sarah Chen",
        "specialty": "Cardiology",
        "hospital": "Heart Institute",
        "availability": "Today, 2:00 PM",
        "rating": 4.9,
        "distance": "1.2 miles"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Dr. James Wilson",
        "specialty": "Cardiology",
        "hospital": "City General",
        "availability": "Tomorrow, 10:00 AM",
        "rating": 4.7,
        "distance": "3.5 miles"
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Dr. Emily Martinez",
        "specialty": "Primary Care",
        "hospital": "Family Health Clinic",
        "availability": "Today, 4:30 PM",
        "rating": 4.8,
        "distance": "0.8 miles"
    },
    # Feel free to add more specialties here (Orthopedics, Neurology, etc.)!
]

def seed_database():
    if not db.client:
        print("Cannot seed data: Aerospike is not connected.")
        return

    print("Simulating Airbyte Sync: Seeding doctor database into Aerospike...")
    
    for i, doc in enumerate(mock_doctors):
        # The primary key (PK) is the doctor's unique ID
        key = (namespace, 'doctors', doc['id'])
        
        try:
            db.client.put(key, doc)
            print(f"Inserted: {doc['name']} ({doc['specialty']})")
        except Exception as e:
            print(f"Failed to insert record {i}: {e}")
            
    print("Seeding complete!")

if __name__ == "__main__":
    seed_database()
