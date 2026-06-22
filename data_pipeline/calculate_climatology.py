import os
import json
import copernicusmarine
from dotenv import load_dotenv
import xarray as xr
import numpy as np

load_dotenv()

USERNAME = os.getenv("CMEMS_USERNAME")
PASSWORD = os.getenv("CMEMS_PASSWORD")

# Bounding box for Niño 3.4
LON_MIN, LON_MAX = -170.0, -120.0
LAT_MIN, LAT_MAX = -5.0, 5.0
dataset_id = "cmems_mod_glo_phy_my_0.083deg_P1M-m"
output_dir = "data"
os.makedirs(output_dir, exist_ok=True)
nc_path = os.path.join(output_dir, "nino34_climatology_raw.nc")

def download_historical_data():
    print(f"Downloading historical monthly SST data (1991-2020) from {dataset_id}...")
    # 1991 to 2020 represents the standard 30-year climatology period
    copernicusmarine.subset(
        dataset_id=dataset_id,
        variables=["thetao"],
        minimum_longitude=LON_MIN,
        maximum_longitude=LON_MAX,
        minimum_latitude=LAT_MIN,
        maximum_latitude=LAT_MAX,
        start_datetime="1991-01-01 00:00:00",
        end_datetime="2020-12-31 23:59:59",
        minimum_depth=0.0,
        maximum_depth=1.0,
        output_filename=nc_path,
        username=USERNAME,
        password=PASSWORD
    )
    print("Download completed successfully!")

def compute_climatology():
    print(f"Opening dataset {nc_path} to calculate climatological monthly averages...")
    ds = xr.open_dataset(nc_path, engine="h5netcdf")
    
    # 1. Slice surface layer (depth=0)
    thetao = ds['thetao'].isel(depth=0)
    
    # 2. Compute spatial mean over latitude and longitude for each time step
    # Note: Cosine latitude weighting can be applied for exactness:
    weights = np.cos(np.radians(ds['latitude']))
    weights.name = "weights"
    thetao_weighted = thetao.weighted(weights)
    sst_spatial_mean = thetao_weighted.mean(dim=["latitude", "longitude"])
    
    # 3. Group by month of year (1-12) and compute mean
    climatology = sst_spatial_mean.groupby("time.month").mean(dim="time")
    
    # Convert to standard Python float list
    month_baselines = {int(month): float(val) for month, val in zip(climatology.month.values, climatology.values)}
    
    # Save to JSON
    json_path = os.path.join(output_dir, "enso_climatology.json")
    with open(json_path, "w") as f:
        json.dump(month_baselines, f, indent=2)
        
    print(f"Climatology calculated and saved to {json_path}")
    print("Baseline values:")
    for month, val in sorted(month_baselines.items()):
        print(f"  Month {month:02d}: {val:.4f} °C")
        
    ds.close()

if __name__ == "__main__":
    if not os.path.exists(nc_path):
        download_historical_data()
    else:
        print(f"Found existing raw file {nc_path}, skipping download.")
    compute_climatology()
