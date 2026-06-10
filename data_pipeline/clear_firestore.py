import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'firebase-key.json')
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
else:
    firebase_admin.initialize_app()

db = firestore.client()

def delete_collection(collection_ref, batch_size=200):
    docs = list(collection_ref.limit(batch_size).stream())
    if not docs:
        return
        
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
        
    batch.commit()
    print(f"Deleted {len(docs)} documents from {collection_ref.id}.")
    
    if len(docs) >= batch_size:
        delete_collection(collection_ref, batch_size)

print("Clearing alerts...")
delete_collection(db.collection("alerts"))
print("Clearing metrics...")
delete_collection(db.collection("metrics"))
print("Clear complete.")
