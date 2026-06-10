"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Map controller to handle pan/fly actions when an alert is selected
function MapController({ selectedAlert }: { selectedAlert: any }) {
  const map = useMap();
  useEffect(() => {
    if (selectedAlert) {
      map.flyTo([selectedAlert.lat, selectedAlert.lon], 7, {
        animate: true,
        duration: 1.2
      });
    }
  }, [selectedAlert, map]);
  return null;
}

export default function Map({ 
  metrics, 
  alerts, 
  selectedAlert, 
  onSelectAlert,
  selectedPoint,
  onSelectPoint
}: { 
  metrics: any[], 
  alerts: any[], 
  selectedAlert: any, 
  onSelectAlert: (alert: any) => void,
  selectedPoint: any,
  onSelectPoint: (point: any) => void
}) {
  // Center of East China Sea
  const center: [number, number] = [28.0, 122.0];

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <MapController selectedAlert={selectedAlert} />
      
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="🌐 极光高对比 (Voyager)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="🛰️ 卫星影像 (Satellite)">
          <TileLayer
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="🌑 极光深色 (Dark)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="🗺️ 标准地图 (Standard)">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      
      {/* Render Metrics */}
      {metrics.map((m) => {
        const isChl = m.variable === 'chl';
        return (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lon]}
            radius={isChl ? Math.min(m.value * 2, 20) : 10}
            pathOptions={{ 
              fillColor: isChl ? '#10b981' : '#3b82f6', 
              color: isChl ? '#059669' : '#2563eb',
              fillOpacity: 0.5,
              weight: 1
            }}
            eventHandlers={{
              click: () => {
                onSelectPoint({
                  lat: m.lat,
                  lon: m.lon,
                  variable: m.variable,
                  name: m.variable === 'chl' ? '叶绿素a浓度' : '底层溶解氧'
                });
              }
            }}
          >
            <Popup eventHandlers={{
              remove: () => onSelectPoint(null)
            }}>
              <div className="text-sm text-slate-900">
                <strong>{isChl ? '叶绿素a浓度' : '底层溶解氧'}</strong><br/>
                测量值: {m.value.toFixed(2)} {isChl ? 'mg/m³' : 'mmol/m³'}<br/>
                纬度: {m.lat.toFixed(4)}, 经度: {m.lon.toFixed(4)}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Render Alerts */}
      {alerts.map((a) => {
        const isCritical = a.level === 'CRITICAL';
        const isSelected = selectedAlert && selectedAlert.id === a.id;
        return (
          <CircleMarker
            key={a.id}
            center={[a.lat, a.lon]}
            radius={isSelected ? 18 : 12}
            pathOptions={{ 
              fillColor: isCritical ? '#ef4444' : '#f59e0b', 
              color: isSelected ? '#14b8a6' : (isCritical ? '#b91c1c' : '#d97706'),
              fillOpacity: isSelected ? 0.9 : 0.7,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => {
                onSelectAlert(a);
                onSelectPoint({
                  lat: a.lat,
                  lon: a.lon,
                  variable: a.type === '赤潮预警' ? 'chl' : 'o2',
                  name: a.type
                });
              }
            }}
          >
            <Popup eventHandlers={{
              remove: () => {
                onSelectAlert(null);
                onSelectPoint(null);
              }
            }}>
              <div className="text-sm text-slate-900">
                <strong className={isCritical ? "text-red-600 font-bold" : "text-yellow-600 font-bold"}>
                  🚨 {a.type} [{a.level === 'CRITICAL' ? '严重' : '警告'}]
                </strong><br/>
                {a.message}<br/>
                时间: {new Date(a.timestamp).toLocaleString()}<br/>
                纬度: {a.lat.toFixed(4)}, 经度: {a.lon.toFixed(4)}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Special Highlight & Auto Popup for Selected Alert */}
      {selectedAlert && (
        <>
          {/* Pulsing Sweep Ring */}
          <CircleMarker
            center={[selectedAlert.lat, selectedAlert.lon]}
            radius={28}
            pathOptions={{
              fillColor: 'transparent',
              color: '#14b8a6',
              weight: 2,
              className: 'radar-sweep-path'
            }}
          />
          {/* Glowing Center ring */}
          <CircleMarker
            center={[selectedAlert.lat, selectedAlert.lon]}
            radius={20}
            pathOptions={{
              fillColor: 'transparent',
              color: '#14b8a6',
              weight: 2,
              className: 'marker-pulse-glow'
            }}
          />
          <Popup 
            position={[selectedAlert.lat, selectedAlert.lon]} 
            eventHandlers={{
              remove: () => {
                onSelectAlert(null);
                onSelectPoint(null);
              }
            }}
          >
            <div className="text-sm text-slate-900 font-sans p-1 min-w-[200px]">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedAlert.level === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {selectedAlert.type} [{selectedAlert.level === 'CRITICAL' ? '严重' : '警告'}]
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(selectedAlert.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="font-semibold text-slate-850 mt-1">{selectedAlert.message}</p>
              <div className="text-[10px] text-slate-400 mt-2 border-t pt-1 flex justify-between font-mono">
                <span>纬度: {selectedAlert.lat.toFixed(4)}</span>
                <span>经度: {selectedAlert.lon.toFixed(4)}</span>
              </div>
            </div>
          </Popup>
        </>
      )}
    </MapContainer>
  );
}
