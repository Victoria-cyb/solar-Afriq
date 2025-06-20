import mongoose from 'mongoose';

const installerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [{ type: String, required: true }],
  address: { type: String, required: true },
  rating: { type: Number, default: 0 },
});

// Prevent model overwrite by checking if model exists
const Installer = mongoose.models.Installer || mongoose.model('Installer', installerSchema);

export default Installer;