import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: [true, 'Please provide a URL'],
        trim: true,
        validate: {
            validator: function (v) {
                // Validate URL format
                try {
                    new URL(v);
                    return true;
                } catch (err) {
                    return false;
                }
            },
            message: 'Please provide a valid URL'
        }
    },
    shortCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: [20, 'Short code cannot exceed 20 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Optional for anonymous URLs
        default: null
    },
    clicks: {
        type: Number,
        default: 0
    },
    // Expiry settings
    expiresAt: {
        type: Date,
        default: null // null means never expires
    },
    maxClicks: {
        type: Number,
        default: null // null means unlimited clicks
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster lookups
// urlSchema.index({ shortCode: 1 }); // Already indexed by unique: true
urlSchema.index({ user: 1 });
urlSchema.index({ expiresAt: 1 }); // For expired link cleanup

// Method to check if link is expired
urlSchema.methods.isExpired = function () {
    // Check date expiry
    if (this.expiresAt && new Date() > this.expiresAt) {
        return true;
    }
    // Check click limit expiry
    if (this.maxClicks !== null && this.clicks >= this.maxClicks) {
        return true;
    }
    return false;
};

const Url = mongoose.model('Url', urlSchema);

export default Url;
