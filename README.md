# 🌊 CMEMS 中国沿海海洋生态预警系统

基于 [Copernicus Marine Service (CMEMS)](https://marine.copernicus.eu/) 卫星遥感数据的中国沿海海洋生态实时监测与预警系统。

![Dashboard Preview](docs/preview.png)

## ✨ 功能特性

- **赤潮预警** — 实时监测海表叶绿素a浓度，自动识别赤潮高发区域
- **水体缺氧监测** — 追踪近海底层溶解氧含量，预警低氧/缺氧事件
- **交互式地图大屏** — 基于 Leaflet 的高颜值暗黑风格数据可视化看板
- **7日历史趋势分析** — 点击任意监测点位查看连续7天的指标变化趋势
- **Discord 实时告警推送** — 通过 Webhook 将严重预警推送至 Discord 频道
- **GCP 全自动化调度** — Cloud Run Job + Cloud Scheduler 每日定时数据同步

## 🏗️ 系统架构

```
CMEMS API → Python 数据管道 → Firebase Firestore → Next.js 大屏看板
                ↓
         Discord Webhook 告警推送
```

| 组件 | 技术栈 | 说明 |
|------|--------|------|
| 数据管道 | Python 3.11, xarray, copernicusmarine | 从 CMEMS 获取 NetCDF 切片并分析 |
| 数据库 | Firebase Firestore | 存储指标数据与预警记录 |
| 前端看板 | Next.js 16, React, Leaflet, Recharts | 交互式地图与趋势图表 |
| 消息推送 | Discord Webhook | 实时告警通知 |
| 云端部署 | GCP Cloud Run Jobs, Cloud Scheduler | 每日自动化数据同步 |

## 🚀 快速开始

### 前置要求

- Python 3.11+
- Node.js 20+
- [CMEMS 账号](https://data.marine.copernicus.eu/register)
- Firebase 项目 + 服务账号密钥
- (可选) Discord Webhook URL

### 1. 克隆项目

```bash
git clone https://github.com/azwan56/cmems.git
cd cmems
```

### 2. 配置数据管道

```bash
cd data_pipeline
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 复制并配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 CMEMS 账号、Firebase 配置和 Discord Webhook URL

# 将 Firebase 服务账号密钥保存为 firebase-key.json
```

### 3. 运行数据采集与分析

```bash
python fetch_cmems.py    # 下载 CMEMS 卫星数据 (~1-2 分钟)
python analyzer.py       # 分析数据并推送预警至 Firestore
```

### 4. 启动前端看板

```bash
cd ../frontend
npm install

# 复制并配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Firebase Admin SDK 配置

npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可查看看板。

## 📁 项目结构

```
├── data_pipeline/          # Python 数据管道
│   ├── fetch_cmems.py      # CMEMS API 数据获取
│   ├── analyzer.py         # 赤潮/低氧预警分析引擎
│   ├── firebase_uploader.py # Firestore 数据上传
│   ├── discord_webhook.py  # Discord 告警推送
│   ├── generate_history.py # 历史模拟数据生成 (开发用)
│   ├── Dockerfile          # GCP Cloud Run 容器配置
│   └── requirements.txt    # Python 依赖清单
├── frontend/               # Next.js 前端看板
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx    # 主页 (大屏看板)
│   │   │   └── api/        # API Routes (alerts, metrics, history)
│   │   ├── components/
│   │   │   └── Map.tsx     # Leaflet 地图组件
│   │   └── lib/
│   │       └── firebase-admin.ts  # Firebase Admin SDK 配置
│   └── package.json
└── .gitignore
```

## ☁️ GCP 云端部署

系统已完全容器化部署至 Google Cloud Platform：

```bash
# 构建并推送容器镜像
cd data_pipeline
gcloud builds submit --tag asia-east1-docker.pkg.dev/YOUR_PROJECT/cmems-repo/data-pipeline:latest

# 创建 Cloud Run Job
gcloud run jobs create cmems-sync-job \
  --image=asia-east1-docker.pkg.dev/YOUR_PROJECT/cmems-repo/data-pipeline:latest \
  --region=asia-east1

# 手动执行
gcloud run jobs execute cmems-sync-job --region=asia-east1
```

## 📄 License

MIT
