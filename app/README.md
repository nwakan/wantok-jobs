# WantokJobs - Job Platform for the Pacific

A full-stack job platform built with Express.js, SQLite, React, and Tailwind CSS.

## Features

- 🔐 User authentication (JWT + OAuth)
- 🔑 Social login with Google and Facebook
- 👤 Three user roles: Job Seekers, Employers, Admins
- 💼 Job posting and management
- 📝 Application tracking
- 🔔 Real-time notifications
- 💾 Save jobs functionality
- 📊 Admin dashboard with analytics
- 🌏 Pacific region focus

## Tech Stack

**Backend:**
- Express.js
- better-sqlite3
- jsonwebtoken
- bcryptjs

**Frontend:**
- React 18
- Tailwind CSS
- React Router v6
- Vite

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Copy .env.example to .env and configure
cp .env.example .env

# Seed the database with sample data
npm run seed
```

### OAuth Setup (Optional)

To enable Google and Facebook login:

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select existing)
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:5173` (development)
   - Your production domain
6. Copy the **Client ID** and add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

#### Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Create a new app (Consumer type)
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   - `http://localhost:5173` (development)
   - Your production domain
5. Copy the **App ID** and add to `.env`:
   ```
   FACEBOOK_APP_ID=your_facebook_app_id_here
   ```

**Note:** If OAuth environment variables are not set, the OAuth buttons will be automatically hidden from the login/register pages.

### Development

```bash
# Run both server and client in development
npm run dev

# Server runs on http://localhost:3001
# Client runs on http://localhost:5173
```

### Production

```bash
# Build the client
npm run build

# Start production server
npm start
```

## Test Accounts

After running `npm run seed`, you can login with:

- **Admin:** admin@wantokjobs.com / admin123
- **Employer:** employer1@example.com / employer123
- **Job Seeker:** jobseeker1@example.com / jobseeker123

⚠️ **IMPORTANT:** Change the admin password after first login!

## Project Structure

```
/server
  /routes       - API endpoints
  /middleware   - Auth and role middleware
  /data         - SQLite database
  database.js   - Database schema and initialization
  index.js      - Express server
  seed.js       - Database seeding

/client
  /src
    /pages      - React pages (public + dashboards)
    /components - Reusable components
    api.js      - API client
    App.jsx     - Main routing
```

## API Endpoints

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- GET `/api/auth/oauth/providers` - Get enabled OAuth providers
- POST `/api/auth/oauth/google` - Google OAuth login/register
- POST `/api/auth/oauth/facebook` - Facebook OAuth login/register

### Jobs
- GET `/api/jobs` - List jobs (public, with filters)
- GET `/api/jobs/:id` - Get job details
- POST `/api/jobs` - Create job (employer)
- PUT `/api/jobs/:id` - Update job (employer)
- DELETE `/api/jobs/:id` - Delete job (employer/admin)

### Applications
- POST `/api/applications` - Apply to job (jobseeker)
- GET `/api/applications/my` - My applications (jobseeker)
- GET `/api/applications/job/:jobId` - Job applications (employer)
- PUT `/api/applications/:id/status` - Update status (employer/admin)

### Profile
- GET `/api/profile` - Get own profile
- PUT `/api/profile` - Update profile
- GET `/api/profile/:userId` - Get public profile

### Saved Jobs
- POST `/api/saved-jobs/:jobId` - Save job
- DELETE `/api/saved-jobs/:jobId` - Unsave job
- GET `/api/saved-jobs` - Get saved jobs

### Notifications
- GET `/api/notifications` - Get notifications
- PUT `/api/notifications/:id/read` - Mark as read
- PUT `/api/notifications/read-all` - Mark all as read

### Admin
- GET `/api/admin/stats` - Platform statistics
- GET `/api/admin/users` - List users
- PUT `/api/admin/users/:id` - Update user
- GET `/api/admin/jobs` - List all jobs
- DELETE `/api/admin/jobs/:id` - Delete job

## Deployment

### Render.com

The project includes a `render.yaml` for easy deployment to Render:

1. Push to GitHub
2. Connect repository to Render
3. Deploy automatically

Make sure to set the `JWT_SECRET` environment variable in production!

## License

MIT
