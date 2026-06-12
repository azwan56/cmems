export type Language = 'zh' | 'en';

export const dictionary = {
  zh: {
    title: "CMEMS 生态雷达",
    subtitle: "中国沿海海洋生态预警系统 - 演示版",
    realTimeTracking: "实时预警追踪",
    noAlertsTitle: "暂无预警，海域生态健康。",
    locating: "● 定位中",
    trendTitle: "7日趋势",
    close: "[关闭]",
    loadingTrend: "加载趋势数据中...",
    noTrendData: "暂无该点位 7 日历史趋势数据",
    latitude: "纬度",
    longitude: "经度",
    radarMechanism: "雷达监测机制与图例",
    legendDescription: "系统覆盖中国沿海全海域。为聚焦高风险区域，仅对指标异常点进行截取与渲染（空白海域表示水质处于安全区间）：",
    legendChl: "叶绿素异常 (>3.0)",
    legendO2: "低氧风险 (<200)",
    legendRedTide: "赤潮预警",
    legendHypoxia: "水体缺氧警报",
    legendTip: "* 提示：点击地图点位或预警卡片以查看 7 日历史趋势。同一位置多次预警表示事件持续演进。",
    dataSource: "数据源: CMEMS 卫星监测",
    disclaimerLink: "免责与科学声明",
    disclaimerTitle: "数据免责与科学声明",
    disclaimerP1Title: "1. 非官方权威预警",
    disclaimerP1Text: "本平台所涉的“赤潮预警”、“水体缺氧警报”等各类生态异常提示与数据点位，均基于欧盟哥白尼海洋服务（CMEMS）公开的卫星遥感及物理模型反演算法得出，并非中华人民共和国各级官方机构发布的法定预警通告。",
    disclaimerP2Title: "2. 仅限科研与技术演示",
    disclaimerP2Text: "本系统主要用于科学研究交流、教育科普以及全栈数据可视化大屏的技术展示，严禁用于海洋导航、渔业生产、养殖规划、防灾决策或其他高风险生产作业。",
    disclaimerP3Title: "3. 数据时效性与局限性",
    disclaimerP3Text: "由于卫星轨道周期、云层覆盖、近岸陆地滤波算法以及反演模型的时空分辨率限制，部分点位数据可能存在一定的时间滞后，或者在海岸线附近产生少许偏差（陆地漂移过滤已进行优化但无法完全消除）。本平台不对数据的百分之百准确性、完整性和实时性提供任何明示或暗示的担保。",
    disclaimerP4Title: "4. 赔偿豁免责任",
    disclaimerP4Text: "用户据此平台数据做出的任何生产决策或商业行为，由此引发的直接或间接财产损失、人身安全事件或纠纷，本平台及其开发者均不承担任何形式的法律责任或经济赔偿责任。",
    disclaimerButton: "我已阅读并知晓",
    critical: "严重",
    warning: "警告",
    algaeBloom: "赤潮预警",
    hypoxia: "水体缺氧",
    chlorophyllConc: "叶绿素a浓度",
    bottomO2: "底层溶解氧",
    value: "测量值",
    unitChl: "mg/m³",
    unitO2: "mmol/m³",
    initializingMap: "地图初始化中...",
    initializingRadar: "正在初始化生态雷达...",
    time: "时间",
    aboutSystem: "系统介绍与未来蓝图",
    aboutTitle: "CMEMS 生态雷达系统说明",
    aboutSubtitle: "基于地球观测卫星的沿海海洋生态数字化双生与预警平台",
    featuresTitle: "🌐 核心监测功能",
    featuresText1: "• 叶绿素a异常捕获：快速捕捉海区藻类繁殖特征，建立叶绿素a阈值筛查机制。",
    featuresText2: "• 底层缺氧分析：对近岸深海和水体底层的溶解氧不足进行动态监控与预警。",
    featuresText3: "• 交互式趋势演进：点击任意警报点或海域点位，即可获取 7 日历史时空趋势分析图表。",
    sourcesTitle: "🛰️ 科学数据来源",
    sourcesText1: "• CMEMS 绿色生物地球化学数据：由欧盟哥白尼海洋服务（CMEMS）公开的卫星遥感与高分辨率三维模型提供。",
    sourcesText2: "• 物理模型反演算法：结合沿岸水温、盐度及底栖混合层深度的数值物理计算模型。",
    valueTitle: "💎 核心应用价值",
    valueText1: "• 藻华（赤潮）早期预警：提供渔业及沿海养殖业高风险事件的早期态势感知，辅助减灾防灾。",
    valueText2: "• 底栖生态保护：为近海生态“盲区”（底层缺氧带）提供直观的指标预警，保护生物多样性。",
    valueText3: "• 数字孪生原型：展示了如何利用开放卫星遥感数据快速构建数字化海岸生态态势监测平台。",
    roadmapTitle: "🚀 下一步与未来蓝图",
    roadmapText1: "• 多源数据融合：引入现场海洋浮标 IoT 实时传感器数据，与卫星遥感数据进行高精度交叉校验。",
    roadmapText2: "• 时空智能预测：引入机器学习算法（如 LSTM / ConvLSTM）对藻华扩散和缺氧带演进进行时空推演预测。",
    roadmapText3: "• 官方系统对接：提供标准化 API 接口，实现与各级政府海洋防灾减灾应急指挥系统的无缝对接。",
    blueprintBadge: "系统蓝图",
    startExploring: "开启探索",
    mapLayers: {
      voyager: "🌐 极光高对比 (Voyager)",
      satellite: "🛰️ 卫星影像 (Satellite)",
      dark: "🌑 极光深色 (Dark)",
      standard: "🗺️ 标准地图 (Standard)"
    }
  },
  en: {
    title: "CMEMS Eco Radar",
    subtitle: "China Coastal Marine Ecological Warning System - Demo",
    realTimeTracking: "Real-time Warning Tracking",
    noAlertsTitle: "No alerts, marine ecosystem is healthy.",
    locating: "● Locating",
    trendTitle: "7-Day Trend",
    close: "[Close]",
    loadingTrend: "Loading trend data...",
    noTrendData: "No 7-day history trend data for this point",
    latitude: "Latitude",
    longitude: "Longitude",
    radarMechanism: "Radar Monitoring Mechanism & Legend",
    legendDescription: "The system covers the entire coastal waters of China. To focus on high-risk areas, only abnormal metric points are captured and rendered (blank sea areas indicate water quality is in a safe range):",
    legendChl: "Chlorophyll Anomaly (>3.0)",
    legendO2: "Hypoxia Risk (<200)",
    legendRedTide: "Algae Bloom Warning",
    legendHypoxia: "Hypoxia Alarm",
    legendTip: "* Note: Click map points or alert cards to view the 7-day trend. Multiple alerts at the same location indicate ongoing events.",
    dataSource: "Source: CMEMS Satellite Monitoring",
    disclaimerLink: "Disclaimer & Scientific Statement",
    disclaimerTitle: "Data Disclaimer & Scientific Statement",
    disclaimerP1Title: "1. Unofficial Warning",
    disclaimerP1Text: "All ecological anomaly prompts and data points, such as 'Algae Bloom Warning' and 'Hypoxia Alarm' on this platform, are derived from satellite remote sensing and physical model inversion algorithms published by the Copernicus Marine Service (CMEMS). They are not official warning announcements issued by any level of official agencies of the People's Republic of China.",
    disclaimerP2Title: "2. For Scientific Research & Tech Demo Only",
    disclaimerP2Text: "This system is mainly used for scientific research exchanges, educational popularization, and full-stack data visualization dashboard demonstration. It is strictly prohibited for marine navigation, fishery production, aquaculture planning, disaster prevention decision-making, or other high-risk production activities.",
    disclaimerP3Title: "3. Data Timeliness & Limitations",
    disclaimerP3Text: "Due to satellite orbital periods, cloud cover, coastal land filter algorithms, and spatial-temporal resolution limits of inversion models, some data points may have time lags or slight deviations near the coastline (land drift filtering is optimized but cannot be completely eliminated). This platform does not guarantee the 100% accuracy, completeness, or timeliness of the data, either express or implied.",
    disclaimerP4Title: "4. Indemnity & Liability Exemption",
    disclaimerP4Text: "Users make production decisions or commercial behaviors based on the data of this platform. For any direct or indirect property loss, personal safety incidents, or disputes caused by this, this platform and its developers do not assume any form of legal liability or economic compensation responsibility.",
    disclaimerButton: "I have read and acknowledged",
    critical: "Critical",
    warning: "Warning",
    algaeBloom: "Algae Bloom Warning",
    hypoxia: "Water Hypoxia",
    chlorophyllConc: "Chlorophyll-a",
    bottomO2: "Bottom Dissolved Oxygen",
    value: "Value",
    unitChl: "mg/m³",
    unitO2: "mmol/m³",
    initializingMap: "Initializing Map...",
    initializingRadar: "Initializing CMEMS Radar...",
    time: "Time",
    aboutSystem: "System Intro & Blueprint",
    aboutTitle: "CMEMS Eco Radar Blueprint",
    aboutSubtitle: "Satellite-driven digital twin & warning platform for coastal ecosystems",
    featuresTitle: "🌐 Core Monitoring Features",
    featuresText1: "• Chlorophyll-a Anomaly Capture: Rapidly detects algae bloom characteristics with automated threshold screening.",
    featuresText2: "• Benthic Hypoxia Analysis: Dynamically monitors and warns of dissolved oxygen depletion in deep coastal bottom waters.",
    featuresText3: "• Interactive Trend Evolution: Click any alert or map point to fetch a 7-day historical spatial-temporal trend analysis chart.",
    sourcesTitle: "🛰️ Scientific Data Sources",
    sourcesText1: "• CMEMS Green Biogeochemistry: Powered by Copernicus Marine Service satellite telemetry and high-resolution 3D models.",
    sourcesText2: "• Physical Inversion Algorithms: Computed via coastal sea temperature, salinity, and benthic mixed layer depth models.",
    valueTitle: "💎 Core Application Value",
    valueText1: "• Algae Bloom Early Warning: Provides early situational awareness for fisheries and coastal aquaculture to mitigate disasters.",
    valueText2: "• Benthic Protection: Offers visual warning indicators for benthic 'dead zones' (hypoxia bands) to protect biodiversity.",
    valueText3: "• Digital Twin Prototype: Demonstrates how open satellite observation data can rapidly build a digitalized coastal monitoring platform.",
    roadmapTitle: "🚀 Future Blueprint",
    roadmapText1: "• Multi-Source Fusion: Integrate IoT marine buoy sensor telemetries to perform high-precision cross-validation with satellite data.",
    roadmapText2: "• Spatiotemporal AI Prediction: Utilize ML algorithms (e.g. ConvLSTM) to simulate and predict bloom propagation and hypoxia trends.",
    roadmapText3: "• Official API Integration: Establish standardized APIs to bridge and integrate with official marine disaster response systems.",
    blueprintBadge: "SYSTEM BLUEPRINT",
    startExploring: "Start Exploring",
    mapLayers: {
      voyager: "🌐 High Contrast (Voyager)",
      satellite: "🛰️ Satellite Imagery",
      dark: "🌑 Dark Map",
      standard: "🗺️ Standard Map"
    }
  }
};

export type DictionaryKey = Exclude<keyof typeof dictionary['zh'], 'mapLayers'>;

export function translateAlertMsg(msg: string, lang: Language): string {
  if (lang === 'zh') return msg;

  // Chlorophyll warning
  const chlRegex = /检测到海域叶绿素a浓度偏高 \(([\d.]+)\s*mg\/m³\)，存在赤潮爆发风险。/;
  const chlMatch = msg.match(chlRegex);
  if (chlMatch) {
    return `High chlorophyll-a concentration detected in sea area (${chlMatch[1]} mg/m³), indicating a risk of algae bloom.`;
  }

  // Critical hypoxia warning
  const o2CriticalRegex = /检测到近海底层水体严重缺氧 \(([\d.]+)\s*mmol\/m³\)，低于生物窒息阈值，存在重度缺氧致死风险。/;
  const o2CriticalMatch = msg.match(o2CriticalRegex);
  if (o2CriticalMatch) {
    return `Severe hypoxia detected in bottom water (${o2CriticalMatch[1]} mmol/m³), below biological suffocation threshold, risk of severe hypoxia death.`;
  }

  // Warning hypoxia warning
  const o2WarningRegex = /检测到近海底层溶解氧偏低 \(([\d.]+)\s*mmol\/m³\)，可能导致底栖生物缺氧窒息风险。/;
  const o2WarningMatch = msg.match(o2WarningRegex);
  if (o2WarningMatch) {
    return `Low dissolved oxygen detected in bottom water (${o2WarningMatch[1]} mmol/m³), may lead to risk of hypoxia suffocation in benthic organisms.`;
  }

  return msg;
}

export function translateAlertType(type: string, lang: Language): string {
  if (lang === 'zh') return type;
  if (type === '赤潮预警') return 'Algae Bloom Warning';
  if (type === '水体缺氧') return 'Hypoxia Alert';
  if (type === '叶绿素a浓度') return 'Chlorophyll-a';
  if (type === '底层溶解氧') return 'Bottom Dissolved Oxygen';
  return type;
}
