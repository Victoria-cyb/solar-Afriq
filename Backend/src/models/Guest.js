// File: src/models/Guest.js
import mongoose from 'mongoose';
import { nanoid } from 'nanoid'; // Install: npm install nanoid

const guestSchema = new mongoose.Schema({
  guestId: { type: String, unique: true, default: () => nanoid(12) },
  name: { type: String, sparse: true }, // Added name
  email: { type: String, sparse: true },
  phone: { type: String, sparse: true },
  address: { type: String, sparse: true }, // Replaced location with address
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Guest', guestSchema);