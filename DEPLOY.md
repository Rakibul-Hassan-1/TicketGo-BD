# Deployment Guide

This guide covers setting up CI/CD and deploying TicketGo BD to production.

## GitHub Secrets Setup

Add these secrets to your GitHub repository (`Settings → Secrets and variables → Actions`):

### Required for Build/Testing

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ticketgobd
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### Optional: Development/Staging Values

```
# Server env (override defaults in CI)
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SSLCZ_STORE_ID=your-ssl-store-id
SSLCZ_STORE_PASS=your-ssl-password
BACKEND_URL=https://api.ticketgo-bd.com
FRONTEND_URL=https://ticketgo-bd.com

# Admin seed credentials
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@ticketgo-bd.com
ADMIN_PASSWORD=secure-admin-password
ADMIN_PHONE=01700000000
ADMIN_ROLE=admin

# Client env
NEXT_PUBLIC_API_URL=https://api.ticketgo-bd.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.ticketgo-bd.com

# Backend public URL on Render
BACKEND_URL=https://ticketgo-bd.onrender.com
```

### For Vercel Deployment (Frontend)

```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_SCOPE=<your-vercel-team-slug-or-username>
VERCEL_PROJECT_ID=<your-vercel-project-id>
```

Get these from: https://vercel.com/account/tokens

### For Render Deployment (Backend)

```
RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxxxx?key=xxxxx
```

Get this from: Render Dashboard → Your Service → Deploy → Hook URL

---

## How the CI/CD Pipeline Works

### On Every Push to `main`, `master`, or `develop`

1. **Build Stage** ✅
   - Installs dependencies
   - Creates `.env` files from secrets
   - Builds shared package
   - Builds Express server (TypeScript → JavaScript)
   - Builds Next.js client (with optimization)
   - Uploads artifacts

2. **Test Stage** ✅
   - Runs linter on client
   - Generates pipeline summary

3. **Deploy to Vercel** (Only on `main` branch)
   - Deploys client to production if `VERCEL_TOKEN` is set
   - Skips if secrets not configured

4. **Deploy to Render** (Only on `main` branch)
   - Triggers server rebuild on Render if `RENDER_DEPLOY_HOOK` is set
   - Skips if hook not configured

---

## Step-by-Step Setup

### 1. GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions

**Click "New repository secret"** and add (at minimum):

- `MONGODB_URI` — Your MongoDB Atlas connection string
- `JWT_SECRET` — A random string (use `openssl rand -base64 32`)

### 2. Vercel Setup (Optional - for client deployment)

```bash
# Login to Vercel
npm i -g vercel
vercel login

# Link your project
cd client
vercel link

# Get your token
# Go to https://vercel.com/account/tokens → create new token
```

Add to GitHub Secrets:

- `VERCEL_TOKEN` — Your personal access token
- `VERCEL_SCOPE` — Your Vercel team slug or username, used by the CLI to target the correct project
- `VERCEL_PROJECT_ID` — The exact Vercel project id from `client/.vercel/project.json`
- `VERCEL_PROJECT_NAME` — Optional if your Vercel project name differs from the client package name

Add `BACKEND_URL` on Render as well so ticket links and payment callbacks never fall back to localhost.

### 3. Render Setup (Optional - for server deployment)

1. Create a new Render service:
   - Go to https://render.com
   - New → Web Service
   - Connect your GitHub repo (server folder)
   - Build command: `npm run build`
   - Start command: `npm start`
   - Add all env variables in Render dashboard

2. Get the deploy hook:
   - Service Settings → Deploy Hook
   - Copy the URL

3. Add to GitHub Secrets:
   - `RENDER_DEPLOY_HOOK` — The webhook URL from Render

### 4. MongoDB Atlas Setup

1. Create a free cluster: https://www.mongodb.com/cloud/atlas
2. Create a database user with strong password
3. Add your GitHub Actions IP (or allow all: `0.0.0.0/0` for dev)
4. Copy connection string
5. Add to GitHub Secrets as `MONGODB_URI`

---

## Monitoring Deployments

View workflow runs in GitHub:

- Repository → Actions tab
- Click on any workflow run to see detailed logs
- Check deployment status under "deploy-client" and "deploy-server" jobs

---

## Troubleshooting

**Build fails with "MONGODB_URI not defined"**

- Add `MONGODB_URI` to GitHub Secrets

**Vercel deployment skipped**

- Add `VERCEL_TOKEN` to GitHub Secrets
- Make sure you're on `main` branch
- Add `VERCEL_PROJECT_ID` so the workflow links the exact Vercel project before deploying

**Render deployment doesn't trigger**

- Check `RENDER_DEPLOY_HOOK` is correct
- Verify Render webhook settings

**Client build fails with "border-border class not found"**

- Already fixed! Tailwind config updated to support CSS variables

---

## Local Development Reminders

```bash
# Install all
npm install

# Start dev servers (concurrently)
npm run dev

# Or individually
npm run dev:server  # :5000
npm run dev:client  # :3000

# Build for production
npm run build

# Run server in production
cd server
npm run build
npm start
```

---

## Production Checklist

- [ ] MongoDB Atlas cluster created
- [ ] JWT_SECRET generated and stored
- [ ] Email credentials configured (for booking confirmations)
- [ ] SSLCommerz credentials added (for payments)
- [ ] Vercel/Render accounts created
- [ ] GitHub Secrets configured
- [ ] First deployment tested
- [ ] Admin account seeded in production database
- [ ] SSL certificate configured (auto via Vercel/Render)

---

**Need help?** Check GitHub Actions logs for detailed error messages.
