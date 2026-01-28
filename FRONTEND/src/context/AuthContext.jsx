import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// API base URL - uses environment variable in production, relative path in development
const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Handle Google OAuth redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
            localStorage.setItem('token', urlToken); // Save immediately
            setToken(urlToken);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Set axios default header when token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
        }
    }, [token]);

    // Check if user is logged in on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (token) {
                try {
                    const response = await axios.get(`${API_URL}/auth/me`);
                    setUser(response.data.user);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, [token]);

    // Login function
    const login = async (email, password) => {
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        setToken(response.data.token);
        setUser(response.data.user);
        return response.data;
    };

    // Send OTP function
    const sendOtp = async (email, type = 'register') => {
        const response = await axios.post(`${API_URL}/auth/send-otp`, { email, type });
        return response.data;
    };

    // Reset Password function
    const resetPassword = async (email, otp, newPassword) => {
        const response = await axios.post(`${API_URL}/auth/reset-password`, { email, otp, newPassword });
        return response.data;
    };

    // Signup function
    const signup = async (name, email, password, otp) => {
        const response = await axios.post(`${API_URL}/auth/register`, { name, email, password, otp });
        setToken(response.data.token);
        setUser(response.data.user);
        return response.data;
    };

    // Logout function
    const logout = () => {
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        setToken, // Exposed for OAuth handling
        loading,
        login,
        signup,
        sendOtp,
        resetPassword,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
