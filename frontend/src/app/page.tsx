"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full w-full bg-gray-900 text-white font-mono animate-pulse">Initializing CMEMS Radar...</div>
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
      const dateStr = new Date(h.timestamp).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
      chartDataObj[dateStr] = parseFloat(h.value.toFixed(2));
    });
    return Object.entries(chartDataObj).map(([date, value]) => ({ date, value }));
  }, [historyData]);


  return (
    <div className="flex h-screen bg-gray-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col z-10 shadow-2xl">
        <div className="p-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-teal-400 via-blue-400 to-indigo-500">
            CMEMS 生态雷达
          </h1>
          <p className="text-xs text-gray-400 mt-2 tracking-wide uppercase">中国沿海海洋生态预警系统</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">实时预警追踪 ({alerts.length})</h2>
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
              暂无预警，海域生态健康。
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
                      {alert.type.replace('_', ' ')}
                    </span>
                    {selectedAlert?.id === alert.id && (
                      <span className="text-[10px] text-teal-400 font-bold animate-pulse">● 定位中</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-medium">{alert.message}</p>
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
                📈 {selectedPoint.name} - 7日趋势
              </span>
              <button 
                onClick={() => {
                  setSelectedPoint(null);
                  setSelectedAlert(null);
                }}
                className="text-gray-500 hover:text-gray-300 text-xs font-mono"
              >
                [关闭]
              </button>
            </div>
            {loadingHistory ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 font-mono animate-pulse">
                加载趋势数据中...
              </div>
            ) : historyData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-500 font-mono text-center p-4">
                暂无该点位 7 日历史趋势数据
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
              <span>纬度: {selectedPoint.lat.toFixed(4)}</span>
              <span>经度: {selectedPoint.lon.toFixed(4)}</span>
            </div>
          </div>
        )}

        {/* Sidebar Footer / Explanation Panel */}
        <div className="p-5 border-t border-gray-800/80 bg-gray-900/90 text-[11px] text-gray-400 space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-gray-300 text-xs">
            <span>ℹ️</span>
            <span>雷达监测机制与图例</span>
          </div>
          <p className="leading-relaxed text-gray-400">
            系统覆盖中国沿海全海域。为聚焦高风险区域，仅对**指标异常点**进行截取与渲染（空白海域表示水质处于安全区间）：
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-medium text-gray-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>叶绿素异常 (&gt;3.0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span>低氧风险 (&lt;200)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>赤潮预警</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span>水体缺氧警报</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 pt-1.5 leading-normal border-t border-gray-800/60">
            * 提示：点击地图点位或预警卡片以查看 7 日历史趋势。同一位置多次预警表示事件持续演进。
          </p>
          <div className="pt-2 flex justify-between items-center text-[10px] text-gray-500 border-t border-gray-800/40">
            <span>数据源: CMEMS 卫星监测</span>
            <button 
              onClick={() => setShowDisclaimer(true)}
              className="text-teal-400 hover:text-teal-300 underline transition-colors cursor-pointer"
            >
              免责与科学声明
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
          aria-label="数据免责与科学声明"
        >
          <div 
            className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-base border-b border-gray-800 pb-3">
              <span>⚠️</span>
              <span>数据免责与科学声明</span>
            </div>
            
            <div className="text-[11px] text-slate-300 space-y-3 leading-relaxed max-h-96 overflow-y-auto pr-1">
              <p>
                <strong>1. 非官方权威预警</strong><br />
                本平台所涉的“赤潮预警”、“水体缺氧警报”等各类生态异常提示与数据点位，均基于欧盟哥白尼海洋服务（CMEMS）公开的卫星遥感及物理模型反演算法得出，<strong>并非中华人民共和国各级官方机构发布的法定预警通告</strong>。
              </p>
              <p>
                <strong>2. 仅限科研与技术演示</strong><br />
                本系统主要用于科学研究交流、教育科普以及全栈数据可视化大屏的技术展示，<strong>严禁用于</strong>海洋导航、渔业生产、养殖规划、防灾决策或其他高风险生产作业。
              </p>
              <p>
                <strong>3. 数据时效性与局限性</strong><br />
                由于卫星轨道周期、云层覆盖、近岸陆地滤波算法以及反演模型的时空分辨率限制，部分点位数据可能存在一定的时间滞后，或者在海岸线附近产生少许偏差（陆地漂移过滤已进行优化但无法完全消除）。本平台不对数据的百分之百准确性、完整性和实时性提供任何明示或暗示的担保。
              </p>
              <p>
                <strong>4. 赔偿豁免责任</strong><br />
                用户据此平台数据做出的任何生产决策或商业行为，由此引发的直接或间接财产损失、人身安全事件或纠纷，本平台及其开发者<strong>均不承担任何形式的法律责任或经济赔偿责任</strong>。
              </p>
            </div>
            
            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button 
                onClick={() => setShowDisclaimer(false)}
                className="px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 active:scale-95 text-xs text-white font-semibold transition-all shadow-lg shadow-teal-500/25 cursor-pointer"
              >
                我已阅读并知晓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
