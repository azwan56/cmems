import firebase_admin
from firebase_admin import credentials, firestore
import os
import random
from datetime import datetime, timedelta

cred_path = 'firebase-key.json'
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    app = firebase_admin.initialize_app(cred)
else:
    app = firebase_admin.initialize_app()

db = firestore.client()

# Coordinates of the 9 active Chlorophyll warning points
chl_coords = [
    (22.25, 113.75),
    (30.25, 121.5),
    (30.75, 121.75),
    (30.75, 122.0),
    (31.0, 122.0),
    (31.25, 122.0),
    (31.5, 122.0),
    (31.75, 122.0),
    (32.5, 121.25)
]

# Mock coordinates for 2 low Dissolved Oxygen points
o2_coords = [
    (31.0, 122.5),
    (29.5, 122.25)
]

print("Generating 7-day historical mock data...")

# We generate data for the last 7 days (day 0 to day 6 ago)
now = datetime.utcnow()

# Clean up first to avoid duplicating mock records
# (We only delete backdated ones to avoid destroying today's fresh runs, but for clean look we delete all)
def delete_collection(collection_ref):
    docs = list(collection_ref.limit(200).stream())
    if not docs:
        return
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
    batch.commit()
    delete_collection(collection_ref)

print("Clearing database first...")
delete_collection(db.collection("alerts"))
delete_collection(db.collection("metrics"))

# Write batch list
metrics_batch = []
alerts_list = []

# 1. Generate Chlorophyll (chl) history
for lat, lon in chl_coords:
    # Base value around 4.0 - 6.0
    base_val = random.uniform(4.5, 5.5)
    for d in range(7):
        timestamp = (now - timedelta(days=d)).isoformat()
        # Random fluctuation (random walk)
        val = base_val + random.uniform(-1.5, 2.5)
        # Keep it positive
        val = max(1.0, val)
        
        # Add to metrics
        metrics_batch.append({
            "timestamp": timestamp,
            "lat": lat,
            "lon": lon,
            "variable": "chl",
            "value": val
        })
        
        # Generate alert if > 5.0
        if val > 5.0:
            alerts_list.append({
                "timestamp": timestamp,
                "type": "赤潮预警",
                "lat": lat,
                "lon": lon,
                "value": val,
                "message": f"检测到海域叶绿素a浓度偏高 ({val:.2f} mg/m³)，存在赤潮爆发风险。",
                "level": "WARNING"
            })

# 2. Generate Dissolved Oxygen (o2) history
for lat, lon in o2_coords:
    # Base value around 100 - 130
    base_val = random.uniform(85.0, 115.0)
    for d in range(7):
        timestamp = (now - timedelta(days=d)).isoformat()
        val = base_val + random.uniform(-40.0, 30.0)
        # Keep DO realistic (20 to 220)
        val = max(20.0, min(val, 220.0))
        
        # Add to metrics
        metrics_batch.append({
            "timestamp": timestamp,
            "lat": lat,
            "lon": lon,
            "variable": "o2",
            "value": val
        })
        
        # Generate alert if < 120.0
        if val < 62.5:
            alerts_list.append({
                "timestamp": timestamp,
                "type": "水体缺氧",
                "lat": lat,
                "lon": lon,
                "value": val,
                "message": f"检测到近海底层水体严重缺氧 ({val:.2f} mmol/m³)，低于生物窒息阈值，存在重度缺氧致死风险。",
                "level": "CRITICAL"
            })
        elif val < 120.0:
            alerts_list.append({
                "timestamp": timestamp,
                "type": "水体缺氧",
                "lat": lat,
                "lon": lon,
                "value": val,
                "message": f"检测到近海底层溶解氧偏低 ({val:.2f} mmol/m³)，可能导致底栖生物缺氧窒息风险。",
                "level": "WARNING"
            })

# Commit Metrics in batches of 500
batch = db.batch()
count = 0
for metric in metrics_batch:
    doc_ref = db.collection("metrics").document()
    batch.set(doc_ref, metric)
    count += 1
    if count == 500:
        batch.commit()
        batch = db.batch()
        count = 0
if count > 0:
    batch.commit()
print(f"Uploaded {len(metrics_batch)} historical metrics.")

# Commit Alerts
batch = db.batch()
count = 0
for alert in alerts_list:
    doc_ref = db.collection("alerts").document()
    batch.set(doc_ref, alert)
    count += 1
    if count == 500:
        batch.commit()
        batch = db.batch()
        count = 0
if count > 0:
    batch.commit()
print(f"Uploaded {len(alerts_list)} historical alerts.")

print("Historical mock data generation completed successfully!")
