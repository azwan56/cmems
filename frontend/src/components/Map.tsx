import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { dictionary, translateAlertMsg, translateAlertType, type Language, type DictionaryKey } from '@/lib/translations';

interface AlertData {
  id: string;
  lat: number;
  lon: number;
  type: string;
  level: string;
  message: string;
  timestamp: string;
}

interface MetricData {
  id: string;
  lat: number;
  lon: number;
  variable: string;
  value: number;
}

interface PointData {
  lat: number;
  lon: number;
  variable: string;
  name: string;
}

// Map controller to handle pan/fly actions when an alert is selected
function MapController({ selectedAlert }: { selectedAlert: AlertData | null }) {
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
  onSelectPoint,
  lang
}: { 
  metrics: MetricData[], 
  alerts: AlertData[], 
  selectedAlert: AlertData | null, 
  onSelectAlert: (alert: AlertData | null) => void,
  selectedPoint: PointData | null,
  onSelectPoint: (point: PointData | null) => void,
  lang: Language
}) {
  // Center of East China Sea
  const center: [number, number] = [28.0, 122.0];

  const t = (key: DictionaryKey): string => {
    return (dictionary[lang][key] as string) || key;
  };

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <MapController selectedAlert={selectedAlert} />
      
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name={dictionary[lang].mapLayers.voyager}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name={dictionary[lang].mapLayers.satellite}>
          <TileLayer
            attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name={dictionary[lang].mapLayers.dark}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name={dictionary[lang].mapLayers.standard}>
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
                  name: m.variable === 'chl' ? t('chlorophyllConc') : t('bottomO2')
                });
              }
            }}
          >
            <Popup eventHandlers={{
              remove: () => onSelectPoint(null)
            }}>
              <div className="text-sm text-slate-900">
                <strong>{isChl ? t('chlorophyllConc') : t('bottomO2')}</strong><br/>
                {t('value')}: {m.value.toFixed(2)} {isChl ? t('unitChl') : t('unitO2')}<br/>
                {t('latitude')}: {m.lat.toFixed(4)}, {t('longitude')}: {m.lon.toFixed(4)}
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
                  🚨 {translateAlertType(a.type, lang)} [{a.level === 'CRITICAL' ? t('critical') : t('warning')}]
                </strong><br/>
                {translateAlertMsg(a.message, lang)}<br/>
                {t('time')}: {new Date(a.timestamp).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}<br/>
                {t('latitude')}: {a.lat.toFixed(4)}, {t('longitude')}: {a.lon.toFixed(4)}
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
                  {translateAlertType(selectedAlert.type, lang)} [{selectedAlert.level === 'CRITICAL' ? t('critical') : t('warning')}]
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(selectedAlert.timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                </span>
              </div>
              <p className="font-semibold text-slate-850 mt-1">{translateAlertMsg(selectedAlert.message, lang)}</p>
              <div className="text-[10px] text-slate-400 mt-2 border-t pt-1 flex justify-between font-mono">
                <span>{t('latitude')}: {selectedAlert.lat.toFixed(4)}</span>
                <span>{t('longitude')}: {selectedAlert.lon.toFixed(4)}</span>
              </div>
            </div>
          </Popup>
        </>
      )}
    </MapContainer>
  );
}
