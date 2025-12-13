# 🚀 Quick Start Guide: Training Your Custom Traffic Sign Model

## Step 1: Download Dataset (5 min)

1. Go to: **https://universe.roboflow.com/datacluster-labs/indian-traffic-sign**
2. Click **"Download"** → Select **"YOLOv8"** format
3. Download as ZIP (~200MB)

## Step 2: Prepare Google Drive (2 min)

1. Open Google Drive
2. Create folder: `My Drive/datasets/`
3. Upload ZIP as: `indian-traffic-signs.zip`

## Step 3: Run Colab Notebook (45-60 min)

1. Open Google Colab: **https://colab.research.google.com/**
2. Upload notebook: `notebooks/train_traffic_signs_yolov8.ipynb`
3. **Enable GPU:** Runtime → Change runtime type → T4 GPU
4. **Run all cells:** Runtime → Run all

## Step 4: Download Trained Model

- Model will auto-download as `indian_traffic_signs_model.zip`
- Also saved to: `My Drive/models/indian_traffic_signs_tfjs/`

## Step 5: Install in Frontend

Extract to:
```
frontend/public/models/traffic_signs/
├── model.json
├── group1-shard1of*.bin
└── class_names.json
```

---

**Estimated Total Time:** ~1 hour

**Expected Results:**
- mAP50: ~85-92%
- Model Size: ~3-5 MB
- Browser Speed: ~50ms per image
