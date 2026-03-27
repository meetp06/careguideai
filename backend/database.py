import aerospike
from aerospike import exception as ex
import os
from dotenv import load_dotenv

load_dotenv()

# Basic Aerospike client configuration
config = {
    'hosts': [ (os.getenv('AEROSPIKE_HOST', '127.0.0.1'), int(os.getenv('AEROSPIKE_PORT', 3000))) ]
}
namespace = os.getenv('AEROSPIKE_NAMESPACE', 'test')

class AerospikeDB:
    def __init__(self):
        try:
            self.client = aerospike.client(config).connect()
            print("Connected to Aerospike successfully.")
        except ex.ClientError as e:
            print(f"Error connecting to Aerospike: {e}")
            self.client = None

    def get_doctors_by_specialty(self, specialty: str, limit: int = 3):
        """
        Query Aerospike for doctors matching a specific specialty.
        Returns a list of matching doctors or fallback logic if the DB is empty.
        """
        if not self.client:
            print("WARNING: Aerospike client not connected. Returning empty (frontend will fallback).")
            return []
            
        try:
            # We use a Secondary Index on 'specialty' or fetch all and filter for the hackathon
            query = self.client.query(namespace, 'doctors')
            query.select('id', 'name', 'specialty', 'hospital', 'availability', 'rating', 'distance')
            
            # Simple hackathon filter logic: Fetch all doctors and filter in Python
            # (In production: use Aerospike query filters or indexing)
            records = query.results()
            doctors = []
            
            for key, metadata, bins in records:
                if bins.get('specialty', '').lower() == specialty.lower():
                    doctors.append(bins)
            
            # Sort by rating (highest first) and take the top `limit`
            doctors.sort(key=lambda x: x.get('rating', 0), reverse=True)
            return doctors[:limit]
            
        except Exception as e:
            print(f"Aerospike query error: {e}")
            return []

db = AerospikeDB()
