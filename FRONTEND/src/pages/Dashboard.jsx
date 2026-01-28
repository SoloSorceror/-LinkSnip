import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const Dashboard = () => {
    const [urls, setUrls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [originalUrl, setOriginalUrl] = useState('');
    const [customAlias, setCustomAlias] = useState('');
    const [expiresInDays, setExpiresInDays] = useState('');
    const [maxClicks, setMaxClicks] = useState('');
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [qrCode, setQrCode] = useState(null);
    const [showQrModal, setShowQrModal] = useState(false);

    const { user, logout, setToken } = useAuth();
    const navigate = useNavigate();
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchUrls();
    }, []);

    const fetchUrls = async () => {
        try {
            const response = await axios.get(`${API_URL}/urls`);
            setUrls(response.data.urls);
        } catch (err) {
            console.error('Failed to fetch URLs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setCreating(true);

        try {
            const payload = { originalUrl };
            if (customAlias.trim()) payload.customAlias = customAlias.trim();
            if (expiresInDays) payload.expiresInDays = parseInt(expiresInDays);
            if (maxClicks) payload.maxClicks = parseInt(maxClicks);

            await axios.post(`${API_URL}/urls`, payload);
            setOriginalUrl('');
            setCustomAlias('');
            setExpiresInDays('');
            setMaxClicks('');
            setShowCreateForm(false);
            fetchUrls();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create URL');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this URL?')) return;

        try {
            await axios.delete(`${API_URL}/urls/${id}`);
            setUrls(urls.filter(url => url.id !== id));
        } catch (err) {
            console.error('Failed to delete URL:', err);
        }
    };

    const handleCopy = async (shortUrl, id) => {
        try {
            await navigator.clipboard.writeText(shortUrl);
            setCopied(id);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const generateQrCode = async (url) => {
        try {
            const qrDataUrl = await QRCode.toDataURL(url.shortUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            setQrCode({
                img: qrDataUrl,
                url: url.shortUrl
            });
            setShowQrModal(true);
        } catch (err) {
            console.error('Failed to generate QR code:', err);
        }
    };

    const closeQrModal = () => {
        setShowQrModal(false);
        setQrCode(null);
    };

    const downloadQrCode = () => {
        if (!qrCode) return;
        const link = document.createElement('a');
        link.href = qrCode.img;
        link.download = `qrcode-${qrCode.url.split('/').pop()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getExpiryInfo = (url) => {
        const parts = [];
        if (url.expiresAt) {
            const date = new Date(url.expiresAt);
            const isExpired = date < new Date();
            parts.push(isExpired ? 'Expired' : `Expires ${date.toLocaleDateString()}`);
        }
        if (url.maxClicks) {
            const remaining = url.maxClicks - url.clicks;
            parts.push(remaining <= 0 ? 'Click limit reached' : `${remaining} clicks left`);
        }
        return parts.join(' • ');
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="text-xl font-bold text-gray-800 hover:opacity-80 transition-opacity">
                        <span className="text-primary-500">🔗</span> LinkSnip
                    </Link>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                                {getInitials(user?.name)}
                            </div>
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                                <div className="px-4 py-2 border-b border-gray-100">
                                    <p className="font-medium text-gray-800 truncate">{user?.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-800">Your Links</h2>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="btn-primary"
                    >
                        {showCreateForm ? 'Cancel' : '+ Create Link'}
                    </button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="card mb-6">
                        <h3 className="font-medium text-gray-800 mb-4">Create new short link</h3>

                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Destination URL
                                </label>
                                <input
                                    type="url"
                                    value={originalUrl}
                                    onChange={(e) => setOriginalUrl(e.target.value)}
                                    className="input-field"
                                    placeholder="https://example.com/your-long-url"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Custom alias <span className="text-gray-400">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={customAlias}
                                    onChange={(e) => setCustomAlias(e.target.value)}
                                    className="input-field"
                                    placeholder="my-custom-link"
                                    pattern="^[a-zA-Z0-9_-]*$"
                                />
                            </div>

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

                            <button
                                type="submit"
                                disabled={creating}
                                className="btn-primary disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create Link'}
                            </button>
                        </form>
                    </div>
                )}

                {/* URL List */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : urls.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-gray-500">No links yet. Create your first one!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {urls.map((url) => (
                            <div key={url.id} className={`card ${url.isExpired ? 'opacity-60' : ''}`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <a
                                                href={url.shortUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`font-medium truncate ${url.isExpired ? 'text-gray-400 line-through' : 'text-primary-500 hover:text-primary-600'}`}
                                            >
                                                {url.shortUrl}
                                            </a>
                                            {url.isExpired && (
                                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Expired</span>
                                            )}
                                            {!url.isExpired && (
                                                <button
                                                    onClick={() => handleCopy(url.shortUrl, url.id)}
                                                    className="text-gray-400 hover:text-gray-600 text-sm"
                                                >
                                                    {copied === url.id ? '✓' : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">{url.originalUrl}</p>
                                        {(url.expiresAt || url.maxClicks) && (
                                            <p className="text-xs text-gray-400 mt-1">{getExpiryInfo(url)}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => navigate(`/analytics/${url.id}`)}
                                                className="flex flex-col items-center text-gray-600 hover:text-primary-500 transition-colors"
                                                title="View Analytics"
                                            >
                                                <span className="text-lg font-semibold">{url.clicks}</span>
                                                <span className="text-xs text-gray-400">clicks</span>
                                            </button>

                                            <button
                                                onClick={() => generateQrCode(url)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                title="Generate QR Code"
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6v4h2v-4zm-6 0H4v4h2v-4zm-2 0h2v4h-2v-4zm12 11v-1m-6 1v-1m6-1v1m-6-1v1m-6-1v1m-6-1v1m18-12V4h-4v4h4z" />
                                                </svg>
                                            </button>

                                            <Link
                                                to={`/analytics/${url.id}`}
                                                className="hidden sm:flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                View Analytics
                                            </Link>

                                            <button
                                                onClick={() => handleDelete(url.id)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                                title="Delete Link"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* QR Code Modal */}
            {showQrModal && qrCode && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeQrModal}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">QR Code</h3>
                            <button onClick={closeQrModal} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-gray-100 mb-4 inline-block shadow-sm">
                            <img src={qrCode.img} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <p className="text-sm text-gray-500 mb-6 break-all px-2">{qrCode.url}</p>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={downloadQrCode}
                                className="btn-primary flex items-center gap-2 w-full justify-center"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download QR Code
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
