# 🚀 Deployment Guide - Smart Traffic Detection

## ✅ Free Tier Confirmation

| Service | Free Tier | Limit |
|---------|-----------|-------|
| **Vercel** | Hobby Plan | Unlimited deployments, 100GB bandwidth/month |
| **Railway** | Starter Plan | $5 free credit/month (~500 hours) |
| **MongoDB Atlas** | M0 Free | 512MB storage (already using) |

**Total Cost: $0/month** for a portfolio project with moderate traffic.

---

## 📋 Prerequisites

- [x] GitHub account with project pushed
- [x] MongoDB Atlas already configured
- [ ] Vercel account (create below)
- [ ] Railway account (create below)

---

## Part 1: Deploy Frontend to Vercel

### Step 1.1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel to access your GitHub

### Step 1.2: Import Project
1. Click **Add New** → **Project**
2. Find **Smart-Traffic-Detection-System** repo
3. Click **Import**

### Step 1.3: Configure Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Create React App |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `build` |

### Step 1.4: Add Environment Variables

Click **Environment Variables** and add:

```
REACT_APP_API_URL=https://your-railway-backend.up.railway.app
```

(Leave this blank for now, we'll update after deploying backend)

### Step 1.5: Deploy
1. Click **Deploy**
2. Wait 2-3 minutes
3. You'll get a URL like: `https://smart-traffic-xyz.vercel.app`

---

## Part 2: Deploy Backend to Railway

### Step 2.1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click **Login** → **GitHub**
3. Authorize Railway

### Step 2.2: Create New Project
1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Find **Smart-Traffic-Detection-System**
4. Click **Deploy**

### Step 2.3: Configure Service
Railway auto-detects the project. You need to:

1. Click on the deployed service
2. Go to **Settings** tab
3. Set **Root Directory**: `backend`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 2.4: Add Environment Variables

Go to **Variables** tab and add:

```
MONGODB_URL=mongodb+srv://your-connection-string
JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Copy these from your local `.env` file.

### Step 2.5: Get Backend URL
1. Go to **Settings** → **Domains**
2. Click **Generate Domain**
3. You'll get: `https://smart-traffic-backend-xyz.up.railway.app`

---

## Part 3: Connect Frontend to Backend

### Step 3.1: Update Vercel Environment
1. Go to Vercel Dashboard → Your Project
2. **Settings** → **Environment Variables**
3. Update `REACT_APP_API_URL` to your Railway URL:
   ```
   REACT_APP_API_URL=https://your-backend.up.railway.app
   ```

### Step 3.2: Redeploy Frontend
1. Go to **Deployments** tab
2. Click **...** on latest deployment → **Redeploy**

---

## Part 4: Configure CORS (Backend)

Update `backend/main.py` to allow your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",  # Add your Vercel URL
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Push this change to GitHub - Railway will auto-redeploy.

---

## 🧪 Verify Deployment

### Test Checklist
- [ ] Frontend loads at Vercel URL
- [ ] Can see home page with animations
- [ ] Login/Register works
- [ ] Live Detection page loads
- [ ] Camera access works
- [ ] Detection runs in browser

---

## 🔧 Troubleshooting

### "API not reachable"
→ Check Railway backend is running (green status)
→ Verify REACT_APP_API_URL is correct
→ Check CORS includes your Vercel domain

### "Build failed on Vercel"
→ Check `frontend` is set as Root Directory
→ Try `npm run build` locally first

### "Railway deploy stuck"
→ Check Start Command is correct
→ Verify `requirements.txt` exists in `backend/`

---

## 📊 Expected Costs

| Usage Level | Monthly Cost |
|-------------|--------------|
| Demo/Portfolio | **$0** |
| Light Production | **$0** |
| Heavy Use (>500 hrs) | ~$5-10 |

Railway's $5 free credit resets monthly!

---

## 🎉 Final URLs

After deployment, update your README with:

```markdown
## 🌐 Live Demo
- **Frontend:** https://smart-traffic-xyz.vercel.app
- **API Docs:** https://your-backend.up.railway.app/docs
```

---

## Next Steps

1. Copy these URLs to your GitHub README
2. Test all features on the live site
3. Share the link in your resume/portfolio!
