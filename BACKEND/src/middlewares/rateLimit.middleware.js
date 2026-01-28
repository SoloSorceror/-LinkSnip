import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for URL creation endpoints
 * Limits: 10 requests per minute per IP
 */
export const urlCreationLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // 10 requests per window per IP
    message: {
        success: false,
        message: 'Too many links created. Please wait a minute before trying again.'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false // Disable `X-RateLimit-*` headers
});

/**
 * General API rate limiter
 * Limits: 100 requests per minute per IP
 */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    }
});

/**
 * Rate limiter for OTP requests
 * Limits: 3 requests per 10 minutes per IP
 */
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // 3 requests per IP address
    message: {
        success: false,
        message: 'Too many OTP requests. Please wait 10 minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

