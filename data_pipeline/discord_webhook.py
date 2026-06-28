import os
import math
import requests
from dotenv import load_dotenv

load_dotenv()

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

# List of major coastal cities and population centers in the China coastal region
COASTAL_CITIES = [
    {"name": "上海", "lat": 31.2304, "lon": 121.4737},
    {"name": "广州", "lat": 22.8000, "lon": 113.6000},  # Nansha coast
    {"name": "深圳", "lat": 22.5431, "lon": 114.0579},
    {"name": "香港", "lat": 22.3193, "lon": 114.1694},
    {"name": "澳门", "lat": 22.1987, "lon": 113.5439},
    {"name": "珠海", "lat": 22.2707, "lon": 113.5767},
    {"name": "湛江", "lat": 21.2700, "lon": 110.4000},
    {"name": "北海", "lat": 21.4812, "lon": 109.1202},
    {"name": "海口", "lat": 20.0174, "lon": 110.3492},
    {"name": "三亚", "lat": 18.2528, "lon": 109.5121},
    {"name": "汕头", "lat": 23.3541, "lon": 116.6819},
    {"name": "厦门", "lat": 24.4798, "lon": 118.0894},
    {"name": "泉州", "lat": 24.8741, "lon": 118.6757},
    {"name": "漳州", "lat": 24.5130, "lon": 117.6470},
    {"name": "福州", "lat": 25.9694, "lon": 119.6000},  # Changle coast
    {"name": "温州", "lat": 27.9943, "lon": 120.6993},
    {"name": "台州", "lat": 28.6564, "lon": 121.4208},
    {"name": "宁波", "lat": 29.8683, "lon": 121.5440},
    {"name": "舟山", "lat": 29.9856, "lon": 122.2072},
    {"name": "嘉兴", "lat": 30.7453, "lon": 120.7555},
    {"name": "南通", "lat": 31.9802, "lon": 120.8943},
    {"name": "盐城", "lat": 33.3474, "lon": 120.1636},
    {"name": "连云港", "lat": 34.6005, "lon": 119.2201},
    {"name": "日照", "lat": 35.4163, "lon": 119.5268},
    {"name": "青岛", "lat": 36.0671, "lon": 120.3826},
    {"name": "威海", "lat": 37.5131, "lon": 122.1204},
    {"name": "烟台", "lat": 37.5362, "lon": 121.3913},
    {"name": "潍坊", "lat": 36.7079, "lon": 119.1003},
    {"name": "东营", "lat": 37.4618, "lon": 118.4981},
    {"name": "滨州", "lat": 37.3820, "lon": 118.0160},
    {"name": "沧州", "lat": 38.3044, "lon": 116.8388},
    {"name": "天津", "lat": 38.9833, "lon": 117.7500},  # Binhai New Area
    {"name": "唐山", "lat": 39.1500, "lon": 118.2000},
    {"name": "秦皇岛", "lat": 39.9354, "lon": 119.5888},
    {"name": "葫芦岛", "lat": 40.7110, "lon": 120.8369},
    {"name": "锦州", "lat": 41.0960, "lon": 121.1270},
    {"name": "盘锦", "lat": 41.1245, "lon": 122.0706},
    {"name": "营口", "lat": 40.6670, "lon": 122.2280},
    {"name": "大连", "lat": 38.9140, "lon": 121.6147},
    {"name": "丹东", "lat": 40.1205, "lon": 124.3831},
    {"name": "阳江", "lat": 21.8511, "lon": 111.9778},
    {"name": "茂名", "lat": 21.6630, "lon": 110.9190},
    {"name": "防城港", "lat": 21.6139, "lon": 108.3542},
    {"name": "钦州", "lat": 21.9733, "lon": 108.6241},
    {"name": "台北", "lat": 25.0330, "lon": 121.5654},
    {"name": "高雄", "lat": 22.6273, "lon": 120.3014},
    {"name": "基隆", "lat": 25.1283, "lon": 121.7391},
    {"name": "台中", "lat": 24.1477, "lon": 120.6736},
    {"name": "新竹", "lat": 24.8138, "lon": 120.9675},
    {"name": "花莲", "lat": 23.9872, "lon": 121.6016},
]

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points
    on the Earth in kilometers.
    """
    R = 6371.0  # Earth's radius in km
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    
    return R * c

def get_nearby_cities(lat, lon, max_distance=100.0):
    """
    Finds all major coastal cities within max_distance (km) from (lat, lon).
    Returns a formatted string listing them and their distances, sorted by distance.
    """
    # If the alert is a climate warning or coordinates are not applicable
    # Nino region coordinates (lat 0.0, lon -145.0) or default/empty
    if lat is None or lon is None or (lat == 0.0 and abs(lon + 145.0) < 1.0):
        return "不适用"
        
    # Check if coords are generally empty/zero
    if lat == 0.0 and lon == 0.0:
        return "不适用"

    nearby = []
    for city in COASTAL_CITIES:
        dist = haversine_distance(lat, lon, city["lat"], city["lon"])
        if dist <= max_distance:
            nearby.append((city["name"], dist))
            
    if not nearby:
        return "周边100公里内无主要城市/人口密集区"
        
    nearby.sort(key=lambda x: x[1])
    return ", ".join([f"{name} (约{dist:.1f}公里)" for name, dist in nearby])

def send_discord_alert(alert_data):
    if not DISCORD_WEBHOOK_URL:
        return

    # alert_data: type, lat, lon, value, message, level
    color = 16711680 if alert_data.get("level") == "CRITICAL" else 16753920
    
    lat = alert_data.get("lat")
    lon = alert_data.get("lon")
    nearby_cities_str = get_nearby_cities(lat, lon)
    
    embed = {
        "title": f"🚨 {alert_data.get('type').replace('_', ' ')} 警报",
        "description": alert_data.get('message'),
        "color": color,
        "fields": [
            {"name": "纬度 (Lat)", "value": f"{lat:.4f}" if lat is not None else "无", "inline": True},
            {"name": "经度 (Lon)", "value": f"{lon:.4f}" if lon is not None else "无", "inline": True},
            {"name": "监测值", "value": f"{alert_data.get('value'):.2f}" if alert_data.get('value') is not None else "无", "inline": True},
            {"name": "风险级别", "value": "严重" if alert_data.get("level") == "CRITICAL" else "警告", "inline": True},
            {"name": "临近城市/密集区 (100km内)", "value": nearby_cities_str, "inline": False}
        ]
    }
    
    payload = {
        "username": "CMEMS 生态雷达",
        "embeds": [embed]
    }
    
    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=payload)
        response.raise_for_status()
        print("Discord alert sent successfully.")
    except Exception as e:
        print(f"Failed to send Discord alert: {e}")
