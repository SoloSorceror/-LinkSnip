import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // 5 minutes in seconds (TTL index)
    }
});

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
    if (!this.isModified('otp')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
});

// Method to verify OTP
otpSchema.methods.verifyOtp = async function (enteredOtp) {
    return await bcrypt.compare(enteredOtp, this.otp);
};

const Otp = mongoose.model('Otp', otpSchema);

export default Otp;
