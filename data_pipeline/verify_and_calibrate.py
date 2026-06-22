import os
import json
import urllib.request
import ssl
import xarray as xr
import numpy as np
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# Coordinates for Niño 3.4
LON_MIN, LON_MAX = -170.0, -120.0
LAT_MIN, LAT_MAX = -5.0, 5.0

# Paths
climatology_json = "data/enso_climatology.json"
nc_historical = "data/nino34_climatology_raw.nc"
nc_recent = "data/nino34_recent_raw.nc"
calibration_json = "data/enso_calibration.json"

USERNAME = os.getenv("CMEMS_USERNAME")
PASSWORD = os.getenv("CMEMS_PASSWORD")

def download_recent_data():
    # Download 2021-2025 data to expand our verification time-series
    dataset_id = "cmems_mod_glo_phy_my_0.083deg_P1M-m"
    print(f"Downloading monthly SST for 2021-2025 from {dataset_id}...")
    try:
        import copernicusmarine
        copernicusmarine.subset(
            dataset_id=dataset_id,
            variables=["thetao"],
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime="2021-01-01 00:00:00",
            end_datetime="2025-12-31 23:59:59",
            minimum_depth=0.0,
            maximum_depth=1.0,
            output_filename=nc_recent,
            username=USERNAME,
            password=PASSWORD
        )
        print("Recent data downloaded successfully.")
        return True
    except Exception as e:
        print(f"Error downloading recent data: {e}")
        return False

def fetch_noaa_oni():
    url = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
    print(f"Fetching NOAA ONI from {url}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context) as response:
            content = response.read().decode('utf-8')
        
        # Parse official index
        lines = content.strip().split('\n')
        records = []
        for line in lines[1:]: # Skip header
            parts = line.split()
            if len(parts) >= 4:
                # Format: SEAS YR TOTAL ANOM
                seas = parts[0]
                yr = int(parts[1])
                anom = float(parts[3])
                
                # Map SEAS to month (approx center month of the 3-month season)
                # SEAS maps: DJF=1, JFM=2, FMA=3, MAM=4, AMJ=5, MJJ=6, JJA=7, JAS=8, ASO=9, OND=10, NDJ=11, DJF_next=12
                # Note: NOAA ONI seasons are represented by center month of the rolling average:
                # DJF is Dec-Jan-Feb, centered on Jan (Month 1)
                # JFM is Jan-Feb-Mar, centered on Feb (Month 2)
                # FMA is Feb-Mar-Apr, centered on Mar (Month 3)
                # ...
                # NDJ is Nov-Dec-Jan, centered on Dec (Month 12)
                seas_to_month = {
                    "DJF": 1, "JFM": 2, "FMA": 3, "MAM": 4,
                    "AMJ": 5, "MJJ": 6, "JJA": 7, "JAS": 8,
                    "ASO": 9, "OCT": 10, "OND": 11, "NDJ": 12
                }
                # Fallback for OCT/OND/etc. NOAA sometimes uses OCT/NDJ
                # Let's map dynamically:
                if seas in seas_to_month:
                    records.append({"year": yr, "month": seas_to_month[seas], "noaa_oni": anom})
                    
        return pd.DataFrame(records)
    except Exception as e:
        print(f"Error fetching NOAA ONI: {e}")
        return None

def verify_and_calibrate():
    if not os.path.exists(nc_recent):
        download_recent_data()
        
    with open(climatology_json, "r") as f:
        climatology = {int(k): v for k, v in json.load(f).items()}
        
    # Open NetCDF files
    print("Loading netcdf files...")
    ds_hist = xr.open_dataset(nc_historical, engine="h5netcdf")
    
    # Check if recent file exists, otherwise just use historical
    if os.path.exists(nc_recent):
        ds_rec = xr.open_dataset(nc_recent, engine="h5netcdf")
        ds = xr.concat([ds_hist, ds_rec], dim="time")
    else:
        ds = ds_hist
        
    # Compute spatial mean
    thetao = ds['thetao'].isel(depth=0)
    weights = np.cos(np.radians(ds['latitude']))
    weights.name = "weights"
    thetao_weighted = thetao.weighted(weights)
    sst_spatial = thetao_weighted.mean(dim=["latitude", "longitude"])
    
    times = sst_spatial.time.values
    sst_values = sst_spatial.values
    
    # Calculate anomalies and rolling average (ONI)
    anomalies = []
    records = []
    
    for t, sst in zip(times, sst_values):
        dt = pd.to_datetime(t)
        month = dt.month
        year = dt.year
        
        # Anomaly relative to climatology
        base = climatology[month]
        anom = float(sst - base)
        anomalies.append(anom)
        
        # Calculate 3-month running mean
        # ONI is defined as the 3-month running mean of SSTA
        if len(anomalies) >= 3:
            oni = float(np.mean(anomalies[-3:]))
        else:
            oni = anom # Fallback for first 2 months
            
        records.append({
            "year": year,
            "month": month,
            "sst": float(sst),
            "our_oni_raw": oni
        })
        
    df_our = pd.DataFrame(records)
    df_noaa = fetch_noaa_oni()
    
    if df_noaa is None or df_our.empty:
        print("Verification failed: missing data.")
        return
        
    # Merge and align
    df_compare = pd.merge(df_our, df_noaa, on=["year", "month"])
    
    # Calculate Mean Bias Error (NOAA - OUR_RAW)
    # The bias will be added to our calculated SST/ONI to align with NOAA
    mean_bias = float(np.mean(df_compare['noaa_oni'] - df_compare['our_oni_raw']))
    
    # Apply calibration
    df_compare['our_oni_calibrated'] = df_compare['our_oni_raw'] + mean_bias
    
    # Calculate metrics
    # 1. Raw comparison
    raw_rmse = np.sqrt(np.mean((df_compare['noaa_oni'] - df_compare['our_oni_raw'])**2))
    raw_r2 = float(df_compare['noaa_oni'].corr(df_compare['our_oni_raw']) ** 2)
    
    # 2. Calibrated comparison
    cal_rmse = np.sqrt(np.mean((df_compare['noaa_oni'] - df_compare['our_oni_calibrated'])**2))
    cal_r2 = float(df_compare['noaa_oni'].corr(df_compare['our_oni_calibrated']) ** 2)
    
    print("\n==================================================")
    print("              ENSO VALIDATION REPORT              ")
    print("==================================================")
    print(f"Data period: {df_compare['year'].min()}-{df_compare['month'].min():02d} to {df_compare['year'].max()}-{df_compare['month'].max():02d}")
    print(f"Total months matched: {len(df_compare)}")
    print(f"Computed Systematic Bias (NOAA - CMEMS): {mean_bias:.4f} °C")
    print("\nMetrics BEFORE Calibration:")
    print(f"  RMSE: {raw_rmse:.4f} °C")
    print(f"  R² Correlation: {raw_r2:.6f}")
    print("\nMetrics AFTER Calibration:")
    print(f"  RMSE: {cal_rmse:.4f} °C")
    print(f"  R² Correlation: {cal_r2:.6f}")
    print("==================================================")
    
    # Save calibration factor
    cal_data = {
        "mean_bias": mean_bias,
        "calibration_date": pd.Timestamp.now().isoformat(),
        "rmse_after_calibration": cal_rmse,
        "r2_after_calibration": cal_r2
    }
    with open(calibration_json, "w") as f:
        json.dump(cal_data, f, indent=2)
    print(f"Saved calibration factors to {calibration_json}")
    
    # Close datasets
    ds_hist.close()
    if os.path.exists(nc_recent):
        ds_rec.close()

if __name__ == "__main__":
    verify_and_calibrate()
