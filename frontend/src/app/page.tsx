"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dictionary, translateAlertMsg, translateAlertType, type Language, type DictionaryKey } from '@/lib/translations';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full w-full bg-gray-900 text-white font-mono animate-pulse">Initializing CMEMS Radar / 正在初始化生态雷达...</div>
});

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

interface HistoryEntry {
  timestamp: string;
  value: number;
}

export default function Home() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<PointData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('cmems-lang') as Language;
      if (savedLang === 'zh' || savedLang === 'en') {
        return savedLang;
      }
    }
    return 'zh';
  });

  // Update HTML element attributes on language change
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = lang === 'zh'
      ? "CMEMS 生态雷达 - 中国沿海海洋生态预警系统 - 演示版"
      : "CMEMS Eco Radar - China Coastal Marine Ecological Warning System - Demo";
  }, [lang]);

  const t = (key: DictionaryKey): string => {
    return (dictionary[lang][key] as string) || key;
  };

  const handleLangToggle = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('cmems-lang', newLang);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [alertsRes, metricsRes] = await Promise.all([
          fetch('/api/alerts'),
          fetch('/api/metrics')
        ]);
        
        const alertsData = await alertsRes.json();
        const metricsData = await metricsRes.json();
        
        if (alertsData.alerts) setAlerts(alertsData.alerts);
        if (metricsData.metrics) setMetrics(metricsData.metrics);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    
    // Poll every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch history when selectedPoint changes
  useEffect(() => {
    if (!selectedPoint) {
      return;
    }

    const point = selectedPoint; // Capture for closure type narrowing
    let cancelled = false;

    async function fetchHistory() {
      setLoadingHistory(true);
      setHistoryData([]); // Clear previous data before fetching
      try {
        const res = await fetch(`/api/history?lat=${point.lat}&lon=${point.lon}&variable=${point.variable}`);
        const data = await res.json();
        if (!cancelled && data.history) {
          setHistoryData(data.history);
        }
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }
    }

    fetchHistory();

    return () => { cancelled = true; };
  }, [selectedPoint]);

  // Deduplicate and group history by date using useMemo to avoid recalculation
  const chartData = useMemo(() => {
    const chartDataObj: Record<string, number> = {};
    historyData.forEach(h => {
      const dateStr = new Date(h.timestamp).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric' });
      chartDataObj[dateStr] = parseFloat(h.value.toFixed(2));
    });
    return Object.entries(chartDataObj).map(([date, value]) => ({ date, value }));
  }, [historyData, lang]);


  return (
    <div className="flex h-screen bg-gray-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-teal-400 via-blue-400 to-indigo-500">
              {t('title')}
            </h1>
            
            {/* Sliding Pill Language Switcher & About Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center bg-gray-950/60 backdrop-blur-sm p-0.5 rounded-full border border-gray-800/80 shadow-inner w-[84px] h-[26px]">
                {/* Sliding background */}
                <div 
                  className={`absolute top-0.5 bottom-0.5 w-[38px] bg-gradient-to-r from-teal-500/80 to-blue-500/80 rounded-full transition-all duration-300 ease-out shadow-md shadow-teal-500/10 ${
                    lang === 'en' ? 'left-[42px]' : 'left-0.5'
                  }`}
                />
                <button 
                  onClick={() => handleLangToggle('zh')}
                  className={`relative z-10 flex-1 text-center text-[10px] font-bold tracking-wider transition-colors duration-300 cursor-pointer h-full flex items-center justify-center ${
                    lang === 'zh' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  中
                </button>
                <button 
                  onClick={() => handleLangToggle('en')}
                  className={`relative z-10 flex-1 text-center text-[10px] font-mono font-bold tracking-wider transition-colors duration-300 cursor-pointer h-full flex items-center justify-center ${
                    lang === 'en' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  EN
                </button>
              </div>
              
              <button 
                onClick={() => setShowAbout(true)}
                className="h-[26px] w-[26px] flex items-center justify-center rounded-full bg-gray-950/60 border border-gray-800/80 text-gray-400 hover:text-teal-400 hover:border-teal-500/50 hover:shadow-[0_0_10px_rgba(20,184,166,0.3)] active:scale-90 transition-all cursor-pointer text-xs"
                title={t('aboutSystem')}
              >
                ℹ️
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 tracking-wide uppercase">{t('subtitle')}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{t('realTimeTracking')} ({alerts.length})</h2>
            <div className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </div>
          </div>
          
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-20 bg-gray-800 rounded-lg w-full"></div>
                <div className="h-20 bg-gray-800 rounded-lg w-full"></div>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 border border-dashed border-gray-700 rounded-lg text-gray-500 text-sm">
              <span className="text-2xl mb-2">🌊</span>
              {t('noAlertsTitle')}
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-xl border backdrop-blur-sm transition-all hover:scale-[1.02] cursor-pointer ${
                  selectedAlert?.id === alert.id
                    ? 'border-teal-400 bg-teal-950/30 ring-2 ring-teal-500/20 shadow-[0_0_20px_rgba(20,184,166,0.25)]'
                    : alert.level === 'CRITICAL' 
                      ? 'bg-red-950/40 border-red-900/50 shadow-[0_0_15px_rgba(220,38,38,0.1)] hover:border-red-700/50' 
                      : 'bg-yellow-950/40 border-yellow-900/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] hover:border-yellow-700/50'
                }`}
                onClick={() => {
                  const isSelected = selectedAlert?.id === alert.id;
                  const nextAlert = isSelected ? null : alert;
                  setSelectedAlert(nextAlert);
                  setSelectedPoint(nextAlert ? {
                    lat: alert.lat,
                    lon: alert.lon,
                    variable: alert.type === '赤潮预警' ? 'chl' : 'o2',
                    name: alert.type
                  } : null);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full tracking-wider uppercase ${
                      alert.level === 'CRITICAL' ? 'bg-red-900/80 text-red-200' : 'bg-yellow-900/80 text-yellow-200'
                    }`}>
                      {translateAlertType(alert.type, lang)}
                    </span>
                    {selectedAlert?.id === alert.id && (
                      <span className="text-[10px] text-teal-400 font-bold animate-pulse">{t('locating')}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US')}
                  </span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-medium">{translateAlertMsg(alert.message, lang)}</p>
                <div className="mt-3 pt-3 border-t border-gray-800/50 flex justify-between text-[11px] text-gray-500 font-mono">
                  <span>Lat: {alert.lat.toFixed(4)}</span>
                  <span>Lon: {alert.lon.toFixed(4)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Historical Chart Panel */}
        {selectedPoint && (
          <div className="p-5 border-t border-gray-800 bg-gray-900/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">
                📈 {translateAlertType(selectedPoint.name, lang)} - {t('trendTitle')}
              </span>
              <button 
                onClick={() => {
                  setSelectedPoint(null);
                  setSelectedAlert(null);
                }}
                className="text-gray-500 hover:text-gray-300 text-xs font-mono"
              >
                {t('close')}
              </button>
            </div>
            {loadingHistory ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 font-mono animate-pulse">
                {t('loadingTrend')}
              </div>
            ) : historyData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 font-mono text-center p-4">
                {t('noTrendData')}
              </div>
            ) : (
              <div className="h-40 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                      itemStyle={{ color: '#2dd4bf', fontSize: '11px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={selectedPoint.variable === 'chl' ? '#10b981' : '#3b82f6'} 
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="text-[10px] text-gray-500 font-mono flex justify-between border-t border-gray-800/50 pt-2">
              <span>{t('latitude')}: {selectedPoint.lat.toFixed(4)}</span>
              <span>{t('longitude')}: {selectedPoint.lon.toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Sidebar Footer / Explanation Panel */}
        <div className="p-5 border-t border-gray-800/80 bg-gray-900/90 text-[11px] text-gray-400 space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-gray-300 text-xs">
            <span>ℹ️</span>
            <span>{t('radarMechanism')}</span>
          </div>
          <p className="leading-relaxed text-gray-400">
            {t('legendDescription')}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-medium text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>{t('legendChl')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span>{t('legendO2')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>{t('legendRedTide')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span>{t('legendHypoxia')}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 pt-1.5 leading-normal border-t border-gray-800/60">
            {t('legendTip')}
          </p>
          <div className="pt-2 flex justify-between items-center text-[10px] text-gray-500 border-t border-gray-800/40">
            <span>{t('dataSource')}</span>
            <button 
              onClick={() => setShowDisclaimer(true)}
              className="text-teal-400 hover:text-teal-300 underline transition-colors cursor-pointer"
            >
              {t('disclaimerLink')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative bg-gray-950">
        <Map 
          metrics={metrics} 
          alerts={alerts} 
          selectedAlert={selectedAlert} 
          onSelectAlert={setSelectedAlert} 
          selectedPoint={selectedPoint}
          onSelectPoint={setSelectedPoint}
          lang={lang}
        />
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/75 backdrop-blur-md"
          onClick={() => setShowDisclaimer(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDisclaimer(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('disclaimerTitle')}
        >
          <div 
            className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-base border-b border-gray-800 pb-3">
              <span>⚠️</span>
              <span>{t('disclaimerTitle')}</span>
            </div>
            
            <div className="text-[11px] text-slate-300 space-y-3 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <p>
                <strong>{t('disclaimerP1Title')}</strong><br />
                {t('disclaimerP1Text')}
              </p>
              <p>
                <strong>{t('disclaimerP2Title')}</strong><br />
                {t('disclaimerP2Text')}
              </p>
              <p>
                <strong>{t('disclaimerP3Title')}</strong><br />
                {t('disclaimerP3Text')}
              </p>
              <p>
                <strong>{t('disclaimerP4Title')}</strong><br />
                {t('disclaimerP4Text')}
              </p>
            </div>
            
            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 active:scale-95 text-xs text-white font-semibold transition-all shadow-lg shadow-teal-500/25 cursor-pointer"
              >
                {t('disclaimerButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About System & Blueprint Modal */}
      {showAbout && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/80 backdrop-blur-xl animate-fade-in"
          onClick={() => setShowAbout(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowAbout(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('aboutTitle')}
        >
          <div 
            className="bg-gray-900/90 border border-teal-500/20 rounded-3xl p-8 max-w-4xl w-full mx-4 shadow-2xl shadow-teal-500/5 relative overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cyber neon glow effects */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Close button */}
            <button 
              onClick={() => setShowAbout(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-teal-400 active:scale-90 transition-all text-sm font-mono cursor-pointer border border-gray-800 hover:border-teal-500/30 bg-gray-950/40 px-3 py-1.5 rounded-full z-20"
            >
              ESC / [×]
            </button>

            {/* Modal Header */}
            <div className="mb-8 relative z-10">
              <span className="text-[10px] font-bold tracking-wider text-teal-400 uppercase bg-teal-950/50 border border-teal-900/50 px-2.5 py-1 rounded-md">
                {t('blueprintBadge')}
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-emerald-400 to-blue-500 mt-3">
                {t('aboutTitle')}
              </h2>
              <p className="text-sm text-gray-400 mt-2 font-medium">{t('aboutSubtitle')}</p>
            </div>

            {/* 2x2 Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 relative z-10 custom-scrollbar pb-2">
              {/* Card 1: Core Monitoring Features */}
              <div className="p-6 rounded-2xl bg-gray-950/40 border border-gray-800/80 hover:border-teal-500/35 hover:bg-gray-950/60 shadow-md transition-all duration-300 group hover:scale-[1.01]">
                <h3 className="text-base font-bold text-teal-400 mb-4 flex items-center gap-2">
                  {t('featuresTitle')}
                </h3>
                <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                  <p>{t('featuresText1')}</p>
                  <p>{t('featuresText2')}</p>
                  <p>{t('featuresText3')}</p>
                </div>
              </div>

              {/* Card 2: Scientific Data Sources */}
              <div className="p-6 rounded-2xl bg-gray-950/40 border border-gray-800/80 hover:border-emerald-500/35 hover:bg-gray-950/60 shadow-md transition-all duration-300 group hover:scale-[1.01]">
                <h3 className="text-base font-bold text-emerald-400 mb-4 flex items-center gap-2">
                  {t('sourcesTitle')}
                </h3>
                <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                  <p>{t('sourcesText1')}</p>
                  <p>{t('sourcesText2')}</p>
                </div>
              </div>

              {/* Card 3: Core Application Value */}
              <div className="p-6 rounded-2xl bg-gray-950/40 border border-gray-800/80 hover:border-blue-500/35 hover:bg-gray-950/60 shadow-md transition-all duration-300 group hover:scale-[1.01]">
                <h3 className="text-base font-bold text-blue-400 mb-4 flex items-center gap-2">
                  {t('valueTitle')}
                </h3>
                <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                  <p>{t('valueText1')}</p>
                  <p>{t('valueText2')}</p>
                  <p>{t('valueText3')}</p>
                </div>
              </div>

              {/* Card 4: Future Blueprint */}
              <div className="p-6 rounded-2xl bg-gray-950/40 border border-gray-800/80 hover:border-indigo-500/35 hover:bg-gray-950/60 shadow-md transition-all duration-300 group hover:scale-[1.01]">
                <h3 className="text-base font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  {t('roadmapTitle')}
                </h3>
                <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                  <p>{t('roadmapText1')}</p>
                  <p>{t('roadmapText2')}</p>
                  <p>{t('roadmapText3')}</p>
                </div>
              </div>
            </div>

            {/* Bottom confirmation */}
            <div className="pt-6 border-t border-gray-800 mt-6 flex justify-end relative z-10">
              <button 
                onClick={() => setShowAbout(false)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-650 active:scale-95 text-xs text-white font-bold transition-all shadow-lg shadow-teal-500/15 cursor-pointer"
              >
                {t('startExploring')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
