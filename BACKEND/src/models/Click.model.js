import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
    url: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Url',
        required: true
    },
    // Visitor info
    ip: {
        type: String,
        default: null
    },
    // Device & Browser info (from user-agent)
    device: {
        type: String, // desktop, mobile, tablet
        default: 'unknown'
    },
    browser: {
        type: String,
        default: 'unknown'
    },
    os: {
        type: String,
        default: 'unknown'
    },
    // Referrer (where the click came from)
    referrer: {
        type: String,
        default: 'direct'
    },
    // Location (can be populated later with IP geolocation)
    country: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null
    },
    // Timestamp
    clickedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for faster analytics queries
clickSchema.index({ url: 1 });
clickSchema.index({ clickedAt: -1 });
clickSchema.index({ url: 1, clickedAt: -1 });

const Click = mongoose.model('Click', clickSchema);

export default Click;
