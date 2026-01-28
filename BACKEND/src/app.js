import express from 'express';
import cors from 'cors';
import passport from './config/passport.js'; // Import passport config
import dotenv from 'dotenv';

import connectDB from './config/mongo.config.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import urlRoutes from './routes/url.routes.js';

// Controller imports (for redirect)
import { redirectUrl } from './controllers/url.controller.js';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to MongoDB (only if MONGO_URI is provided)
if (process.env.MONGO_URI) {
    connectDB();
} else {
    console.warn('⚠️  MONGO_URI not set - running without database connection');
    console.warn('   Add your MongoDB Atlas connection string to .env file');
}

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running',
        database: process.env.MONGO_URI ? 'connected' : 'not configured'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);

// Redirect route (must be after API routes to avoid conflicts)
// This handles: GET /:shortCode -> redirect to original URL
app.get('/:shortCode', redirectUrl);

// 404 handler (for routes that don't match)
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

export default app;