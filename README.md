# Red Phoenix Restaurant App

Full-stack restaurant application with .NET 8 Web API + React/Vite frontend.

## 🍜 Features

- Customer rewards & loyalty program
- Meal tracking and receipt uploads
- Push notifications
- Admin dashboard
- Menu management (from Dumplingnow)
- Order management (from Dumplingnow)

## 🏗️ Tech Stack

### Backend (`backend/RedPhoenix.Api/`)
- .NET 8 Web API
- Dapper + SQL Server
- JWT Authentication
- SMS integration via FuntimePB gateway

### Frontend (`frontend/`)
- React 18 + Vite + TypeScript
- Tailwind CSS
- i18n support

## 🚀 Deployment

- **URL:** https://redphoenix.app
- **IIS Site:** RedPhoenix
- **Database:** RedPhoenix (SQL Server on FTPB1)

### IIS Structure
```
F:\New_WWW\RedPhoenix\
├── WWW\          ← Frontend
└── API\          ← Backend (/api virtual app)
```

## 📁 Origins

Combined from:
- **usushi** — Core template with rewards, meals, receipts
- **Dumplingnow** — Menu and order management components

## 🔐 First-Time Setup

After deployment, call `POST /api/auth/setup` to create the first admin user.
