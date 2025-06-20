import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';


const client = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri
);

export const verifyGoogleToken = async (code) => {
  try {
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    logger.error('Google token verification failed', { error: error.message });
    throw new Error('Invalid Google token');
  }
};