<p align="center">
  <h1 align="center">🚦 Smart Traffic Detection System</h1>
  <p align="center">
    <strong>AI-powered real-time traffic detection with custom YOLOv8 Indian traffic sign recognition</strong>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/TensorFlow.js-COCO_SSD-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow.js" />
    <img src="https://img.shields.io/badge/YOLOv8-Custom-purple?style=for-the-badge&logo=yolo&logoColor=white" alt="YOLOv8" />
    <img src="https://img.shields.io/badge/Gemini_2.5-Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
    <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  </p>
</p>

---

<p align="center">
  <i>"Fine-tuned YOLOv8 achieving 91.5% mAP50 on Indian traffic signs, deployed for real-time browser inference at 16+ FPS"</i>
</p>

---

## ✨ Key Features

### 🎯 Detection Capabilities
| Feature | Technology | Status |
|---------|------------|--------|
| **Real-time Detection** | COCO-SSD (TensorFlow.js) | ✅ Working |
| **Traffic Sign Detection** | Custom YOLOv8 (85 classes) | ✅ Working |
| **Image Detection** | Gemini 2.5 Flash Vision API | ✅ Working |
| **Video File Detection** | Frame-by-frame processing | ✅ Implemented |
| **Object Tracking** | SORT algorithm | ✅ Working |
| **Speed Estimation** | Physics-based calculation | ✅ Implemented |
| **Counting Zones** | Line-crossing detection | ✅ Implemented |
| **License Plate OCR** | Tesseract.js | ✅ Implemented |

### 🛡️ Production Features
| Feature | Technology | Status |
|---------|------------|--------|
| **JWT Authentication** | bcrypt + python-jose | ✅ Working |
| **Google OAuth** | Authlib + Google Cloud | ✅ Working |
| **Email Verification** | SMTP + tokens | ✅ Working |
| **Password Reset** | Email-based reset flow | ✅ Working |
| **Rate Limiting** | slowapi (20/min) | ✅ Working |
| **PWA Support** | Service Workers | ✅ Working |

### 🎨 User Experience
| Feature | Description | Status |
|---------|-------------|--------|
| **Voice Commands** | Web Speech API | ✅ Implemented |
| **Keyboard Shortcuts** | Alt+H, Alt+D, Alt+L, etc. | ✅ Working |
| **Dark Mode** | Persisted preference | ✅ Working |
| **PDF Export** | Detection reports | ✅ Working |
| **Analytics Dashboard** | Recharts visualization | ✅ Working |

---

## 🤖 Custom AI Model Stats

<table align="center">
<tr><th>Metric</th><th>Value</th><th>Notes</th></tr>
<tr><td><strong>mAP50</strong></td><td>91.5%</td><td>Excellent accuracy</td></tr>
<tr><td><strong>mAP50-95</strong></td><td>85.1%</td><td>Precise bounding boxes</td></tr>
<tr><td><strong>Recall</strong></td><td>92.7%</td><td>Rarely misses signs</td></tr>
<tr><td><strong>Precision</strong></td><td>82.2%</td><td>Low false positives</td></tr>
<tr><td><strong>Classes</strong></td><td>85</td><td>Indian traffic signs</td></tr>
<tr><td><strong>Model Size</strong></td><td>~12MB</td><td>Browser optimized</td></tr>
<tr><td><strong>FPS</strong></td><td>16+</td><td>Dual-model inference</td></tr>
</table>

### Traffic Sign Categories
```
STOP, SPEED_LIMIT_15-80, NO_ENTRY, NO_PARKING, GIVE_WAY, PEDESTRIAN_CROSSING,
SCHOOL_AHEAD, CATTLE, T_INTERSECTION, ROUNDABOUT, U_TURN_PROHIBITED, 
COMPULSARY_TURN_LEFT/RIGHT, NARROW_BRIDGE, STEEP_DESCENT, MEN_AT_WORK,
TRUCK_PROHIBITED, HORN_PROHIBITED, and 65+ more classes...
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19)                           │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│   │   Home    │  │  Detect   │  │   Live    │  │   Dashboard   │   │
│   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
│         │              │              │                │             │
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
│                        Backend (FastAPI)                             │
│   ┌──────────────────────────┴────────────────────────────┐        │
│   │   /api/auth/*   │   /api/detections/*   │   /detect   │        │
│   │   JWT + OAuth   │   CRUD + Stats        │   Gemini    │        │
│   └──────────────────────────┬────────────────────────────┘        │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                  ┌────────────┴────────────┐
                  │      MongoDB Atlas       │
                  │  (Users + Detections)    │
                  └─────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ | Python 3.9+ | MongoDB Atlas account

### 1. Clone & Install
```bash
git clone https://github.com/himanshu-sharma-dev1/Smart-Traffic-Detection-System.git
cd Smart-Traffic-Detection-System

# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend (.env)**
```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/traffic_detection
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Frontend (.env)**
```bash
REACT_APP_API_URL=http://localhost:8000
```

### 3. Run
```bash
# Terminal 1 - Backend
cd backend && python3 main.py

# Terminal 2 - Frontend
cd frontend && npm start
```

### 4. Open
Navigate to `http://localhost:3000` 🎉

---

## 📁 Project Structure

```
Smart Traffic Detection System/
├── 📂 backend/
│   ├── main.py              # FastAPI + Gemini 2.5 Vision
│   ├── config/              # Database & settings
│   ├── models/              # Pydantic schemas
│   ├── routes/
│   │   ├── auth.py          # JWT + Email verification
│   │   ├── oauth.py         # Google OAuth
│   │   ├── detection.py     # Detection CRUD
│   │   └── websocket.py     # Real-time updates
│   ├── utils/               # JWT, email, exceptions
│   └── tests/               # pytest test suite
│
├── 📂 frontend/
│   ├── public/
│   │   └── models/traffic_signs/  # YOLOv8 TF.js model
│   └── src/
│       ├── components/      # Reusable UI
│       ├── context/         # React Context (Auth)
│       ├── hooks/
│       │   ├── usePWAInstall.js
│       │   ├── useKeyboardShortcuts.js
│       │   └── useVoiceCommands.js
│       ├── utils/
│       │   ├── SimpleTracker.js        # SORT tracking
│       │   ├── TrafficSignDetector.js  # YOLOv8 wrapper
│       │   ├── DetectionMerger.js      # Cross-model NMS
│       │   ├── SpeedEstimator.js       # Speed calculation
│       │   ├── CountingZone.js         # Line-crossing
│       │   ├── LicensePlateDetector.js # OCR
│       │   └── exportPdf.js            # PDF export
│       ├── LiveDetection.js     # Real-time dual-model
│       ├── VideoDetection.js    # Video file processing
│       ├── Dashboard.js         # Analytics
│       ├── Settings.js          # User preferences
│       └── Profile.js           # User profile
│
├── 📂 notebooks/
│   └── train_traffic_signs_yolov8.ipynb  # Colab training
│
└── 📂 tasks/                # Project documentation
    ├── ARCHITECTURE.md
    ├── FEATURE_ROADMAP.md
    └── TESTING_CHECKLIST.md
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, React Bootstrap, Framer Motion, Recharts, TensorFlow.js, Tesseract.js |
| **Backend** | FastAPI, Motor (async MongoDB), Pydantic, python-jose, passlib + bcrypt, slowapi |
| **AI/ML** | COCO-SSD, Custom YOLOv8n (91.5% mAP50), Gemini 2.5 Flash, SORT tracking |
| **Infrastructure** | MongoDB Atlas, PWA + Service Workers, Swagger/ReDoc |

---

## 📖 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account + email verification |
| POST | `/api/auth/login` | ❌ | Login |
| GET | `/api/auth/me` | ✅ | Get profile |
| PUT | `/api/auth/me` | ✅ | Update username |
| PUT | `/api/auth/me/password` | ✅ | Change password |
| DELETE | `/api/auth/me` | ✅ | Delete account |
| GET | `/api/auth/google` | ❌ | Google OAuth initiate |
| POST | `/api/auth/forgot-password` | ❌ | Request password reset |
| POST | `/api/auth/reset-password` | ❌ | Reset with token |
| POST | `/api/auth/verify-email` | ❌ | Verify email token |

### Detection
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/detect` | ❌ | Detect objects (Gemini 2.5 Flash) |
| GET | `/api/detections` | ✅ | Get history (paginated) |
| POST | `/api/detections` | ✅ | Save detection |
| GET | `/api/detections/stats` | ✅ | Get statistics |
| DELETE | `/api/detections/{id}` | ✅ | Delete detection |

**Interactive docs:** `http://localhost:8000/docs` (Swagger) | `http://localhost:8000/redoc`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + H` | Home |
| `Alt + D` | Detection |
| `Alt + L` | Live Detection |
| `Alt + A` | Dashboard |
| `Alt + P` | Profile |
| `Alt + K` | Show shortcuts |
| `Ctrl + /` | Toggle dark mode |

---

## 🎤 Voice Commands

| Command | Action |
|---------|--------|
| "Start detection" | Begin detecting |
| "Stop" | Stop detection |
| "Screenshot" | Capture frame |
| "Enable tracking" | Turn on SORT |
| "Traffic signs" | Toggle YOLOv8 |
| "Fullscreen" | Toggle fullscreen |
| "Help" | Show commands |

---

## 🎓 Resume Highlights

> **Full-Stack AI Application:** "Built production-ready traffic detection system with React 19, FastAPI, and MongoDB Atlas, featuring JWT + OAuth authentication, email verification, and real-time analytics"

> **Custom ML Model:** "Fine-tuned YOLOv8n on Indian Traffic Sign dataset achieving 91.5% mAP50, deployed via TensorFlow.js for real-time browser inference at 16+ FPS"

> **Dual-Model Architecture:** "Implemented frame interlacing to run COCO-SSD and custom YOLOv8 concurrently with cross-model NMS for deduplication"

> **Advanced Features:** "Built voice command interface using Web Speech API, license plate OCR with Tesseract.js, and speed estimation with physics-based calculations"

---

## 🔮 Roadmap

- [ ] Docker containerization
- [ ] GitHub Actions CI/CD
- [ ] Comprehensive test suite (Jest + Playwright)
- [ ] Cloud deployment (AWS/GCP/Railway)
- [ ] Traffic density heatmap
- [ ] Multi-camera dashboard
- [ ] Anomaly detection alerts

---

## 📄 License

MIT License - feel free to use for learning and portfolio.

---

## 👨‍💻 Author

**Himanshu Sharma**

Built with ❤️ as a portfolio project for top tech companies.

---

<p align="center">
  <strong>⭐ Star this repo if you found it helpful!</strong>
</p>
