"""
Database Configuration - MongoDB Atlas Connection
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection settings
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = "traffic_detection"

# Global database client
client = None
db = None


async def connect_to_mongodb():
    """Connect to MongoDB Atlas"""
    global client, db
    try:
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas successfully!")
        
        # Create indexes
        await create_indexes()
        
        return db
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise e


async def close_mongodb_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("📴 MongoDB connection closed")


async def create_indexes():
    """Create database indexes for better performance"""
    global db
    
    # User indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("username", unique=True)
    
    # Detection indexes
    await db.detections.create_index("user_id")
    await db.detections.create_index("created_at")
    
    print("📊 Database indexes created")


def get_database():
    """Get database instance"""
    return db


def get_collection(name: str):
    """Get a specific collection"""
    return db[name]
