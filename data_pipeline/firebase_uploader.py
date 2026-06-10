import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase app
try:
    cred_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'firebase-key.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        app = firebase_admin.initialize_app(cred)
    else:
        # Fallback to Application Default Credentials on GCP (Cloud Run)
        app = firebase_admin.initialize_app()
except ValueError:
    # Already initialized
    pass

db = firestore.client()

from discord_webhook import send_discord_alert

def upload_alert(alert_data):
    """
    alert_data dict containing: timestamp, type, lat, lon, value, message, level
    """
    db.collection("alerts").add(alert_data)
    print(f"Alert uploaded: {alert_data['message']}")
    # Send to Discord if webhook is configured
    send_discord_alert(alert_data)

def upload_metrics(metrics_list):
    """
    Upload a batch of metrics. 
    Each metric is a dict: timestamp, lat, lon, variable (chl/o2/no3/sst), value
    """
    batch = db.batch()
    count = 0
    for metric in metrics_list:
        doc_ref = db.collection("metrics").document()
        batch.set(doc_ref, metric)
        count += 1
        if count == 500: # Firestore batch limit
            batch.commit()
            batch = db.batch()
            count = 0
    if count > 0:
        batch.commit()
    print(f"Uploaded {len(metrics_list)} metrics successfully.")
