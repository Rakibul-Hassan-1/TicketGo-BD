# TicketGo BD 🚌

### "Book Your Journey Instantly"

Full-stack online bus ticket booking platform for Bangladesh.

---

## Tech Stack

| Layer      | Tech                                                           |
| ---------- | -------------------------------------------------------------- |
| Frontend   | Next.js 14, TypeScript, Tailwind CSS, ShadCN UI, Redux Toolkit |
| Backend    | Node.js, Express.js, TypeScript                                |
| Database   | MongoDB + Mongoose                                             |
| Realtime   | Socket.IO + Redis (seat locking)                               |
| Payment    | SSLCommerz                                                     |
| Deployment | Vercel (client) + Render/Railway (server) + MongoDB Atlas      |

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourname/ticketgo-bd.git
cd ticketgo-bd
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Environment Variables

**Server** — copy `server/.env.example` to `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
REDIS_URL=redis://localhost:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
SSLCZ_STORE_ID=your_store_id
SSLCZ_STORE_PASS=your_store_pass
SSLCZ_IS_LIVE=false
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**Client** — create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Run Development

```bash
# From root:
npm run dev

# Or separately:
npm run dev:server   # Express on :5000
npm run dev:client   # Next.js on :3000
```

---

## Project Structure

```
ticketgo-bd/
├── client/              # Next.js frontend
│   └── src/
│       ├── app/         # Pages (App Router)
│       ├── components/  # UI components
│       ├── features/    # Feature logic
│       ├── hooks/       # Custom hooks
│       ├── lib/         # axios, socket, utils
│       ├── store/       # Redux slices
│       └── types/       # TypeScript types
├── server/              # Express backend
│   └── src/
│       ├── config/      # DB, Redis, Socket
│       ├── controllers/ # Route handlers
│       ├── middleware/  # Auth, validate, error
│       ├── models/      # Mongoose schemas
│       ├── routes/      # API routes
│       ├── services/    # PDF generation
│       ├── utils/       # JWT, email, helpers
│       └── validators/  # Zod schemas
└── shared/              # Shared constants & types
```

---

## API Routes

### Auth

| Method | Route              | Access |
| ------ | ------------------ | ------ |
| POST   | /api/auth/register | Public |
| POST   | /api/auth/login    | Public |
| GET    | /api/auth/me       | User   |
| PATCH  | /api/auth/profile  | User   |

### Trips

| Method | Route                     | Access         |
| ------ | ------------------------- | -------------- |
| GET    | /api/trips/search         | Public         |
| GET    | /api/trips/popular-routes | Public         |
| GET    | /api/trips/:id            | Public         |
| POST   | /api/trips                | Operator/Admin |

### Bookings

| Method | Route                    | Access |
| ------ | ------------------------ | ------ |
| POST   | /api/bookings/lock-seats | User   |
| POST   | /api/bookings            | User   |
| GET    | /api/bookings            | User   |
| PATCH  | /api/bookings/:id/cancel | User   |

### Payment

| Method | Route                 | Access              |
| ------ | --------------------- | ------------------- |
| POST   | /api/payment/initiate | User                |
| POST   | /api/payment/success  | SSLCommerz callback |
| POST   | /api/payment/fail     | SSLCommerz callback |

---

## Features

- ✅ JWT Auth (User / Admin / Operator roles)
- ✅ Bus search by route + date
- ✅ Real-time seat locking (Redis + Socket.IO, 5-min TTL)
- ✅ SSLCommerz payment gateway
- ✅ PDF e-ticket generation + email delivery
- ✅ Admin dashboard (stats, users, bookings)
- ✅ Operator panel (buses, trips, revenue)
- ✅ Mobile-first responsive UI

---

## CI/CD Pipeline

This project uses **GitHub Actions** for automated testing and deployment.

**Pipeline Stages:**

- ✅ **Build**: Installs dependencies, builds all packages
- ✅ **Test**: Runs linters and type checks
- 🚀 **Deploy**: Automatically deploys to Vercel (client) and Render (server) on push to `main`

**Setup:** See [DEPLOY.md](./DEPLOY.md) for detailed GitHub Secrets configuration.

---

## Deployment

### Frontend → Vercel (Automated via CI/CD)

- Push to `main` branch triggers automatic deployment
- Or manually:

```bash
cd client && vercel --prod --force --yes
```

For CI or repeatable production deploys, use `VERCEL_SCOPE` with the team slug or username and force a fresh build so Vercel does not reuse a stale cached output.
If a deployment still points at the wrong production site, also set `VERCEL_PROJECT_ID` so the workflow links the exact project before deploying.

### Backend → Render (Automated via CI/CD)

- Set `RENDER_DEPLOY_HOOK` in GitHub Secrets
- Or manually:

```bash
cd server
npm run build
npm start
```

### Database → MongoDB Atlas

- Free M0 cluster is enough to start
- Connection string format:
  ```
  mongodb+srv://username:password@cluster.mongodb.net/dbname
  ```

**Full deployment guide:** See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions.

# TicketGo-BD
