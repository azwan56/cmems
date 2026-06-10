import xarray as xr
import numpy as np
from datetime import datetime
from firebase_uploader import upload_alert, upload_metrics
import math
from global_land_mask import globe

def is_on_or_near_land(lat, lon, max_dist=0.04):
    """
    Check if a point is on land, or very close to land (which indicates a river estuary,
    narrow river channel, or coastal mudflat where a marker would overlap with land).
    max_dist=0.04 degrees is approx 4.4 km.
    """
    if globe.is_land(lat, lon):
        return True
    
    # Check cardinal directions at step intervals
    steps = [0.01, 0.02, max_dist]
    for step in steps:
        if (globe.is_land(lat + step, lon) or 
            globe.is_land(lat - step, lon) or 
            globe.is_land(lat, lon + step) or 
            globe.is_land(lat, lon - step)):
            return True
            
    return False

def analyze_and_upload():
    print("Loading datasets...")
    try:
        ds_pft = xr.open_dataset("data/bgc_pft_data.nc", engine="h5netcdf")
        ds_bio = xr.open_dataset("data/bgc_bio_data.nc", engine="h5netcdf")
        ds_phy = xr.open_dataset("data/phy_data.nc", engine="h5netcdf")
    except FileNotFoundError:
        print("Data files not found. Run fetch_cmems.py first.")
        return

    metrics_to_upload = []
    
    print("Analyzing Chlorophyll for Algae Bloom...")
    # Extract surface Chlorophyll
    chl = ds_pft['chl'].isel(time=0, depth=0)
    
    # We find coordinates where chl > 3.0 (mg/m3) as potential risk areas
    # Use numpy values to avoid xarray issues
    chl_vals = chl.values
    high_chl_mask = (chl_vals > 3.0) & (~np.isnan(chl_vals))
    
    lat_idx, lon_idx = np.where(high_chl_mask)
    
    # Filter points using global-land-mask and limit to 50 sea points
    for i in range(len(lat_idx)):
        lat = float(chl.latitude[lat_idx[i]])
        lon = float(chl.longitude[lon_idx[i]])
        
        # Skip land/near-land points (river estuaries center coordinates that drift onto land)
        if is_on_or_near_land(lat, lon):
            continue
            
        val = float(chl_vals[lat_idx[i], lon_idx[i]])
        
        metrics_to_upload.append({
            "timestamp": datetime.utcnow().isoformat(),
            "lat": lat,
            "lon": lon,
            "variable": "chl",
            "value": val
        })
        
        # Warn if chlorophyll is high (> 5.0 mg/m3 in the sea)
        if val > 5.0:
            upload_alert({
                "timestamp": datetime.utcnow().isoformat(),
                "type": "赤潮预警",
                "lat": lat,
                "lon": lon,
                "value": val,
                "message": f"检测到海域叶绿素a浓度偏高 ({val:.2f} mg/m³)，存在赤潮爆发风险。",
                "level": "WARNING"
            })
            
        if len(metrics_to_upload) >= 50:
            break

    print("Analyzing Dissolved Oxygen for Deoxygenation...")
    # Extract bottom layer Dissolved Oxygen (deepest layer in our subset <=20m)
    o2 = ds_bio['o2'].isel(time=0, depth=-1) 
    o2_vals = o2.values
    
    # Typical threshold: < 120 mmol/m3 is low (warning), < 62.5 mmol/m3 is critical (hypoxia)
    low_o2_mask = (o2_vals < 120.0) & (~np.isnan(o2_vals))
    
    lat_idx, lon_idx = np.where(low_o2_mask)
    
    uploaded_alerts_count = 0
    for i in range(len(lat_idx)):
        lat = float(o2.latitude[lat_idx[i]])
        lon = float(o2.longitude[lon_idx[i]])
        
        # Skip land/near-land points
        if is_on_or_near_land(lat, lon):
            continue
            
        val = float(o2_vals[lat_idx[i], lon_idx[i]])
        
        metrics_to_upload.append({
            "timestamp": datetime.utcnow().isoformat(),
            "lat": lat,
            "lon": lon,
            "variable": "o2",
            "value": val
        })
        
        # Alert if dissolved oxygen is low
        if val < 62.5:
            upload_alert({
                "timestamp": datetime.utcnow().isoformat(),
                "type": "水体缺氧",
                "lat": lat,
                "lon": lon,
                "value": val,
                "message": f"检测到近海底层水体严重缺氧 ({val:.2f} mmol/m³)，低于生物窒息阈值，存在重度缺氧致死风险。",
                "level": "CRITICAL"
            })
            uploaded_alerts_count += 1
        elif val < 120.0:
            upload_alert({
                "timestamp": datetime.utcnow().isoformat(),
                "type": "水体缺氧",
                "lat": lat,
                "lon": lon,
                "value": val,
                "message": f"检测到近海底层溶解氧偏低 ({val:.2f} mmol/m³)，可能导致底栖生物缺氧窒息风险。",
                "level": "WARNING"
            })
            uploaded_alerts_count += 1
            
        if uploaded_alerts_count >= 50:
            break
            
    if metrics_to_upload:
        upload_metrics(metrics_to_upload)
    
    print("Analysis and upload complete.")

if __name__ == "__main__":
    analyze_and_upload()
