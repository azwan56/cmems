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

# Global in-memory cache to aggregate data for a single run
_metrics_cache = []
_alerts_cache = []
_tracks_cache = []
_enso_cache = []

def upload_alert(alert_data):
    """
    Cache alert data and trigger Discord Webhook.
    """
    global _alerts_cache
    lat = alert_data.get("lat")
    lon = alert_data.get("lon")
    if lat is not None and lon is not None:
        from discord_webhook import get_nearby_cities
        alert_data["nearby_cities"] = get_nearby_cities(lat, lon)

    _alerts_cache.append(alert_data)
    print(f"Alert cached: {alert_data['message']}")
    # Send to Discord if webhook is configured
    send_discord_alert(alert_data)

def upload_metrics(metrics_list):
    """
    Cache metrics list for dashboard and update individual time_series history documents.
    """
    global _metrics_cache
    _metrics_cache.extend(metrics_list)
    
    print(f"Updating time_series collection for {len(metrics_list)} metrics...")
    for metric in metrics_list:
        lat = metric["lat"]
        lon = metric["lon"]
        var = metric["variable"]
        val = metric["value"]
        ts = metric["timestamp"]
        
        # Consistent document ID: lat_lon_var with 4 decimals to ensure perfect matching
        doc_id = f"{lat:.4f}_{lon:.4f}_{var}"
        doc_ref = db.collection("time_series").document(doc_id)
        
        # Read the current history (if it exists)
        doc = doc_ref.get()
        history = []
        if doc.exists:
            history = doc.to_dict().get("history", [])
            
        # Append new value
        history.append({"timestamp": ts, "value": val})
        
        # Keep only the last 7 entries (7 days trend)
        if len(history) > 7:
            history = history[-7:]
            
        # Update/Create time series document
        doc_ref.set({
            "lat": lat,
            "lon": lon,
            "variable": var,
            "history": history,
            "last_updated": ts
        })
        
    print(f"Processed time series and cached {len(metrics_list)} metrics.")

def upload_litter_tracks(tracks_list):
    """
    Cache litter tracks for dashboard.
    """
    global _tracks_cache
    _tracks_cache.extend(tracks_list)
    print(f"Cached {len(tracks_list)} litter tracks successfully.")

def upload_enso_metrics(enso_list):
    """
    Cache ENSO metrics for dashboard, and keep writing history to enso_metrics for archiving.
    """
    global _enso_cache
    _enso_cache.extend(enso_list)
    
    # Still write to enso_metrics to preserve chronological backups
    batch = db.batch()
    count = 0
    for record in enso_list:
        date_str = record["timestamp"][:7] 
        doc_ref = db.collection("enso_metrics").document(date_str)
        batch.set(doc_ref, record)
        count += 1
        if count == 500:
            batch.commit()
            batch = db.batch()
            count = 0
    if count > 0:
        batch.commit()
    print(f"Cached {len(enso_list)} ENSO records and updated archival collection.")

def commit_dashboard():
    """
    Commit all cached run data into a single aggregated latest_run document.
    This reduces the cold-start read overhead to exactly 1 document read.
    """
    global _metrics_cache, _alerts_cache, _tracks_cache, _enso_cache
    
    from datetime import datetime
    sync_ts = datetime.utcnow().isoformat()
    
    dashboard_data = {
        "timestamp": sync_ts,
        "metrics": _metrics_cache,
        "alerts": _alerts_cache,
        "litter_tracks": _tracks_cache,
        "enso_metrics": _enso_cache
    }
    
    print("Committing all aggregated data to latest_run/dashboard...")
    db.collection("latest_run").document("dashboard").set(dashboard_data)
    print("Aggregate commit complete!")
    
    # Flush global memory cache
    _metrics_cache = []
    _alerts_cache = []
    _tracks_cache = []
    _enso_cache = []



