# Planit — Event Planning & Vendor Marketplace Platform

[![MERN](https://img.shields.io/badge/Stack-MERN-9AB17A?style=flat)](./README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-C3CC9B?style=flat)](./LICENSE)
[![Node](https://img.shields.io/badge/Node-18%2B-2C687B?style=flat)](./backend/package.json)
[![React](https://img.shields.io/badge/React-19-2C687B?style=flat)](./frontend/package.json)

**Repository:** [github.com/Rufaida-Faruque/Planit](https://github.com/Rufaida-Faruque/Planit)

Full-stack event planning marketplace where clients hire verified vendors, manage events end-to-end, and run public guest flows (signup, stalls, photo sharing) with real-time notifications and simulated payments.


---

## Quick start (recruiters & reviewers)

```bash
# 1. Clone
git clone https://github.com/Rufaida-Faruque/Planit.git
cd Planit

# 2. Backend
cd backend
cp .env.example .env    # then edit MONGO_URI, JWT_SECRET, EMAIL_*
npm install
npm run dev

# 3. Frontend (new terminal)
cd ../frontend
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev
```

| Role | Demo login |
|------|------------|
| Admin | `admin@planit.com` / `admin123` (change in production) |
| Client / Vendor | Register at `/register` |

**Optional for your portfolio:** add 3–5 screenshots under `docs/screenshots/` and link them here once you capture the UI tonight.

---

Planit is a full-stack **MERN** application for planning events, discovering and hiring vendors, managing guest flows (public signup, private invitations, stalls, photo sharing), collaborating between vendors, chatting, notifications, simulated payments, and admin moderation.

This document explains **what the platform does**, **how it is structured**, **how to run it**, and **how each feature executes** from the browser to the database.

---

## Table of contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [User roles](#user-roles)
4. [Project structure](#project-structure)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [Architecture & request flow](#architecture--request-flow)
8. [Authentication & authorization](#authentication--authorization)
9. [Real-time updates (SSE)](#real-time-updates-sse)
10. [File uploads](#file-uploads)
11. [Email system](#email-system)
12. [Database models](#database-models)
13. [API routes reference](#api-routes-reference)
14. [Frontend routes & dashboards](#frontend-routes--dashboards)
15. [Feature-by-feature execution guide](#feature-by-feature-execution-guide)
16. [Tracing frontend → backend](#tracing-frontend--backend)
17. [Simulated payments & settlement](#simulated-payments--settlement)
18. [Viva / demo checklist](#viva--demo-checklist)
19. [Security notes](#security-notes)
20. [Known configuration points](#known-configuration-points)

---

## Overview

Planit connects three main actor types:

| Actor | Purpose |
|--------|---------|
| **Client** | Creates events, hires vendors, manages budget/timeline/checklists, invites guests, runs photo sharing, pays settlement (simulated). |
| **Vendor** | Builds a portfolio (category-specific services), gets verified, receives booking requests, collaborates with other vendors, chats with clients, receives wallet payouts. |
| **Admin** | Moderates verification, vendor removal, event deletion/closure, help requests, and releases vendor payouts from the platform wallet. |

**Guests** (no full account) interact via **public routes**: event signup, stall booking, OTP verification, and tokenized photo upload links.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| **Frontend** | React 19, Vite, React Router, Axios, Tailwind CSS (v4 via `@import "tailwindcss"`) |
| **Backend** | Node.js, Express 5, Mongoose (MongoDB) |
| **Auth** | JWT (`jsonwebtoken`), `bcryptjs` password hashing |
| **Uploads** | `multer` (portfolio images, verification docs, posters, guest photos) |
| **Email** | `nodemailer` (OTP, invitations, QR reminders, photo share links, ZIP ready emails) |
| **Real-time** | **SSE** (Server-Sent Events) for notifications and chat |
| **Archives** | `archiver` (guest photo ZIP) |
| **PDF** | `pdfkit` (client event invoice, vendor/admin daily invoices) |

---

## User roles

| Role | Stored in | Access |
|------|-----------|--------|
| `client` | `User.role` | Client dashboard, event management, browse, chat (with accepted vendors), settlement pay. |
| `vendor` | `User.role` | Vendor dashboard, portfolio, verification, bookings, collabs, wallet, chat. |
| `admin` | Hard-coded admin login in `auth.controller.js` | Admin dashboard, verification approval, payouts, moderation queues. |
| `guest` | Can be assigned on public signup | Limited navigation (e.g. redirected to `/home`). |

Registration **blocks** `role: "admin"`. Admin signs in with a fixed email (see [Environment variables](#environment-variables)).

---

## Project structure

```
planit/
├── backend/
│   ├── index.js                 # Express app entry, route mounting, static /uploads
│   ├── config.js                # PORT, MONGO_URI, JWT, FRONTEND_URL (use .env in production)
│   ├── config/db.js             # MongoDB connection
│   ├── controllers/             # Business logic per domain
│   ├── middleware/              # JWT protect, multer upload configs
│   ├── models/                  # Mongoose schemas
│   ├── routes/                  # Express routers → controllers
│   └── utils/                   # mailer, settlementCalc, messageBus, notificationBus
├── frontend/
│   ├── src/
│   │   ├── api/axios.js         # Axios instance + JWT interceptor
│   │   ├── App.jsx              # React Router routes
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/               # Screens (client, vendor, admin, public)
│   │   ├── components/          # Reusable UI (Navbar, checklists, service editors)
│   │   ├── constants/           # Checklist templates, help topics
│   │   └── index.css            # Global theme & layout
│   └── vite.config.js
├── uploads/                     # Created at runtime (images, docs, guest photos)
├── package.json                 # Root (minimal); real deps in backend/ & frontend/
└── README.md                    # This file
```

---

## Getting started

### Prerequisites

- **Node.js** 18+ recommended  
- **MongoDB** (local or Atlas)  
- **SMTP credentials** for email features (Gmail app password or other provider)

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both files (see [Environment variables](#environment-variables)). **Never commit** real `.env` files.

### 3. Start backend

```bash
cd backend
npm run dev
# Server default: http://localhost:5000
```

### 4. Start frontend

API URL is read from `frontend/.env` → `VITE_API_BASE_URL` (used by `frontend/src/config/api.js` for axios, images, and SSE).

### 5. Open the app

```bash
cd frontend
npm run dev
# Default: http://localhost:5173
```

### 6. Default admin login (demo)

Configured in backend (`ADMIN_EMAIL` / hashed password in `config.js` or env). Typical demo credentials are documented in your viva materials — use the values your team set during development.

---

## Environment variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/planit
JWT_SECRET=your_long_random_secret
FRONTEND_URL=http://localhost:5173

# Email (nodemailer)
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_app_password
```

| Variable | Purpose |
|----------|---------|
| `PORT` | Express listen port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs and verifies JWT tokens |
| `FRONTEND_URL` | Used in email links (photo share, public pages); CORS allowlist |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP for OTP, invitations, photo share, ZIP notifications |

> **Important:** Move any hardcoded secrets out of `backend/config.js` into `.env` before publishing to GitHub.

---

## Architecture & request flow

High-level flow for any authenticated action:

```
Browser (React page)
  → axios (frontend/src/api/axios.js)
    → adds Authorization: Bearer <token> from localStorage
  → Express route (backend/routes/*.route.js)
    → protect middleware (JWT verify) [if private]
  → Controller (backend/controllers/*.controller.js)
    → Mongoose Model (backend/models/*.model.js)
    → MongoDB
  ← JSON response
  ← React state update / UI render
```

**Public flows** skip JWT and use `backend/routes/public.route.js` instead.

**Static files:** Uploaded images are served at `GET /uploads/...` (mounted in `backend/index.js`).

---

## Authentication & authorization

### Register (`POST /api/auth/register`)

**Files:** `Register.jsx` → `auth.route.js` → `auth.controller.js` → `user.model.js`

1. User submits name, password, role (`client` or `vendor`), and **either email OR phone** (XOR rule).
2. Server rejects `role: "admin"`.
3. Password hashed with `bcrypt` (10 rounds).
4. User document created; JWT returned (`{ id, role }`, 7-day expiry).
5. Frontend stores `token` and `user` in `localStorage`, redirects by role.

### Login (`POST /api/auth/login`)

**Files:** `Login.jsx` → `auth.controller.js`

1. User sends `identifier` (email or phone) + `password`.
2. Special branch: admin email compares against configured admin hash.
3. Otherwise `User.findOne` by email or phone; `bcrypt.compare`.
4. Returns JWT + user object; Navbar listens to `storage` event for instant update.

### Logout

**Files:** `Navbar.jsx`, `AuthContext.jsx` (optional)

- Removes `token` and `user` from `localStorage`.
- No server-side session store (stateless JWT).

### Forgot password (OTP)

**Files:** `ForgotPassword.jsx` → `sendOtp`, `verifyOtp`, `resetPassword` → `mailer.sendOtpEmail`

1. **Send OTP:** User provides email → server generates OTP + expiry on user document → email sent.
2. **Verify OTP:** User submits OTP → server checks match and expiry.
3. **Reset password:** New password hashed and saved; OTP cleared.

### Middleware: `protect`

**File:** `backend/middleware/protect.js`

- Reads `Authorization: Bearer <token>`.
- `jwt.verify` → attaches `req.user = { id, role }`.
- Used on nearly all private API routes.

Controllers additionally check **ownership** (e.g. `event.clientId === req.user.id`) and **role** (admin-only endpoints).

---

## Real-time updates (SSE)

Planit uses **Server-Sent Events** (one-way server → browser), not WebSockets.

### Notifications stream

- **Endpoint:** `GET /api/notifications/stream?token=<JWT>`
- **Files:** `notification.controller.js`, `notificationBus.js`, `ClientDashboard.jsx` / `VendorDashboard.jsx`
- **How it works:**
  1. Browser opens `EventSource` with JWT in query string.
  2. Server verifies token, sets `text/event-stream` headers.
  3. When a notification is created, controller emits on `notificationBus`.
  4. Matching `userId` receives `event: notification` → frontend refetches notification list.

### Chat stream

- **Endpoint:** `GET /api/messages/stream?token=<JWT>&eventId=...&otherUserId=...`
- **Files:** `message.controller.js`, `messageBus.js`, `Messages.jsx` (client/vendor)
- **How it works:** Same pattern; new messages emit on bus → client appends to chat UI.

**Why SSE?** Simpler than WebSockets for “server pushes update, client refetches or appends” patterns; works over HTTP/1.1 with standard Express.

---

## File uploads

| Use case | Middleware | Route | Storage path |
|----------|------------|-------|----------------|
| General vendor images | `upload.middleware.js` | `POST /api/upload` | `uploads/<vendorId>/` |
| Event poster banner | `posterBannerUpload.middleware.js` | `POST /api/events/:id/poster/banner` | `uploads/events/<eventId>/poster/` |
| Verification documents | multer in `verification.route.js` | `POST /api/verification/request` | `uploads/` |
| Guest photos (public) | `guestPhotoUpload.middleware.js` | `POST /api/public/:eventId/photo-share/:token/upload` | `uploads/events/<eventId>/guest-photos/` |

After upload, API returns a **URL path** (e.g. `/uploads/...`) stored on models and rendered by the frontend as `<img src={`http://localhost:5000${url}`} />` (or relative to API host).

---

## Email system

**File:** `backend/utils/mailer.js` (uses nodemailer)

| Function | Triggered by |
|----------|----------------|
| `sendOtpEmail` | Forgot password, public signup OTP, stall booking OTP |
| `sendSignupConfirmationEmail` | Public event signup verified |
| `sendQrReminderEmail` | Client sends QR reminders to attendees |
| `sendInvitationCardEmail` | Private invitation send |
| `sendGuestPhotoShareEmail` | Photo share started / resent |
| `sendPhotoZipEmail` / `sendPhotoZipReadyNoAttachmentEmail` | ZIP email to client (size limits apply) |

Emails often include links built with `FRONTEND_URL` (e.g. `/share-photos/:eventId/:token`).

---

## Database models

| Model | Purpose |
|-------|---------|
| `User` | Accounts, OTP fields, verificationStatus, starredVendors, accountBalance |
| `Portfolio` | Vendor services by category (venue, catering, photography, decoration + photobooth) |
| `Verification` | Vendor KYC/trade license submission |
| `Event` | Core event document: vendors, timeline, budget, poster, invitation card, checklist, stalls, guest photos |
| `Attendee` | Public signup guests (OTP, QR, check-in) |
| `StallBooking` | Public stall reservations |
| `Message` | Chat messages per event + sender/receiver |
| `Notification` | In-app notifications |
| `HelpRequest` | Client questions + admin replies |
| `VendorReview` | Post-closure ratings |
| `CollabProposal` / `CollabPackage` | Vendor collaboration workflow |
| `LedgerEntry` | Simulated money movement audit |
| `PendingVendorPayout` | Amounts waiting for admin release |
| `EventClosureRequest` | Client requests to close event |
| `EventDeletionRequest` | Client requests to delete event |
| `VendorRemovalRequest` | Client requests to remove vendor from event |

---

## API routes reference

Base URL: `http://<host>:5000/api` (unless noted).

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register client/vendor |
| POST | `/login` | No | Login |
| POST | `/send-otp` | No | Password reset OTP |
| POST | `/verify-otp` | No | Verify OTP |
| POST | `/reset-password` | No | Set new password |

### Portfolio — `/api/portfolio`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Vendor | Create/update portfolio |
| GET | `/me` | Vendor | Own portfolio |
| DELETE | `/` | Vendor | Soft-delete / unpublish |
| PATCH | `/restore` | Vendor | Restore portfolio |
| PATCH | `/availability` | Vendor | Update availability calendar |
| GET | `/browse` | No | List vendors for discovery |
| GET | `/:vendorId` | No | Public vendor portfolio |

### Verification — `/api/verification`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/request` | Vendor | Submit docs (multipart) |
| GET | `/me` | Vendor | Own status |
| GET | `/all` | Admin | All requests |
| PATCH | `/approve/:id` | Admin | Approve |
| PATCH | `/reject/:id` | Admin | Reject |
| PATCH | `/expire/:id` | Admin | Expire |

### User — `/api/user`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/star/:vendorId` | Client | Toggle starred vendor |
| GET | `/starred` | Client | List starred |

### Events — `/api/events`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Client | Create event |
| GET | `/` | Client | My events |
| GET | `/:id` | Client/Vendor/Admin | Event details |
| PATCH | `/:id` | Client | Update event (info, budget, invitation card, checklist, stalls, etc.) |
| POST | `/:id/vendors/request` | Client | Request vendor for event |
| POST | `/:id/vendors` | Client | Add vendor directly |
| POST | `/:id/vendors/:vendorId/remove-request` | Client | Request removal |
| POST | `/:id/notes` | Client | Add planning note |
| GET | `/:id/attendees` | Client | List attendees |
| POST | `/:id/attendees/check-in` | Client | Check in guest |
| POST | `/:id/attendees/send-reminders` | Client | Email QR reminders |
| POST | `/:id/invitations/send` | Client | Email private invitations |
| POST | `/:id/poster/banner` | Client | Upload poster image |
| POST | `/:id/photo-share/start` | Client | Start guest photo sharing |
| POST | `/:id/photo-share/resend-emails` | Client | Resend share links |
| GET | `/:id/photo-share/zip` | Client | Download ZIP |
| POST | `/:id/photo-share/email-zip` | Client | Email ZIP to client |
| GET | `/:id/settlement` | Client | Settlement breakdown |
| POST | `/:id/settlement/pay` | Client | Record simulated payment |
| POST | `/:id/vendor-reviews` | Client | Submit review |
| POST | `/:id/closure-request` | Client | Request event closure |
| POST | `/:id/delete-request` | Client | Request deletion |
| POST | `/:id/collabs/:packageId/select` | Client | Attach collab package |
| GET | `/:id/stall-bookings` | Client | Stall bookings list |
| GET | `/vendor/my-events` | Vendor | Vendor’s events |
| GET | `/vendor/:id` | Vendor | Single event workspace data |
| PATCH | `/vendor/:id/respond` | Vendor | Accept/reject request |
| PATCH | `/vendor/:id/checklist` | Vendor | Vendor checklist item |
| GET | `/admin/dashboard` | Admin | Aggregated dashboard |
| GET/PATCH | `/admin/*-requests` | Admin | Moderation queues |

### Public — `/api/public` (no JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/:eventId` | Public event poster/info |
| POST | `/:eventId/signup/send-otp` | Signup OTP |
| POST | `/:eventId/signup/verify` | Complete signup |
| GET | `/:eventId/stalls/info` | Stall layout/info |
| POST | `/:eventId/stalls/send-otp` | Stall booking OTP |
| POST | `/:eventId/stalls/verify` | Confirm stall |
| GET | `/:eventId/photo-share/:token` | Validate share link |
| POST | `/:eventId/photo-share/:token/upload` | Guest upload photo |

### Messages — `/api/messages`

| GET | `/stream` | SSE chat |
| GET | `/rooms` | Chat room list |
| GET | `/contacts` | Eligible contacts |
| GET | `/` | Message history (query: eventId, otherUserId) |
| POST | `/` | Send message |

### Notifications — `/api/notifications`

| GET | `/stream` | SSE notifications |
| GET | `/` | List notifications |
| PATCH | `/read-all` | Mark all read |
| PATCH | `/:id/read` | Mark one read |

### Help — `/api/help`

| POST | `/questions` | Client submit |
| GET | `/my` | Client history |
| GET | `/admin` | Admin inbox |
| PATCH | `/admin/:id` | Admin reply |

### Wallet — `/api/wallet`

| GET | `/admin/balance` | Admin platform balance view |
| POST | `/admin/release-vendor-payout/:id` | Release one payout |
| POST | `/admin/release-all-for-event/:eventId` | Release all for event |
| GET | `/vendor/balance` | Vendor wallet balance |

### Collabs — `/api/collabs`

| GET | `/browse` | Client browse packages |
| GET | `/candidates` | Vendor find partners |
| GET/POST | `/proposals` | List/create proposals |
| POST | `/proposals/:id/respond` | Accept/decline |
| POST | `/proposals/:id/confirm` | Confirm package |
| GET | `/my-packages` | Vendor packages |
| POST | `/packages/:id/retire` | Retire package |

### Invoices — `/api/invoices`

| GET | `/client/event/:eventId` | Client PDF |
| GET | `/vendor/daily` | Vendor PDF |
| GET | `/admin/daily` | Admin PDF |

### Upload — `/api/upload`

| POST | `/` | Single image upload (authenticated) |

---

## Frontend routes & dashboards

**Router:** `frontend/src/App.jsx`

| Path | Page | Role |
|------|------|------|
| `/` | Landing | Public |
| `/login`, `/register`, `/forgot-password` | Auth | Public |
| `/home` | Home + Browse | Public / guest |
| `/client` | ClientDashboard | Client |
| `/vendor` | VendorDashboard | Vendor |
| `/vendor/events/:id` | VendorEventWorkspace | Vendor |
| `/admin` | AdminDashboard | Admin |
| `/vendor/:id` | VendorPage | Public profile |
| `/public/:eventId` | PublicEvent | Public signup |
| `/public/:eventId/verify` | VerifyOTP | Public |
| `/public/:eventId/stalls` | PublicStallBooking | Public |
| `/share-photos/:eventId/:token` | GuestPhotoShare | Public (token) |

### Client dashboard tabs (`ClientDashboard.jsx`)

| Tab | Component | Main APIs |
|-----|-----------|-----------|
| Overview | `client/Overview.jsx` | Events summary |
| Events | `client/Events.jsx` | `GET/POST /events` |
| Event details | `client/EventDetails.jsx` | Full event CRUD + features |
| Browse | `client/Browse.jsx` | `GET /portfolio/browse` |
| Starred | `client/Starred.jsx` | `GET /user/starred` |
| Messages | `client/Messages.jsx` | `/messages` + SSE |
| Help | `HelpAssistant.jsx` | `/help` |

### Vendor dashboard tabs (`VendorDashboard.jsx`)

Overview, Portfolio, Services, Bookings, Messages, Verification, Wallet, Collabs.

### Admin dashboard tabs (`AdminDashboard.jsx`)

Overview, Vendors, Clients, Events, Payments (wallet), Verification, Vendor removal, Help, Event closure.

---

## Feature-by-feature execution guide

Below is how each major capability runs end-to-end. Use this for **viva demonstrations**.

---

### 1. Register with email

1. **UI:** `Register.jsx` — user picks email method, fills form.  
2. **API:** `POST /api/auth/register` with `{ name, email, password, role }`.  
3. **Logic:** `auth.controller.js` — XOR check (email only, no phone), hash password, `User.create`.  
4. **Response:** JWT + user → `localStorage` → redirect to `/client` or `/vendor`.

---

### 2. Login

1. **UI:** `Login.jsx` — `identifier` + password.  
2. **API:** `POST /api/auth/login`.  
3. **Logic:** Find user by email/phone OR admin branch; `bcrypt.compare`; `jwt.sign`.  
4. **UI:** Role-based `navigate()` to correct dashboard.

---

### 3. Forgot password (OTP + nodemailer)

1. **UI:** `ForgotPassword.jsx` — multi-step (email → OTP → new password).  
2. **APIs:** `/send-otp` → `/verify-otp` → `/reset-password`.  
3. **Logic:** OTP stored on `User` with expiry; `sendOtpEmail` from `mailer.js`.  
4. **Data:** `user.otp`, `user.otp_expiry`, then `password_hash` updated.

---

### 4. Register with phone number

Same as email registration, but body uses `phone` instead of `email`. Server enforces **only one** of email or phone.

---

### 5. Logout

1. **UI:** `Navbar.jsx` clears `localStorage`.  
2. **No API call** — JWT is stateless; client discards token.

---

### 6. Portfolio (vendor services + multer)

**Where vendor offerings are stored:** `Portfolio` model — category-specific nested fields:

- `venueServices.halls` — halls, hourly/flat pricing  
- `cateringServices` — packages, menu items  
- `photographyServices` — hour-based packages  
- `decorationServices` — packages, single items, **`photobooth`** (`enabled`, `note`)

**Flow:**

1. **UI:** `vendor/Portfolio.jsx`, `Services.jsx`, `VendorServiceCatalogEditor.jsx`.  
2. **Save:** `POST /api/portfolio` with JSON body (and image URLs from upload step).  
3. **Images:** `POST /api/upload` with `multipart/form-data` field `image` → returns `/uploads/...` URL.  
4. **Browse:** `GET /api/portfolio/browse` (clients on `Browse.jsx` / `Home.jsx`).  
5. **Public view:** `GET /api/portfolio/:vendorId` → `VendorPage.jsx`.

---

### 7. Verification

1. **UI:** `vendor/Verification.jsx` — form + file inputs.  
2. **API:** `POST /api/verification/request` with `upload.array("files", 5)`.  
3. **Model:** `Verification` — status `pending` → admin `approve` / `reject` / `expire`.  
4. **Admin UI:** `admin/Verification.jsx`.  
5. **Effect:** `User.verificationStatus` updated; browse filters favor verified vendors.

---

### 8. Dashboards

| Dashboard | Entry | Data source |
|-----------|-------|-------------|
| Client | `/client` | Tabs load events, notifications SSE, etc. |
| Vendor | `/vendor` | Bookings, portfolio, wallet, collabs |
| Admin | `/admin` | `GET /api/events/admin/dashboard` |

Notifications: `EventSource` → `/api/notifications/stream?token=...` → refresh list on `notification` event.

---

### 9. Stalls (public stall marketplace)

**Enabled on event:** `stallsEnabled`, `stallCount`, `stallLayoutImage`, `stallBookingOpen` (private events can expose stalls when configured).

**Flow:**

1. **UI:** `PublicStallBooking.jsx` at `/public/:eventId/stalls`.  
2. **API:** `GET .../stalls/info` → pick stall → `POST .../stalls/send-otp` → `POST .../stalls/verify`.  
3. **Controller:** `stallBooking.controller.js` — OTP, optional MongoDB transaction, unique indexes on `(eventId, stallNumber)` and verified `(eventId, email)`.  
4. **Client view:** `EventDetails.jsx` → `GET /api/events/:id/stall-bookings`.

---

### 10. Catering vendor

Portfolio `category: "catering"` with `cateringServices.packages` and `menuItems`. Client selects services in `ServiceSelectionPanel.jsx` when hiring; stored on `event.vendors[].serviceSelection`.

---

### 11. Photography + venue vendor

- **Photography:** `photographyServices.packages` (hourly rates, minimum hours).  
- **Venue:** `venueServices.halls` with session/hour pricing and availability.  
- **Availability:** `PATCH /api/portfolio/availability` + `vendorAvailabilityBookingCounts.js` logic for conflict awareness.

---

### 12. Decoration + custom photobooth

- **Decoration packages/items:** `decorationServices.packages`, `singleItems`.  
- **Photobooth:** `decorationServices.photobooth.enabled` and `note` — vendor toggles in catalog editor; client sees option when selecting decoration vendor.

---

### 13. Event creating and management

**Create:**

1. `client/Events.jsx` → `POST /api/events` (`createEvent`).  
2. Event created with defaults: status `draft`, empty vendors/timeline, optional default checklist from `defaultClientChecklist.js`.

**Manage (`EventDetails.jsx`):**

- `PATCH /api/events/:id` — title, date, budget, `budgetExtras`, `clientChecklist`, `invitationCard`, `privateGuestList`, stall settings, poster fields, etc.  
- Vendor requests: `POST /:id/vendors/request`.  
- Timeline entries pushed on major actions (photo share, closure, etc.).  
- Notes: `POST /:id/notes`.  
- Admin moderation: deletion/closure/removal request endpoints.

---

### 14. Event timeline + notifications

**Timeline:** Array on `Event.timeline` — `{ type, text, by, createdAt }`. Appended in controllers when actions occur.

**Notifications:**

1. Controller creates `Notification` document.  
2. Emits `notificationBus.emit("notification", { userId, ... })`.  
3. SSE clients receive event → UI refetches `GET /api/notifications`.

---

### 15. Public signup

1. **UI:** `PublicEvent.jsx` — shows poster from `GET /api/public/:eventId`.  
2. Guest enters details → `POST .../signup/send-otp`.  
3. **UI:** `VerifyOTP.jsx` → `POST .../signup/verify`.  
4. **Logic:** `publicEvent.controller.js` — creates/updates `Attendee`, sends confirmation email, may issue QR-related data.  
5. **Requires:** `event.isPublic` and poster/signup settings.

---

### 16. Private guest list invitation

1. **UI:** `EventDetails.jsx` — Guest list tab stores emails in `privateGuestList` via `PATCH /events/:id`.  
2. **Invitation designer:** `invitationCard` object (colors, fonts, pattern, title/body placement, `imageData` base64).  
3. **Send:** `POST /api/events/:id/invitations/send` → `sendPrivateInvitations` → `sendInvitationCardEmail` per guest.  
4. **Custom card:** Frontend composes preview; server emails image + message.

---

### 17. Budget

- **Fields:** `event.budget`, `budgetUsed`, `budgetExtras[]` (label + amount).  
- **Updates:** `PATCH /events/:id` from budget UI in `EventDetails.jsx`.  
- **Settlement:** Vendor `offerAmount` on accepted vendors feeds into settlement calculator.

---

### 18. Browse vendors

1. **UI:** `Browse.jsx`, `Home.jsx`.  
2. **API:** `GET /api/portfolio/browse` with query filters (category, location, etc.).  
3. **Controller:** Joins verification status, reviews, availability metadata.  
4. **Star:** `PATCH /api/user/star/:vendorId`.

---

### 19. Chat

**Rules:** Only **client ↔ accepted vendor** for the same event (`canAccessEventChat` in `message.controller.js`).

**Flow:**

1. List rooms: `GET /api/messages/rooms`.  
2. Contacts: `GET /api/messages/contacts`.  
3. History: `GET /api/messages?eventId=&otherUserId=`.  
4. Send: `POST /api/messages` → saves `Message` → `messageBus.emit`.  
5. Live: `EventSource` on `/api/messages/stream` with token + eventId + otherUserId.

---

### 20. Collab (vendor packages)

**Lifecycle:**

1. Vendor A finds candidates: `GET /api/collabs/candidates`.  
2. Creates proposal: `POST /api/collabs/proposals`.  
3. Vendor B responds: `POST /api/collabs/proposals/:id/respond`.  
4. Confirm package: `POST /api/collabs/proposals/:id/confirm` → `CollabPackage`.  
5. Client browses: `GET /api/collabs/browse` → selects for event: `POST /api/events/:id/collabs/:packageId/select`.  
6. Retire: `POST /api/collabs/packages/:id/retire`.

**UI:** `vendor/Collabs.jsx`, parts of `EventDetails.jsx` / browse flows.

---

### 21. Checklist

**Client checklist:** `event.clientChecklist[]` — text, done, notes, sortOrder. UI: `EventPlanningChecklist.jsx`. Templates in `constants/eventChecklistTemplates.js`.

**Vendor checklist:** Per `event.vendors[].checklist` — updated via `PATCH /api/events/vendor/:id/checklist` from vendor workspace.

---

### 22. Helpbot / support

1. **UI:** `HelpAssistant.jsx` — FAQ topics from `constants/helpTopics.js` + custom question.  
2. **API:** `POST /api/help/questions` → `HelpRequest` status `open`.  
3. **Admin:** `admin/HelpRequests.jsx` → `PATCH /api/help/admin/:id` with reply → notification to client.

---

### 23. Photo sharing

**Private events only** (`photoShare.controller.js` rejects public events).

**Start:**

1. Client adds emails to `privateGuestList`.  
2. `POST /api/events/:id/photo-share/start` — generates `photoShareToken`, sets `photoShareActive`, emails guests link: `/share-photos/:eventId/:token`.

**Guest upload:**

1. **UI:** `GuestPhotoShare.jsx`.  
2. **API:** `GET /api/public/:eventId/photo-share/:token` then `POST .../upload` with multer field `photo`.  
3. **Storage:** File path appended to `event.guestPhotos[]`.

**Organizer download/email:**

- `GET /api/events/:id/photo-share/zip` — `archiver` streams ZIP.  
- `POST /api/events/:id/photo-share/email-zip` — attaches or sends “ready” email if too large.

---

### 24. Review and rating

1. **After closure rules** (event `postClosureLocked` / completed status).  
2. **API:** `POST /api/events/:id/vendor-reviews` — `vendorReview.controller.js`.  
3. **Model:** `VendorReview` linked to vendor + event.  
4. **UI:** Review section in `EventDetails.jsx`.

---

### 25. Payment (simulated money)

**Not a real payment gateway** — balances and ledger simulate platform economics.

**Settlement calculation** (`utils/settlementCalc.js`):

- Client pays: vendor offers + **5% client markup**.  
- Vendor receives: offer − **5% vendor commission**.  
- Admin commission: difference.

**Client pays settlement:**

1. `GET /api/events/:id/settlement` — breakdown.  
2. `POST /api/events/:id/settlement/pay` — sets `settlementPaidAt`, creates `LedgerEntry`, `PendingVendorPayout` records.

**Admin releases payouts:**

1. `GET /api/wallet/admin/balance`.  
2. `POST /api/wallet/admin/release-vendor-payout/:id` or release-all for event.  
3. Credits `User.accountBalance` for vendor.

**Vendor view:** `vendor/Wallet.jsx` → `GET /api/wallet/vendor/balance`.

**PDF invoices:** `GET /api/invoices/...` → downloaded via `utils/downloadPdf.js` on frontend.

---

## Tracing frontend → backend

Use this method in viva when faculty asks “show me how feature X works”:

1. **Start at the button/form** in the React page (e.g. `EventDetails.jsx`).  
2. **Find the API call** — search for `axios.post`, `axios.get`, `axios.patch`.  
3. **Read the URL path** — e.g. `axios.post(\`/events/${id}/invitations/send\`)` → `/api/events/:id/invitations/send`.  
4. **Open the matching route** in `backend/routes/event.route.js`.  
5. **Open the controller function** imported on that route.  
6. **Follow model operations** — `Event.findById`, `User.create`, etc.  
7. **Check middleware** — is `protect` used? Is multer applied?  
8. **For public pages**, use `public.route.js` instead of `event.route.js`.

**Axios base URL:** All paths in frontend are relative to `frontend/src/api/axios.js` `baseURL` + `/api/...` prefix on server.

---

## Simulated payments & settlement

```
Client hires vendors (offerAmount on accepted vendors)
        ↓
Event completes → closure request approved
        ↓
GET settlement → shows lines per vendor + client total (with markup)
        ↓
POST settlement/pay → LedgerEntry + PendingVendorPayout
        ↓
Admin releases payout → vendor User.accountBalance increases
```

**Key files:**

- `settlement.controller.js`, `settlementCalc.js`  
- `wallet.controller.js`  
- `ledgerEntry.model.js`, `pendingVendorPayout.model.js`  
- Admin: `admin/AccountBalance.jsx`  
- Vendor: `vendor/Wallet.jsx`

---

## Viva / demo checklist

| # | Demo | Start URL | Prove |
|---|------|-----------|-------|
| 1 | Register (email) | `/register` | User in MongoDB, JWT in localStorage |
| 2 | Register (phone) | `/register` | XOR validation |
| 3 | Login + role redirect | `/login` | client/vendor/admin dashboard |
| 4 | Forgot password OTP | `/forgot-password` | Email + OTP fields on user |
| 5 | Portfolio + upload | `/vendor` → Portfolio | `Portfolio` doc + `/uploads` file |
| 6 | Verification | Vendor → Verification | `Verification` collection |
| 7 | Browse + star | `/home` or client Browse | `/portfolio/browse`, starred list |
| 8 | Create event | Client → Events | `POST /events` |
| 9 | Request vendor | Event details | `vendors[].requestStatus` pending |
| 10 | Vendor accept | `/vendor` Bookings | `accepted` + notification |
| 11 | Chat | Messages tab | Message doc + SSE |
| 12 | Public signup | `/public/:eventId` | Attendee + OTP verify |
| 13 | Private invitation | Event → Guest/Invite | Email + invitationCard |
| 14 | Stalls | `/public/:eventId/stalls` | StallBooking unique constraint |
| 15 | Photo share | Start share → guest link | guestPhotos array + ZIP |
| 16 | Collab package | Vendor Collabs → client select | CollabPackage on event |
| 17 | Checklist | Event checklist tab | clientChecklist / vendor checklist |
| 18 | Helpbot | Client Help | HelpRequest + admin reply |
| 19 | Settlement pay | Event settlement | settlementPaidAt, ledger |
| 20 | Admin payout | Admin → Payments | accountBalance updated |

---

## Security notes

- Passwords: **bcrypt** hashed — never store plain text.  
- JWT: 7-day expiry; sent as `Bearer` header (SSE uses query `token` because `EventSource` cannot set headers).  
- **Role checks** in controllers — middleware only proves identity, not permission for every action.  
- **Public routes** — no auth but token/slug validation for photo share and OTP flows.  
- **CORS** — allowlist in `backend/index.js` (`localhost:5173` + `FRONTEND_URL`).  
- **Secrets** — use `.env`; do not commit SMTP passwords or JWT secrets.  
- **Uploads** — file type/size filters in multer middleware; still validate on server.

---

## Known configuration points

Before deployment or GitHub push, review:

| Item | Location | Action |
|------|----------|--------|
| API base URL | `frontend/.env` → `VITE_API_BASE_URL` | Production API URL including `/api` |
| MongoDB | `backend/.env` → `MONGO_URI` | Atlas or production URI |
| Email | `backend/.env` → `EMAIL_USER`, `EMAIL_PASS` | Gmail app password or SMTP |
| JWT | `backend/.env` → `JWT_SECRET` | Long random secret |
| Admin | `backend/.env` → `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | Change demo `admin123` hash |
| Uploads | `uploads/` (gitignored) | Persistent volume in production |
| Past secrets in git | Git history | Rotate Gmail app password if it was ever committed — see [SECURITY.md](./SECURITY.md) |

---

## License & contributors

Academic / project use — update this section with your team names and institution as required.

---

**Document version:** Generated for Planit MERN codebase — covers backend routes as mounted in `backend/index.js` and frontend routes in `App.jsx`. For line-level debugging, open the controller named in each feature section and follow imports from the route file.
