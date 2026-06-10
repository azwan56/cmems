import xarray as xr
import numpy as np
from global_land_mask import globe

ds = xr.open_dataset('data/bgc_bio_data.nc', engine='h5netcdf')
o2 = ds['o2'].isel(time=0, depth=-1)
o2_vals = o2.values

print('Min overall o2:', np.nanmin(o2_vals))

lats, lons = np.where(~np.isnan(o2_vals))
min_sea_o2 = 9999
min_lat = 0
min_lon = 0

for i in range(len(lats)):
    lat = float(o2.latitude[lats[i]])
    lon = float(o2.longitude[lons[i]])
    val = float(o2_vals[lats[i], lons[i]])
    if not globe.is_land(lat, lon):
        if val < min_sea_o2:
            min_sea_o2 = val
            min_lat = lat
            min_lon = lon

print(f'Min sea o2: {min_sea_o2} at ({min_lat}, {min_lon})')
