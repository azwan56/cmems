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

# Coordinates for 3 mock marine litter hotspot areas
litter_coords = [
    (21.9, 113.85, "珠江口外海区"),
    (31.25, 122.2, "长江口外海区"),
    (29.85, 122.45, "舟山海域")
]

print("Generating 7-day historical mock data under new Schema...")

now = datetime.utcnow()

# Clean up collections to avoid duplication
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
delete_collection(db.collection("time_series"))
delete_collection(db.collection("latest_run"))

# Buffers for the latest run dashboard document (d = 0, today's data)
dashboard_metrics = []
dashboard_alerts = []
dashboard_tracks = []

# Helper to load nearby cities
from discord_webhook import get_nearby_cities

# 1. Generate Chlorophyll (chl) history
print("Writing Chlorophyll (chl) time series...")
for lat, lon in chl_coords:
    base_val = random.uniform(4.5, 5.5)
    history = []
    
    # Loop from day 6 ago to day 0 (chronological order)
    for d in reversed(range(7)):
        timestamp = (now - timedelta(days=d)).isoformat()
        val = base_val + random.uniform(-1.5, 2.5)
        val = max(1.0, val)
        
        history.append({
            "timestamp": timestamp,
            "value": val
        })
        
        # Latest data goes to dashboard
        if d == 0:
            dashboard_metrics.append({
                "timestamp": timestamp,
                "lat": lat,
                "lon": lon,
                "variable": "chl",
                "value": val
            })
            if val > 5.0:
                alert = {
                    "timestamp": timestamp,
                    "type": "赤潮预警",
                    "lat": lat,
                    "lon": lon,
                    "value": val,
                    "message": f"检测到海域叶绿素a浓度偏高 ({val:.2f} mg/m³)，存在赤潮爆发风险。",
                    "level": "WARNING",
                    "nearby_cities": get_nearby_cities(lat, lon)
                }
                dashboard_alerts.append(alert)
                
    doc_id = f"{lat:.4f}_{lon:.4f}_chl"
    db.collection("time_series").document(doc_id).set({
        "lat": lat,
        "lon": lon,
        "variable": "chl",
        "history": history,
        "last_updated": now.isoformat()
    })

# 2. Generate Dissolved Oxygen (o2) history
print("Writing Dissolved Oxygen (o2) time series...")
for lat, lon in o2_coords:
    base_val = random.uniform(85.0, 115.0)
    history = []
    
    for d in reversed(range(7)):
        timestamp = (now - timedelta(days=d)).isoformat()
        val = base_val + random.uniform(-40.0, 30.0)
        val = max(20.0, min(val, 220.0))
        
        history.append({
            "timestamp": timestamp,
            "value": val
        })
        
        if d == 0:
            dashboard_metrics.append({
                "timestamp": timestamp,
                "lat": lat,
                "lon": lon,
                "variable": "o2",
                "value": val
            })
            if val < 120.0:
                level = "CRITICAL" if val < 62.5 else "WARNING"
                msg = f"检测到近海底层水体严重缺氧 ({val:.2f} mmol/m³)，低于生物窒息阈值，存在重度缺氧致死风险。" if val < 62.5 else f"检测到近海底层溶解氧偏低 ({val:.2f} mmol/m³)，可能导致底栖生物缺氧窒息风险。"
                alert = {
                    "timestamp": timestamp,
                    "type": "水体缺氧",
                    "lat": lat,
                    "lon": lon,
                    "value": val,
                    "message": msg,
                    "level": level,
                    "nearby_cities": get_nearby_cities(lat, lon)
                }
                dashboard_alerts.append(alert)
                
    doc_id = f"{lat:.4f}_{lon:.4f}_o2"
    db.collection("time_series").document(doc_id).set({
        "lat": lat,
        "lon": lon,
        "variable": "o2",
        "history": history,
        "last_updated": now.isoformat()
    })

# 3. Generate Marine Litter Density history & Drift Tracks
print("Writing Marine Litter history & tracks...")
for lat, lon, name in litter_coords:
    base_density = random.uniform(4.0, 6.0)
    history = []
    
    for d in reversed(range(7)):
        timestamp = (now - timedelta(days=d)).isoformat()
        val = base_density + random.uniform(-2.0, 3.0)
        val = max(0.5, min(val, 10.0))
        
        history.append({
            "timestamp": timestamp,
            "value": val
        })
        
        if d == 0:
            dashboard_metrics.append({
                "timestamp": timestamp,
                "lat": lat,
                "lon": lon,
                "variable": "litter_density",
                "value": val
            })
            
    doc_id = f"{lat:.4f}_{lon:.4f}_litter_density"
    db.collection("time_series").document(doc_id).set({
        "lat": lat,
        "lon": lon,
        "variable": "litter_density",
        "history": history,
        "last_updated": now.isoformat()
    })

    # Generate a 72-hour drift trajectory for d=0 (today)
    path = []
    curr_lat, curr_lon = lat, lon
    lat_offset, lon_offset = 0.0, 0.0
    if "珠江" in name:
        lat_offset, lon_offset = -0.015, -0.025
    elif "长江" in name:
        lat_offset, lon_offset = -0.005, 0.02
    else:  # Zhoushan
        lat_offset, lon_offset = -0.02, -0.01
        
    beached = False
    beached_step = -1
    
    for h in range(0, 73, 6):
        if beached:
            break
        curr_lat += lat_offset + random.uniform(-0.005, 0.005)
        curr_lon += lon_offset + random.uniform(-0.005, 0.005)
        
        path.append({
            "lat": float(f"{curr_lat:.4f}"),
            "lon": float(f"{curr_lon:.4f}"),
            "hours": h
        })
        
        if "舟山" in name and h == 42:
            beached = True
            beached_step = h
            
    dashboard_tracks.append({
        "timestamp": now.isoformat(),
        "lat": lat,
        "lon": lon,
        "path": path,
        "drift_factors": {
            "current": 0.55,
            "wave": 0.35,
            "wind": 0.10
        },
        "name": name
    })
    
    if beached:
        alert = {
            "timestamp": now.isoformat(),
            "type": "垃圾搁浅",
            "lat": curr_lat,
            "lon": curr_lon,
            "value": 1.0,
            "message": f"检测到海面漂流垃圾预计在 {beached_step} 小时后抵达沿岸敏感区（宁海沿海沙滩），请相关环卫单位做好拦截清扫准备。",
            "level": "WARNING",
            "nearby_cities": get_nearby_cities(curr_lat, curr_lon)
        }
        dashboard_alerts.append(alert)

# Save aggregated latest run dashboard document
print("Saving aggregated dashboard run data...")
dashboard_data = {
    "timestamp": now.isoformat(),
    "metrics": dashboard_metrics,
    "alerts": dashboard_alerts,
    "litter_tracks": dashboard_tracks,
    "enso_metrics": []  # Filled when analyze_enso runs, keep empty or fetch later
}

# Try to fetch existing ENSO records from enso_metrics to not wipe them out on dashboard
try:
    enso_snapshot = db.collection("enso_metrics").order_by("timestamp", direction="DESCENDING").limit(60).get()
    enso_records = []
    for doc in reversed(enso_snapshot):
        enso_records.append(doc.to_dict())
    dashboard_data["enso_metrics"] = enso_records
    print(f"Restored {len(enso_records)} historical ENSO metrics into the dashboard.")
except Exception as e:
    print(f"Could not restore ENSO metrics: {e}")

db.collection("latest_run").document("dashboard").set(dashboard_data)

print("Historical mock data generation completed successfully!")
