<p align="center">
  <h1 align="center">🚦 Smart Traffic Detection System</h1>
  <p align="center">
    <strong>AI-powered real-time traffic detection with custom YOLOv8 Indian traffic sign recognition</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/TensorFlow.js-COCO_SSD-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow.js" />
    <img src="https://img.shields.io/badge/YOLOv8-91.5%25_mAP50-purple?style=for-the-badge" alt="YOLOv8" />
    <img src="https://img.shields.io/badge/Gemini_2.0-Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  </p>
</p>

<p align="center">
  <i>Fine-tuned YOLOv8 achieving 91.5% mAP50 on 85 Indian traffic sign classes, deployed for real-time browser inference at 16+ FPS</i>
</p>

---

## ⚡ Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/himanshu-sharma-dev1/Smart-Traffic-Detection-System.git
cd Smart-Traffic-Detection-System

# Configure environment
cp .env.example backend/.env
# Edit backend/.env with your credentials

# Run with Docker Compose
docker-compose up --build
```

Open `http://localhost:3000` 🎉

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+ | Python 3.9+ | MongoDB Atlas

```bash
# Clone
git clone https://github.com/himanshu-sharma-dev1/Smart-Traffic-Detection-System.git
cd Smart-Traffic-Detection-System

# Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env  # Edit with your credentials
python main.py

# Frontend (new terminal)
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8000" > .env
npm start
```

---

## 🎯 Features

### Detection Capabilities
- **Real-time Object Detection** — COCO-SSD via TensorFlow.js
- **Traffic Sign Recognition** — Custom YOLOv8 (85 Indian sign classes)
- **Image Analysis** — Google Gemini 2.0 Flash Vision API
- **Video Processing** — Frame-by-frame detection with progress tracking
- **Object Tracking** — SORT algorithm for persistent IDs
- **Counting Zones** — Line-crossing detection & statistics

### Authentication & Security
- **JWT Authentication** — Secure token-based auth with bcrypt
- **Google OAuth 2.0** — One-click social login
- **Email Verification** — SMTP-based account verification
- **Password Reset** — Secure email-based reset flow
- **Rate Limiting** — API protection (20 requests/min)

### User Experience
- **Voice Commands** — Web Speech API ("Start detection", "Screenshot", etc.)
- **Keyboard Shortcuts** — Alt+H (Home), Alt+L (Live), Ctrl+/ (Dark mode)
- **PWA Support** — Install as native app, offline capable
- **PDF Export** — Generate detection reports
- **Analytics Dashboard** — Visualize detection statistics with Recharts

---

## 🤖 Custom AI Model

<table align="center">
<tr><th>Metric</th><th>Value</th></tr>
<tr><td><strong>mAP50</strong></td><td>91.5%</td></tr>
<tr><td><strong>mAP50-95</strong></td><td>85.1%</td></tr>
<tr><td><strong>Recall</strong></td><td>92.7%</td></tr>
<tr><td><strong>Precision</strong></td><td>82.2%</td></tr>
<tr><td><strong>Classes</strong></td><td>85 Indian traffic signs</td></tr>
<tr><td><strong>Model Size</strong></td><td>~12MB (browser optimized)</td></tr>
<tr><td><strong>Inference</strong></td><td>16+ FPS (dual-model)</td></tr>
</table>

**Supported Signs:** STOP, SPEED_LIMIT (15-80), NO_ENTRY, NO_PARKING, GIVE_WAY, PEDESTRIAN_CROSSING, SCHOOL_AHEAD, ROUNDABOUT, U_TURN_PROHIBITED, and 75+ more classes.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                          │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│   │   Home    │  │  Detect   │  │   Live    │  │   Dashboard   │   │
│   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
│         │              │              │                │            │
│   ┌─────┴──────────────┴──────────────┴────────────────┴─────┐     │
│   │              Dual-Model Detection Engine                  │     │
│   │  ┌──────────────┐    ┌──────────────────────────────┐    │     │
│   │  │   COCO-SSD   │ +  │  YOLOv8 Traffic Signs (85)   │    │     │
│   │  │  (Vehicles)  │    │   Frame Interlacing + NMS    │    │     │
│   │  └──────────────┘    └──────────────────────────────┘    │     │
│   └──────────────────────────┬───────────────────────────────┘     │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ REST API
┌──────────────────────────────┼──────────────────────────────────────┐
│                        Backend (FastAPI)                            │
│   ┌──────────────────────────┴────────────────────────────┐        │
│   │   /api/auth/*   │   /api/detections/*   │   /detect   │        │
│   │   JWT + OAuth   │   CRUD + Stats        │   Gemini    │        │
│   └──────────────────────────┬────────────────────────────┘        │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                  ┌────────────┴────────────┐
                  │      MongoDB Atlas      │
                  │   (Users + Detections)  │
                  └─────────────────────────┘
```

See [ARCHITECTURE.md](tasks/ARCHITECTURE.md) for detailed documentation.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, React Bootstrap, Framer Motion, Recharts, TensorFlow.js |
| **Backend** | FastAPI, Motor (async MongoDB), Pydantic, python-jose, passlib + bcrypt |
| **AI/ML** | COCO-SSD, Custom YOLOv8n, Google Gemini 2.0 Flash, SORT tracking |
| **Infrastructure** | Docker, MongoDB Atlas, PWA + Service Workers, nginx |

---

## 📁 Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application entry
│   ├── config/              # Database & settings
│   ├── routes/              # API endpoints (auth, oauth, detection, websocket)
│   ├── models/              # Pydantic schemas
│   ├── utils/               # JWT, email, exceptions
│   ├── tests/               # pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   │   └── models/traffic_signs/  # YOLOv8 TensorFlow.js model
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context (Auth)
│   │   ├── hooks/           # usePWAInstall, useVoiceCommands, useKeyboardShortcuts
│   │   ├── utils/           # Detection utilities (Tracker, Merger, Estimators)
│   │   └── *.js             # Page components
│   ├── Dockerfile
│   └── nginx.conf
│
├── tasks/
│   └── ARCHITECTURE.md      # System architecture documentation
│
├── docker-compose.yml
└── .env.example
```

---

## 📖 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get profile |
| PUT | `/api/auth/me` | Update profile |
| DELETE | `/api/auth/me` | Delete account |
| GET | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/verify-email` | Verify email |

### Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/detect` | Detect objects (Gemini Vision) |
| GET | `/api/detections` | Get history (paginated) |
| POST | `/api/detections` | Save detection |
| GET | `/api/detections/stats` | Get statistics |

**Interactive Docs:** `http://localhost:8000/docs` (Swagger) | `http://localhost:8000/redoc`

---

## 🧪 Testing

```bash
cd backend
pytest --cov=. --cov-report=html
```

---

## 🐳 Docker Deployment

```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.yml up -d
```

**Services:**
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

## 🔮 Roadmap

- [x] Docker containerization
- [x] Comprehensive test suite (pytest)
- [x] JWT + OAuth authentication
- [x] Email verification flow
- [ ] GitHub Actions CI/CD
- [ ] Cloud deployment (AWS/GCP/Railway)
- [ ] Traffic density heatmap
- [ ] Multi-camera dashboard

---

## 📄 License

MIT License - feel free to use for learning and portfolio.

---

## 👨‍💻 Author

<p align="center">
  <strong>Himanshu Sharma</strong>
  <br/>
  <a href="https://github.com/himanshu-sharma-dev1">
    <img src="https://img.shields.io/badge/GitHub-himanshu--sharma--dev1-181717?style=flat&logo=github" alt="GitHub" />
  </a>
  <a href="https://linkedin.com/in/himanshu-sharma">
    <img src="https://img.shields.io/badge/LinkedIn-Himanshu_Sharma-0A66C2?style=flat&logo=linkedin" alt="LinkedIn" />
  </a>
</p>

---

<p align="center">
  <strong>⭐ Star this repo if you found it helpful!</strong>
</p>
