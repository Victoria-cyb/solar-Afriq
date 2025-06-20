import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
password: { type: String },
name: { type: String },
role: { type: String,
  enum: ['user', 'installer', 'admin'], default: 'user' },
address: { type: String },
googleId: { type: String, unique: true, sparse: true },
isEmailVerified: { type: Boolean, default: false },
otp: { type: String },
otpExpires: { type: Date },
});

export default mongoose.model('User', userSchema);