<div align="center">

<br/>

```
██████╗  █████╗ ██╗    ██╗███╗   ███╗ █████╗ ██████╗
██╔══██╗██╔══██╗██║    ██║████╗ ████║██╔══██╗██╔══██╗
██████╔╝███████║██║ █╗ ██║██╔████╔██║███████║██████╔╝
██╔═══╝ ██╔══██║██║███╗██║██║╚██╔╝██║██╔══██║██╔═══╝
██║     ██║  ██║╚███╔███╔╝██║ ╚═╝ ██║██║  ██║██║
╚═╝     ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  🐾
```

**Real-time community infrastructure for stray cat care & TNR coordination**

*Stray cats already run the internet. PawMap gives them the infrastructure to run the streets too.*

[![Node](https://img.shields.io/badge/Node.js-≥18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![GCP](https://img.shields.io/badge/Deployed_on-GCP_Cloud_Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

</div>

---

## 🗺️ The Problem

Stray cat care is **fragmented by design**. Volunteers work in silos — missing each other, duplicating effort, and losing TNR (Trap-Neuter-Return) windows. Untreated injuries go unreported. Colony sizes explode.

There's no shared view of the street.

---

## ✨ What PawMap Does

PawMap gives caregiver communities a **synchronized, live map** to coordinate stray cat welfare at the neighborhood level.

| Feature | Description |
|---|---|
| 📍 **Live Map Pins** | Report sightings, colonies, TNR sites and adopted cats on a real-time Leaflet map |
| 🔴 **Colony Alerts** | Auto-detects 3+ reports within 200m in 7 days and flags an emerging colony |
| 📸 **AI Photo Tagging** | Groq Vision (`llama-3.2-90b`) auto-tags age, coat, injuries & ear-tip status |
| 🗓️ **TNR Scheduling** | State-durable workflow engine orchestrates TNR timelines end-to-end |
| 🤝 **Volunteer Registry** | Feeders, trappers & fosters can register against any cat profile |
| 🗒️ **Cat Passports** | Full history, notes & volunteer log per cat — a permanent record |
| 🔐 **Magic Link Auth** | Passwordless email login — no friction for volunteers in the field |
| ⚡ **Real-time Sync** | Socket.io pushes map updates to all connected clients instantly |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React 19)                      │
│  Leaflet Map · Sidebar · ReportWizard · CatPassport · Auth   │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP / Socket.io (ws)
┌──────────────────────▼───────────────────────────────────────┐
│                     SERVER (Express + TypeScript)             │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  /api/auth  │  │  /api/cats   │  │  /api/tnr/schedule │   │
│  │  JWT magic  │  │  CRUD + geo  │  │  Workflow Engine   │   │
│  │  link auth  │  │  queries     │  │  (simulated)       │   │
│  └─────────────┘  └──────────────┘  └────────────────────┘   │
│                                                               │
│  ┌──────────┐  ┌────────────┐  ┌─────────┐  ┌───────────┐   │
│  │ Helmet   │  │ Mongo-     │  │  Rate   │  │ Socket.io │   │
│  │ (headers)│  │ Sanitize   │  │ Limiter │  │  (ws hub) │   │
│  └──────────┘  └────────────┘  └─────────┘  └───────────┘   │
└──────────────────────┬───────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────────┐   ┌──────────▼────────────────────────┐
│  MongoDB Atlas     │   │  Groq Vision AI                    │
│  (primary store)   │   │  llama-3.2-90b-vision-preview      │
│                    │   │  ↳ Gemini 3.5 Flash (fallback)     │
│  ↳ JSON file DB    │   └────────────────────────────────────┘
│    (auto-fallback) │
└────────────────────┘
```

**Key technology decisions:**

- **Socket.io** — real-time map pin events broadcast to all connected clients
- **Groq Vision AI** — primary model for automated photo feature extraction; falls back to Gemini 3.5 Flash
- **Simulated Temporal Engine** — state-durable TNR workflow: notifies volunteers → 24h reminder → outcome prompt
- **JSON File Fallback DB** — server works fully offline without MongoDB, seeding demo data automatically
- **GCP Cloud Run** — containerized, auto-scaling, zero cold-start cost at idle

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (or run with built-in JSON fallback — no config needed)

```bash
# 1. Clone
git clone https://github.com/NISHANTH-KONCHADA/pawmap.git
cd pawmap

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section below)

# 3. Install dependencies
npm install

# 4. Start development server (Vite HMR + Express backend on one port)
npm run dev
```

> 💡 **Zero-config mode**: If you skip the MongoDB URI, the server automatically falls back to a local `db.json` file pre-seeded with 6 demo cats. Everything works out of the box.

Open [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Environment Variables

Copy `.env.example` → `.env` and fill in your values:

| Variable | Required | Description | Default |
|---|---|---|---|
| `MONGODB_URI` | No | MongoDB Atlas connection string | JSON file fallback |
| `JWT_SECRET` | Yes | Secret for signing magic-link tokens | — |
| `GROQ_API_KEY` | No | Groq Vision AI key (photo analysis) | Skips AI tagging |
| `GEMINI_API_KEY` | No | Google Gemini fallback (auto-injected in AI Studio) | Skips fallback |
| `CLOUDINARY_URL` | No | Cloudinary media storage URL | — |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name | — |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key | — |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret | — |
| `CLIENT_URL` | No | Frontend origin for CORS + Socket.io | `*` |
| `PORT` | No | Server listen port (GCP injects this) | `3000` |
| `NODE_ENV` | No | `development` or `production` | `development` |
| `SMTP_HOST` | No | SMTP host for email delivery | Console log in dev |
| `SMTP_PORT` | No | SMTP port | — |
| `SMTP_USER` | No | SMTP username | — |
| `SMTP_PASS` | No | SMTP password | — |
| `TEMPORAL_ADDRESS` | No | Real Temporal server address | Simulated engine |

---

## 📦 Scripts

```bash
npm run dev            # Start full-stack dev server (Vite HMR + Express)
npm run build          # Build Vite frontend + ESBuild server bundle
npm run build:client   # Build Vite frontend only  → dist/
npm run build:server   # ESBuild server only        → dist/server.cjs
npm run start          # Run production build (NODE_ENV=production)
npm run clean          # Remove dist/
npm run lint           # TypeScript type-check (no emit)
```

---

## ☁️ GCP Cloud Run Deployment

The project ships with a multi-stage **Dockerfile** and a **Cloud Build CI/CD pipeline** (`cloudbuild.yaml`).

### One-time Setup

```bash
# 1. Enable required GCP APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# 2. Create Artifact Registry repository
gcloud artifacts repositories create pawmap \
  --repository-format=docker \
  --location=asia-south1

# 3. Store secrets in Secret Manager (never bake secrets into images)
gcloud secrets create MONGODB_URI    --data-file=- <<< "your_mongodb_uri"
gcloud secrets create JWT_SECRET     --data-file=- <<< "your_jwt_secret"
gcloud secrets create GROQ_API_KEY   --data-file=- <<< "your_groq_key"
gcloud secrets create CLOUDINARY_URL --data-file=- <<< "your_cloudinary_url"
# ... repeat for remaining secrets

# 4. Grant Cloud Build access to secrets
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Deploy

```bash
# Manual trigger
gcloud builds submit --config=cloudbuild.yaml

# Or connect your GitHub repo to a Cloud Build trigger for auto-deploy on push to main
```

The pipeline:
1. 🔨 Builds the multi-stage Docker image (builder → lean Alpine production image)
2. 📤 Pushes to Artifact Registry with `$COMMIT_SHA` + `latest` tags
3. 🚀 Deploys to Cloud Run — secrets injected from Secret Manager at runtime, `NODE_ENV=production` set automatically

---

## 🔒 Security

Express routes are hardened with:

| Middleware | Purpose |
|---|---|
| **Helmet** | Secure HTTP response headers |
| **Mongo-Sanitize** | Prevents NoSQL injection via request body/query |
| **Rate Limiter** | 20 POST requests per IP per 15 minutes on all write routes |
| **JWT** | Signed, expiring tokens for magic-link authentication |
| **CORS** | Scoped to `CLIENT_URL` in production |

---

## 🧩 Project Structure

```
pawmap/
├── server/
│   ├── db.ts                  # Mongoose schemas + JSON fallback DB + unified DB handler
│   ├── workflowEngine.ts      # Simulated Temporal TNR workflow runner
│   └── routes/
│       ├── auth.ts            # Magic-link generation & JWT verification
│       └── cats.ts            # Cat CRUD, geo-queries, AI photo analysis
├── src/
│   ├── App.tsx                # Root component, auth state, routing
│   ├── components/
│   │   ├── Map.tsx            # Leaflet map with real-time Socket.io pins
│   │   ├── Sidebar.tsx        # Cat list, filters & quick actions
│   │   ├── CatDetail.tsx      # Full cat profile drawer
│   │   ├── CatPassport.tsx    # Printable cat history & volunteer log
│   │   ├── ReportWizard.tsx   # Multi-step sighting report form + AI tagging
│   │   └── FilterBar.tsx      # Status / condition filters
│   ├── lib/                   # Shared utilities
│   └── index.css              # Global styles & design tokens
├── temporal/
│   ├── activities.js          # Temporal activity definitions (email, reminder)
│   ├── tnrWorkflow.js         # TNR workflow definition
│   └── worker.js              # Temporal worker bootstrap
├── server.ts                  # Express + Socket.io + Vite dev middleware entry
├── Dockerfile                 # Multi-stage production image
├── cloudbuild.yaml            # GCP Cloud Build CI/CD pipeline
├── vite.config.ts             # Vite + React + Tailwind config
└── .env.example               # Environment variable reference
```

---

## 🐾 Theme Connection

> *Stray cats already run the internet. PawMap gives them the infrastructure to run the streets too.*

Built for **#HackTheKitty 2026** — a hackathon dedicated to cats on the internet and cats in the wild.

---

<div align="center">

Made with 🐾 by the PawMap team

</div>
