# WantokJobs - Complete Documentation Package

## 📋 Package Contents

This export contains the complete WantokJobs platform codebase and documentation.

**Platform Overview:**
- **Type:** Multi-tenant job board and ATS for PNG & Pacific markets
- **Production URL:** https://wantokjobs.com
- **Status:** ✅ Operational (1,335 jobs, 33,481 users, 2,782 employers)
- **Stack:** React 18 + Node.js + Express + SQLite
- **Deployment:** Production VPS with CI/CD

## 🗂️ Directory Structure

```
wantokjobs-export/
├── DOCUMENTATION/
│   ├── README.md (this file)
│   ├── ARCHITECTURE.md
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_SCHEMA.md
│   ├── WHATSAPP_INTEGRATION.md
│   ├── JEAN_AI_GUIDE.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── ENVIRONMENT_VARIABLES.md
├── FRONTEND/
│   ├── src/ (200 React components)
│   ├── public/ (static assets)
│   └── config/ (build configuration)
├── BACKEND/
│   ├── routes/ (82 API route files)
│   ├── lib/ (25 library modules)
│   ├── middleware/ (18 middleware functions)
│   ├── migrations/ (51 database migrations)
│   └── utils/ (utility functions)
├── SCRIPTS/ (48 automation scripts)
├── CONFIGURATION/
│   ├── .env.example
│   ├── package.json
│   └── deploy.yml
└── DATABASE/ (schema documentation)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- SQLite 3+
- Git

### Installation

1. **Extract and navigate:**
   ```bash
   unzip wantokjobs-export.zip
   cd wantokjobs-export
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment:**
   ```bash
   cp CONFIGURATION/.env.example .env
   # Edit .env with your credentials
   ```

4. **Initialize database:**
   ```bash
   node BACKEND/database.js
   npm run migrate
   ```

5. **Seed data (optional):**
   ```bash
   node BACKEND/seed.js
   ```

6. **Start development:**
   ```bash
   # Terminal 1: Backend
   npm run server
   
   # Terminal 2: Frontend
   npm run dev
   ```

7. **Access:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📚 Documentation Overview

### 1. ARCHITECTURE.md
System architecture, tech stack, service integrations, and data flow diagrams.

### 2. API_DOCUMENTATION.md
Complete API reference with all 82 endpoints, request/response formats, and authentication.

### 3. DATABASE_SCHEMA.md
Database design with 25+ tables, relationships, indexes, and migration history.

### 4. WHATSAPP_INTEGRATION.md
Meta WhatsApp Cloud API setup, webhook configuration, and message handlers.

### 5. JEAN_AI_GUIDE.md
Jean AI assistant architecture, Claude integration, RAG system, and knowledge base.

### 6. DEPLOYMENT_GUIDE.md
Production deployment with VPS setup, Nginx, PM2, GitHub Actions, and Cloudflare.

### 7. ENVIRONMENT_VARIABLES.md
Complete environment variables reference with descriptions and example values.

## 🔑 Key Features

### For Job Seekers
- ✅ Job search with advanced filters
- ✅ Application tracking system
- ✅ CV/resume upload and parsing
- ✅ Job alerts (email + WhatsApp)
- ✅ Profile builder with AI optimization
- ✅ Saved jobs and application history
- ✅ WhatsApp job search and apply

### For Employers
- ✅ Job posting with AI description generator
- ✅ Applicant tracking and screening
- ✅ Interview scheduling and management
- ✅ Offer letters and contract management
- ✅ Company profile pages
- ✅ Analytics dashboard
- ✅ Credit system for job postings
- ✅ WhatsApp job posting (5-step flow)

### For Platform Admin
- ✅ User and employer management
- ✅ Job moderation and verification
- ✅ Platform analytics and reporting
- ✅ WhatsApp message monitoring
- ✅ System health monitoring

## 🛠️ Tech Stack

**Frontend:**
- React 18.2
- Vite 4.5
- TailwindCSS 3.4
- React Router 6.21

**Backend:**
- Node.js 18+
- Express 4.18
- SQLite 3 (better-sqlite3)
- Knex.js migrations

**Services:**
- AI: Groq + Anthropic Claude
- Email: Brevo transactional API
- WhatsApp: Meta Cloud API
- CDN: Cloudflare

## 📊 Production Statistics

- **Jobs:** 1,335 active listings
- **Users:** 33,481 registered users
- **Employers:** 2,782 companies
- **Database:** 96MB SQLite
- **Uptime:** 99.9% (production)

## 🔐 Security Features

- JWT authentication
- Role-based access control (RBAC)
- CSRF protection
- Input sanitization
- Rate limiting
- Bot blocker
- SQL injection prevention
- XSS protection

## 📱 Integration Details

### WhatsApp Integration
- **Phone:** +675 8346 0582
- **Provider:** Meta WhatsApp Cloud API
- **Features:** Registration, job search, applications, alerts

### Jean AI Assistant
- **Models:** Claude 3.5 Sonnet, Groq Whisper
- **Capabilities:** Natural language search, CV parsing, job matching
- **Channels:** Web chat + WhatsApp

## 🚀 Deployment

See **DEPLOYMENT_GUIDE.md** for detailed production deployment instructions.

## 📝 License

Proprietary - WantokJobs Platform

## 📧 Support

For questions or issues, contact: support@wantokjobs.com

