import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const Home = () => {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const [url, setUrl] = useState('');
    const [useCustom, setUseCustom] = useState(false);
    const [customAlias, setCustomAlias] = useState('');
    const [showExpiry, setShowExpiry] = useState(false);
    const [expiresInDays, setExpiresInDays] = useState('');
    const [maxClicks, setMaxClicks] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [qrCode, setQrCode] = useState(null);

    const generateQrCode = async (shortUrl) => {
        try {
            const qrDataUrl = await QRCode.toDataURL(shortUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            setQrCode(qrDataUrl);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setResult(null);
        setQrCode(null);

        // If custom alias is selected, user must be logged in
        if (useCustom && !isAuthenticated) {
            navigate('/login');
            return;
        }

        setLoading(true);

        try {
            const payload = { originalUrl: url };

            // Add expiry options if set
            if (expiresInDays) payload.expiresInDays = parseInt(expiresInDays);
            if (maxClicks) payload.maxClicks = parseInt(maxClicks);

            let response;
            if (isAuthenticated) {
                // If logged in, always create with user account
                if (useCustom) payload.customAlias = customAlias.trim();
                response = await axios.post(`${API_URL}/urls`, payload);
            } else {
                // Create anonymous URL
                response = await axios.post(`${API_URL}/urls/anonymous`, payload);
            }

            const newUrl = response.data.url;
            setResult(newUrl);
            await generateQrCode(newUrl.shortUrl);

            setUrl('');
            setCustomAlias('');
            setExpiresInDays('');
            setMaxClicks('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create short URL');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (result) {
            await navigator.clipboard.writeText(result.shortUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadQrCode = () => {
        if (!qrCode || !result) return;
        const link = document.createElement('a');
        link.href = qrCode;
        link.download = `qrcode-${result.shortCode}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold text-gray-800">
                        <span className="text-primary-500">🔗</span> LinkSnip
                    </Link>
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <Link to="/dashboard" className="text-gray-600 hover:text-gray-800 font-medium px-4 py-2">
                                    Dashboard
                                </Link>
                                <Link to="/dashboard" className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                                    {getInitials(user?.name)}
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium px-4 py-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Login
                                </Link>
                                <Link to="/signup" className="btn-primary">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section with URL Shortener */}
            <section className="flex-1 flex items-center justify-center py-16 px-4">
                <div className="max-w-2xl mx-auto text-center w-full">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">
                        Shorten your links,
                        <br />
                        <span className="text-primary-500">amplify your reach</span>
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        Create short, memorable links in seconds.
                    </p>

                    {/* URL Shortener Form */}
                    <div className="card text-left">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Paste your long URL
                                </label>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="input-field"
                                    placeholder="https://example.com/your-very-long-url-here"
                                    required
                                />
                            </div>

                            {/* Options Row */}
                            <div className="flex flex-wrap gap-4">
                                {/* Custom Alias Toggle */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setUseCustom(!useCustom)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useCustom ? 'bg-primary-500' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useCustom ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                    <span className="text-sm text-gray-600">Custom alias</span>
                                </div>

                                {/* Expiry Toggle */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowExpiry(!showExpiry)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showExpiry ? 'bg-primary-500' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showExpiry ? 'translate-x-5' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                    <span className="text-sm text-gray-600">Set expiry</span>
                                </div>
                            </div>

                            {/* Custom Alias Input */}
                            {useCustom && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Custom alias {!isAuthenticated && <span className="text-primary-500">(requires login)</span>}
                                    </label>
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-400 mr-1">linksnip.io/</span>
                                        <input
                                            type="text"
                                            value={customAlias}
                                            onChange={(e) => setCustomAlias(e.target.value)}
                                            className="input-field flex-1"
                                            placeholder="my-brand"
                                            pattern="^[a-zA-Z0-9_-]*$"
                                            required={useCustom}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Expiry Options */}
                            {showExpiry && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Expire after (days)
                                        </label>
                                        <input
                                            type="number"
                                            value={expiresInDays}
                                            onChange={(e) => setExpiresInDays(e.target.value)}
                                            className="input-field"
                                            placeholder="e.g. 7"
                                            min="1"
                                            max="365"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Max clicks
                                        </label>
                                        <input
                                            type="number"
                                            value={maxClicks}
                                            onChange={(e) => setMaxClicks(e.target.value)}
                                            className="input-field"
                                            placeholder="e.g. 100"
                                            min="1"
                                        />
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : useCustom && !isAuthenticated ? 'Login to Create' : 'Shorten URL'}
                            </button>
                        </form>

                        {/* Result */}
                        {result && (
                            <div className="mt-6">
                                <div className="p-4 bg-green-50 rounded-lg border border-green-100 mb-4">
                                    <p className="text-sm text-green-700 mb-2">✓ Your short link is ready!</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={result.shortUrl}
                                            readOnly
                                            className="flex-1 px-3 py-2 bg-white rounded-lg border border-green-200 text-primary-600 font-medium"
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="btn-primary"
                                        >
                                            {copied ? '✓ Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    {(result.expiresAt || result.maxClicks) && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            {result.expiresAt && `Expires: ${new Date(result.expiresAt).toLocaleDateString()}`}
                                            {result.expiresAt && result.maxClicks && ' • '}
                                            {result.maxClicks && `Max clicks: ${result.maxClicks}`}
                                        </p>
                                    )}
                                    {isAuthenticated && (
                                        <p className="text-xs text-primary-500 mt-2">
                                            View analytics in your <Link to="/dashboard" className="underline">dashboard</Link>
                                        </p>
                                    )}
                                </div>

                                {/* QR Code Section */}
                                {qrCode && (
                                    <div className="flex flex-col items-center bg-white border border-gray-100 rounded-lg p-6 shadow-sm">
                                        <h3 className="text-gray-800 font-medium mb-4">QR Code</h3>
                                        <div className="bg-white p-2 rounded-lg border border-gray-100 mb-4 inline-block shadow-sm">
                                            <img src={qrCode} alt="QR Code" className="w-32 h-32" />
                                        </div>
                                        <button
                                            onClick={downloadQrCode}
                                            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download QR Code
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
