import User from '../models/User.model.js';
import Otp from '../models/Otp.model.js';
import otpGenerator from 'otp-generator';
import { sendOtpEmail } from '../utils/email.utils.js';

/**
 * @desc    Send OTP for email verification (Signup or Forgot Password)
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
export const sendOtp = async (req, res) => {
    try {
        const { email, type } = req.body; // type can be 'register' or 'reset'

        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide email' });
        }

        const existingUser = await User.findOne({ email });

        // If registering, user shouldn't exist
        if (type === 'vote' || !type || type === 'register') { // Default to register check
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists using this email'
                });
            }
        }

        // If resetting password, user must exist
        if (type === 'reset') {
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'No account found with this email'
                });
            }
        }

        // Generate OTP
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false
        });

        // Create new OTP document
        await Otp.create({ email, otp });

        // Send OTP via email
        try {
            await sendOtpEmail(email, otp);
            res.status(200).json({
                success: true,
                message: 'OTP sent successfully to your email'
            });
        } catch (emailError) {
            await Otp.deleteOne({ email });
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP email'
            });
        }

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP generation'
        });
    }
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or verify it again'
            });
        }

        const isOtpValid = await otpRecord.verifyOtp(otp);
        if (!isOtpValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        const user = await User.create({
            name,
            email,
            password
        });

        await Otp.deleteMany({ email });

        const token = user.generateToken();

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = user.generateToken();

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide all fields' });
        }

        // Verify OTP
        const otpRecord = await Otp.findOne({ email }).sort({ createdAt: -1 });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'OTP expired or invalid' });
        }

        const isOtpValid = await otpRecord.verifyOtp(otp);
        if (!isOtpValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // Find user and update password
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.password = newPassword;
        await user.save(); // Pre-save hook will hash the password

        // Cleanup OTPs
        await Otp.deleteMany({ email });

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset'
        });
    }
};

/**
 * @desc    Handle Google Auth Callback
 * @route   GET /api/auth/google/callback
 * @access  Public
 */
export const googleCallback = async (req, res) => {
    try {
        const token = req.user.generateToken();
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?token=${token}`);
    } catch (error) {
        console.error('Google callback error:', error);
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=auth_failed`);
    }
};
