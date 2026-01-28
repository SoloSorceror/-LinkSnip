# Environment Variables for Render Deployment

Set these in the Render Dashboard under your service's Environment tab.

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB connection string |
| `JWT_SECRET` | `your-super-secret-key` | Secret for JWT signing |
| `JWT_EXPIRE` | `7d` | JWT expiration time |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | `https://your-app.onrender.com/api/auth/google/callback` | Full callback URL |
| `CLIENT_URL` | `https://your-app.vercel.app` | Frontend URL for redirects |
| `EMAIL_USER` | `your-email@gmail.com` | Email for OTP sending |
| `EMAIL_PASS` | `app-password` | Email app password |
