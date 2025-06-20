import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

export const authMiddleware = async (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token){
    logger.warn('No token provided in request');
    return { user: null };
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.warn('User not found for token', { userId: decoded.userId });
      return { user: null };
    }
    return { user };
  } catch (error) {
    logger.error('Token verification failed', { error: error.message });
    return { user: null };
  }
};