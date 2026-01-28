import { nanoid } from 'nanoid';
import { UAParser } from 'ua-parser-js';
import Url from '../models/Url.model.js';
import Click from '../models/Click.model.js';

/**
 * @desc    Create a short URL
 * @route   POST /api/urls
 * @access  Private
 */
export const createUrl = async (req, res) => {
    try {
        const { originalUrl, customAlias, expiresInDays, maxClicks } = req.body;

        // Validate originalUrl is provided
        if (!originalUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a URL'
            });
        }

        // Validate URL format
        try {
            new URL(originalUrl);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid URL'
            });
        }

        // Determine short code (custom alias or generated)
        let shortCode;

        if (customAlias) {
            // Validate custom alias format (alphanumeric, hyphens, underscores only)
            if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
                return res.status(400).json({
                    success: false,
                    message: 'Custom alias can only contain letters, numbers, hyphens, and underscores'
                });
            }

            // Check if custom alias is already taken
            const existingUrl = await Url.findOne({ shortCode: customAlias });
            if (existingUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'This custom alias is already taken'
                });
            }

            shortCode = customAlias;
        } else {
            // Generate unique short code using nanoid (7 characters)
            shortCode = nanoid(7);

            // Ensure uniqueness (very rare case of collision)
            let exists = await Url.findOne({ shortCode });
            while (exists) {
                shortCode = nanoid(7);
                exists = await Url.findOne({ shortCode });
            }
        }

        // Calculate expiry date if provided
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        }

        // Create URL document
        const url = await Url.create({
            originalUrl,
            shortCode,
            user: req.user.id,
            expiresAt,
            maxClicks: maxClicks && maxClicks > 0 ? parseInt(maxClicks) : null
        });

        res.status(201).json({
            success: true,
            url: {
                id: url._id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                shortUrl: `${req.protocol}://${req.get('host')}/${url.shortCode}`,
                clicks: url.clicks,
                expiresAt: url.expiresAt,
                maxClicks: url.maxClicks,
                createdAt: url.createdAt
            }
        });
    } catch (error) {
        console.error('Create URL error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while creating URL'
        });
    }
};

/**
 * @desc    Create an anonymous short URL (no login required)
 * @route   POST /api/urls/anonymous
 * @access  Public
 */
export const createAnonymousUrl = async (req, res) => {
    try {
        const { originalUrl, expiresInDays, maxClicks } = req.body;

        // Validate originalUrl is provided
        if (!originalUrl) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a URL'
            });
        }

        // Validate URL format
        try {
            new URL(originalUrl);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid URL'
            });
        }

        // Generate unique short code using nanoid (7 characters)
        let shortCode = nanoid(7);

        // Ensure uniqueness
        let exists = await Url.findOne({ shortCode });
        while (exists) {
            shortCode = nanoid(7);
            exists = await Url.findOne({ shortCode });
        }

        // Calculate expiry date if provided
        let expiresAt = null;
        if (expiresInDays && expiresInDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        }

        // Create URL document without user (anonymous)
        const url = await Url.create({
            originalUrl,
            shortCode,
            user: null,
            expiresAt,
            maxClicks: maxClicks && maxClicks > 0 ? parseInt(maxClicks) : null
        });

        res.status(201).json({
            success: true,
            url: {
                id: url._id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                shortUrl: `${req.protocol}://${req.get('host')}/${url.shortCode}`,
                clicks: url.clicks,
                expiresAt: url.expiresAt,
                maxClicks: url.maxClicks,
                createdAt: url.createdAt
            }
        });
    } catch (error) {
        console.error('Create anonymous URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating URL'
        });
    }
};

/**
 * @desc    Get all URLs for logged in user
 * @route   GET /api/urls
 * @access  Private
 */
export const getUserUrls = async (req, res) => {
    try {
        const urls = await Url.find({ user: req.user.id }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: urls.length,
            urls: urls.map(url => ({
                id: url._id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                shortUrl: `${req.protocol}://${req.get('host')}/${url.shortCode}`,
                clicks: url.clicks,
                expiresAt: url.expiresAt,
                maxClicks: url.maxClicks,
                isExpired: url.isExpired(),
                isActive: url.isActive,
                createdAt: url.createdAt
            }))
        });
    } catch (error) {
        console.error('Get URLs error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching URLs'
        });
    }
};

/**
 * @desc    Get analytics for a specific URL
 * @route   GET /api/urls/:id/analytics
 * @access  Private
 */
export const getUrlAnalytics = async (req, res) => {
    try {
        const url = await Url.findById(req.params.id);

        if (!url) {
            return res.status(404).json({
                success: false,
                message: 'URL not found'
            });
        }

        // Check ownership
        if (url.user && url.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view analytics for this URL'
            });
        }

        // Get all clicks for this URL
        const clicks = await Click.find({ url: url._id }).sort({ clickedAt: -1 });

        // Aggregate analytics
        const deviceStats = {};
        const browserStats = {};
        const osStats = {};
        const referrerStats = {};
        const clicksByDay = {};

        clicks.forEach(click => {
            // Device stats
            deviceStats[click.device] = (deviceStats[click.device] || 0) + 1;

            // Browser stats
            browserStats[click.browser] = (browserStats[click.browser] || 0) + 1;

            // OS stats
            osStats[click.os] = (osStats[click.os] || 0) + 1;

            // Referrer stats
            referrerStats[click.referrer] = (referrerStats[click.referrer] || 0) + 1;

            // Clicks by day (last 30 days)
            const day = click.clickedAt.toISOString().split('T')[0];
            clicksByDay[day] = (clicksByDay[day] || 0) + 1;
        });

        res.status(200).json({
            success: true,
            analytics: {
                totalClicks: url.clicks,
                uniqueClicks: clicks.length,
                devices: Object.entries(deviceStats).map(([name, count]) => ({ name, count })),
                browsers: Object.entries(browserStats).map(([name, count]) => ({ name, count })),
                os: Object.entries(osStats).map(([name, count]) => ({ name, count })),
                referrers: Object.entries(referrerStats).map(([name, count]) => ({ name, count })),
                clicksByDay: Object.entries(clicksByDay)
                    .map(([date, count]) => ({ date, count }))
                    .sort((a, b) => a.date.localeCompare(b.date)),
                recentClicks: clicks.slice(0, 10).map(c => ({
                    device: c.device,
                    browser: c.browser,
                    os: c.os,
                    referrer: c.referrer,
                    clickedAt: c.clickedAt
                }))
            },
            url: {
                id: url._id,
                originalUrl: url.originalUrl,
                shortUrl: `${req.protocol}://${req.get('host')}/${url.shortCode}`,
                shortCode: url.shortCode,
                createdAt: url.createdAt
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching analytics'
        });
    }
};

/**
 * @desc    Delete a URL
 * @route   DELETE /api/urls/:id
 * @access  Private
 */
export const deleteUrl = async (req, res) => {
    try {
        const url = await Url.findById(req.params.id);

        if (!url) {
            return res.status(404).json({
                success: false,
                message: 'URL not found'
            });
        }

        // Check ownership
        if (url.user && url.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this URL'
            });
        }

        // Delete associated clicks
        await Click.deleteMany({ url: url._id });

        await url.deleteOne();

        res.status(200).json({
            success: true,
            message: 'URL deleted successfully'
        });
    } catch (error) {
        console.error('Delete URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting URL'
        });
    }
};

/**
 * @desc    Redirect to original URL
 * @route   GET /:shortCode
 * @access  Public
 */
export const redirectUrl = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const url = await Url.findOne({ shortCode });

        if (!url) {
            return res.status(404).json({
                success: false,
                message: 'URL not found'
            });
        }

        // Check if link is expired
        if (url.isExpired() || !url.isActive) {
            return res.status(410).json({
                success: false,
                message: 'This link has expired'
            });
        }

        // Parse user agent for device/browser info
        const parser = new UAParser(req.headers['user-agent']);
        const uaResult = parser.getResult();

        // Get IP address
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        // Get referrer
        let referrer = req.headers.referer || req.headers.referrer || 'direct';
        if (referrer !== 'direct') {
            try {
                referrer = new URL(referrer).hostname;
            } catch {
                referrer = 'unknown';
            }
        }

        // Record click with analytics
        await Click.create({
            url: url._id,
            ip: ip,
            device: uaResult.device.type || 'desktop',
            browser: uaResult.browser.name || 'unknown',
            os: uaResult.os.name || 'unknown',
            referrer: referrer
        });

        // Increment click count
        url.clicks += 1;
        await url.save();

        // Redirect to original URL
        res.redirect(url.originalUrl);
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during redirect'
        });
    }
};

/**
 * @desc    Claim anonymous URL (link to user account)
 * @route   POST /api/urls/:id/claim
 * @access  Private
 */
export const claimUrl = async (req, res) => {
    try {
        const url = await Url.findById(req.params.id);

        if (!url) {
            return res.status(404).json({
                success: false,
                message: 'URL not found'
            });
        }

        // Only allow claiming if URL has no owner
        if (url.user) {
            return res.status(400).json({
                success: false,
                message: 'This URL is already owned by someone'
            });
        }

        // Assign to current user
        url.user = req.user.id;
        await url.save();

        res.status(200).json({
            success: true,
            message: 'URL claimed successfully',
            url: {
                id: url._id,
                originalUrl: url.originalUrl,
                shortCode: url.shortCode,
                shortUrl: `${req.protocol}://${req.get('host')}/${url.shortCode}`,
                clicks: url.clicks,
                createdAt: url.createdAt
            }
        });
    } catch (error) {
        console.error('Claim URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while claiming URL'
        });
    }
};
