# Trackly — NGO Event Management

React + TypeScript frontend (Vite) · Python Flask backend · Firebase/Firestore · Supabase storage

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python Flask, Gunicorn |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| Storage | Supabase (avatars, photos) |
| Notifications | FCM |
| Email | Resend |
| Frontend host | Vercel |
| Backend host | Render |

---

## Local Development

### 1. Clone

```bash
git clone https://github.com/Shlok-Dwivedi/trackly.git
cd trackly
```

### 2. Frontend

```bash
npm install
cp .env.example .env          # fill in your Firebase + Supabase keys
npm run dev                   # http://localhost:8080
```

### 3. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in service account + other keys
python app.py                 # http://localhost:5000
```

---

## Environment Variables

### Frontend (`/.env`)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_FLASK_API_URL=https://trackly-backend.onrender.com
```

### Backend (`/backend/.env`)

```
FLASK_ENV=production
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}   # full JSON, one line
FIREBASE_PROJECT_ID=your-project-id
FRONTEND_ORIGIN=https://your-app.vercel.app
VERCEL_FRONTEND_ORIGIN=https://your-app.vercel.app
GOOGLE_CALENDAR_ID=
DEFAULT_TIMEZONE=Asia/Kolkata
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

---

## Deploying to GitHub + Vercel + Render

### Step 1 — Push to GitHub

```bash
# In the project root
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/trackly.git
git push -u origin main
```

### Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml` — confirm settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
   - **Runtime:** Python 3
4. Add **Environment Variables** in the Render dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_JSON` → paste your entire service account JSON as one line
   - `FIREBASE_PROJECT_ID` → your Firebase project ID
   - `FRONTEND_ORIGIN` → your Vercel URL (fill in after step 3)
   - `VERCEL_FRONTEND_ORIGIN` → same as above
   - `RESEND_API_KEY`, `RESEND_FROM_EMAIL` → if using email
   - `GOOGLE_CALENDAR_ID`, `DEFAULT_TIMEZONE` → if using Google Calendar
5. Deploy — note your Render URL, e.g. `https://trackly-backend.onrender.com`

### Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Vercel auto-detects Vite. Confirm:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variables** (Settings → Environment Variables):
   ```
   VITE_FIREBASE_API_KEY         = ...
   VITE_FIREBASE_AUTH_DOMAIN     = ...
   VITE_FIREBASE_PROJECT_ID      = ...
   VITE_FIREBASE_STORAGE_BUCKET  = ...
   VITE_FIREBASE_MESSAGING_SENDER_ID = ...
   VITE_FIREBASE_APP_ID          = ...
   VITE_SUPABASE_URL             = ...
   VITE_SUPABASE_ANON_KEY        = ...
   VITE_GOOGLE_CLIENT_ID         = ...
   VITE_FLASK_API_URL            = https://trackly-backend.onrender.com
   ```
5. Deploy — note your Vercel URL, e.g. `https://trackly.vercel.app`

### Step 4 — Update CORS on Render

Go back to Render → your backend service → Environment:
- Set `FRONTEND_ORIGIN` = `https://trackly.vercel.app`
- Set `VERCEL_FRONTEND_ORIGIN` = `https://trackly.vercel.app`
- Trigger a redeploy

### Step 5 — Firebase Console

Add your Vercel domain to Firebase Auth:
- Firebase Console → Authentication → Settings → **Authorized domains**
- Add `trackly.vercel.app`

---

## Firestore Security Rules (add to Firebase Console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    function isAdmin() { return isAuth() && request.auth.token.role == 'admin'; }

    match /users/{uid} {
      allow read: if isAuth();
      allow write: if request.auth.uid == uid || isAdmin();
    }
    match /events/{id} {
      allow read: if isAuth();
      allow write: if isAdmin() || request.auth.token.role == 'staff';
    }
    match /departments/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }
    match /eventCategories/{id} {
      allow read: if isAuth();
      allow write: if isAdmin();
    }
    match /activityLogs/{id} {
      allow read: if isAuth();
      allow create: if isAuth();
      allow update, delete: if isAdmin();
    }
  }
}
```

---

## User Roles

| Role | Can do |
|------|--------|
| `admin` | Everything — manage users, roles, departments, categories, delete events |
| `staff` | Create/edit events, manage attendees |
| `volunteer` | View events, join open enrollment events |
| `viewer` | Read-only |

Set the first admin using `backend/bootstrap_admin.py`:
```bash
cd backend
python bootstrap_admin.py <user-uid>
```
