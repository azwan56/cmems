import os
import requests
from dotenv import load_dotenv

load_dotenv()

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

def send_discord_alert(alert_data):
    if not DISCORD_WEBHOOK_URL:
        return

    # alert_data: type, lat, lon, value, message, level
    color = 16711680 if alert_data.get("level") == "CRITICAL" else 16753920
    
    embed = {
        "title": f"🚨 {alert_data.get('type').replace('_', ' ')} 警报",
        "description": alert_data.get('message'),
        "color": color,
        "fields": [
            {"name": "纬度 (Lat)", "value": f"{alert_data.get('lat'):.4f}", "inline": True},
            {"name": "经度 (Lon)", "value": f"{alert_data.get('lon'):.4f}", "inline": True},
            {"name": "监测值", "value": f"{alert_data.get('value'):.2f}", "inline": True},
            {"name": "风险级别", "value": "严重" if alert_data.get("level") == "CRITICAL" else "警告", "inline": True}
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
