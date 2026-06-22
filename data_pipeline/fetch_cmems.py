import os
import copernicusmarine
from dotenv import load_dotenv
import xarray as xr
from datetime import datetime, timedelta

load_dotenv()

USERNAME = os.getenv("CMEMS_USERNAME")
PASSWORD = os.getenv("CMEMS_PASSWORD")

# Bounding box for China Coastal Regions (approx: Bohai to South China Sea)
LON_MIN, LON_MAX = 105.0, 130.0
LAT_MIN, LAT_MAX = 15.0, 42.0

def fetch_bgc_data(output_dir="data"):
    """
    Fetches Biogeochemistry data: Chlorophyll (PFT) and Oxygen (BIO)
    """
    os.makedirs(output_dir, exist_ok=True)
    
    end_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    start_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")

    # 1. Fetch Chlorophyll (chl) from PFT dataset
    pft_dataset_id = "cmems_mod_glo_bgc-pft_anfc_0.25deg_P1D-m"
    pft_out_file = os.path.join(output_dir, "bgc_pft_data.nc")
    print(f"Fetching BGC Chlorophyll data for {pft_dataset_id}...")
    try:
        copernicusmarine.subset(
            dataset_id=pft_dataset_id,
            variables=["chl"],
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime=start_date,
            end_datetime=end_date,
            minimum_depth=0.0,
            maximum_depth=5.0, # Chlorophyll is surface-focused
            output_filename=pft_out_file,
            username=USERNAME,
            password=PASSWORD,
            force_download=True
        )
        print("BGC Chlorophyll data fetched successfully.")
    except Exception as e:
        print(f"Error fetching BGC Chlorophyll data: {e}")
        pft_out_file = None

    # 2. Fetch Dissolved Oxygen (o2) from BIO dataset
    bio_dataset_id = "cmems_mod_glo_bgc-bio_anfc_0.25deg_P1D-m"
    bio_out_file = os.path.join(output_dir, "bgc_bio_data.nc")
    print(f"Fetching BGC Oxygen data for {bio_dataset_id}...")
    try:
        copernicusmarine.subset(
            dataset_id=bio_dataset_id,
            variables=["o2"],
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime=start_date,
            end_datetime=end_date,
            minimum_depth=0.0,
            maximum_depth=20.0, # Oxygen bottom layer <=20m
            output_filename=bio_out_file,
            username=USERNAME,
            password=PASSWORD,
            force_download=True
        )
        print("BGC Oxygen data fetched successfully.")
    except Exception as e:
        print(f"Error fetching BGC Oxygen data: {e}")
        bio_out_file = None

    return pft_out_file, bio_out_file

def fetch_phy_data(output_dir="data"):
    """
    Fetches Physical data (SST - Sea Surface Temperature)
    Dataset: cmems_mod_glo_phy_anfc_0.083deg_P1D-m
    Variables: thetao (Temperature)
    """
    os.makedirs(output_dir, exist_ok=True)
    dataset_id = "cmems_mod_glo_phy-thetao_anfc_0.083deg_P1D-m"
    
    end_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    start_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")

    out_file = os.path.join(output_dir, "phy_data.nc")
    
    print(f"Fetching PHY data for {dataset_id}...")
    try:
        copernicusmarine.subset(
            dataset_id=dataset_id,
            variables=["thetao"],
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime=start_date,
            end_datetime=end_date,
            minimum_depth=0.0,
            maximum_depth=1.0, # Only need surface for SST
            output_filename=out_file,
            username=USERNAME,
            password=PASSWORD,
            force_download=True
        )
        print("PHY data fetched successfully.")
        return out_file
    except Exception as e:
        print(f"Error fetching PHY data: {e}")
        return None

def fetch_cur_and_wav_data(output_dir="data"):
    """
    Fetches Physical currents (uo, vo) and wave parameters (VSDX, VSDY, VHM0)
    """
    os.makedirs(output_dir, exist_ok=True)
    
    end_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    start_date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
    
    # 1. Currents (uo, vo)
    cur_dataset_id = "cmems_mod_glo_phy-cur_anfc_0.083deg_P1D-m"
    cur_out_file = os.path.join(output_dir, "phy_cur_data.nc")
    print(f"Fetching currents data for {cur_dataset_id}...")
    try:
        copernicusmarine.subset(
            dataset_id=cur_dataset_id,
            variables=["uo", "vo"],
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime=start_date,
            end_datetime=end_date,
            minimum_depth=0.0,
            maximum_depth=1.0,
            output_filename=cur_out_file,
            username=USERNAME,
            password=PASSWORD,
            force_download=True
        )
        print("Currents data fetched successfully.")
    except Exception as e:
        print(f"Error fetching currents data: {e}")
        cur_out_file = None

    # 2. Waves (VSDX, VSDY, VHM0)
    wav_dataset_id = "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i"
    wav_out_file = os.path.join(output_dir, "wav_data.nc")
    print(f"Fetching waves data for {wav_dataset_id}...")
    try:
        copernicusmarine.subset(
            dataset_id=wav_dataset_id,
            variables=["VSDX", "VSDY", "VHM0"],
            minimum_longitude=LON_MIN,
            maximum_longitude=LON_MAX,
            minimum_latitude=LAT_MIN,
            maximum_latitude=LAT_MAX,
            start_datetime=start_date,
            end_datetime=end_date,
            output_filename=wav_out_file,
            username=USERNAME,
            password=PASSWORD,
            force_download=True
        )
        print("Waves data fetched successfully.")
    except Exception as e:
        print(f"Error fetching waves data: {e}")
        wav_out_file = None

    return cur_out_file, wav_out_file

def fetch_enso_data(output_dir="data/enso"):
    """
    Fetches ENSO OMI data (Niño 3.4 SST anomaly)
    """
    os.makedirs(output_dir, exist_ok=True)
    dataset_id = "global_omi_climate-variability_nino34_sst_anom"
    print(f"Fetching ENSO OMI data for {dataset_id}...")
    try:
        copernicusmarine.get(
            dataset_id=dataset_id,
            output_directory=output_dir,
            username=USERNAME,
            password=PASSWORD,
            force_download=True
        )
        print("ENSO OMI data fetched successfully.")
        return True
    except Exception as e:
        print(f"Error fetching ENSO OMI data: {e}")
        return False

if __name__ == "__main__":
    fetch_bgc_data()
    fetch_phy_data()
    fetch_cur_and_wav_data()
    fetch_enso_data()

