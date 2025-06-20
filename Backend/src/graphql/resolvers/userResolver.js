
      import bcrypt from 'bcryptjs';
      import jwt from 'jsonwebtoken';
      import crypto from 'crypto';
      import User from '../../models/User.js';
      import Installer from '../../models/Installer.js';
      import { config } from '../../config/config.js';
      import { logger } from '../../utils/logger.js';
      import { sendVerificationEmail } from '../../services/emailService.js';
      import { verifyGoogleToken } from '../../middlewares/googleAuth.js';

      export const userResolvers = {
        Query: {
          me: async (_, __, { user }) => {
            if (!user) throw new Error('Not authenticated');
            return user;
          },
        },
        Mutation: {
          signup: async (_, { email, password, name, role, address }) => {
            try {
              const existingUser = await User.findOne({ email });
              if (existingUser) {
                logger.warn(`Signup attempt with existing email: ${email}`);
                throw new Error('Email already in use');
              }
              const validRoles = ['user', 'installer', 'admin'];
              if (role && !validRoles.includes(role)) {
                throw new Error(`Invalid role: ${role}`);
              }
              const hashedPassword = await bcrypt.hash(password, 10);
              const otp = crypto.randomInt(100000, 999999).toString();
              const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
              await User.create({
                email,
                password: hashedPassword,
                name,
                role: role || 'user',
                address,
                otp,
                otpExpires,
              });
              await sendVerificationEmail(email, otp);
              logger.info(`User signed up, OTP sent: ${email}`);
              return { message: 'OTP sent to your email' };
            } catch (error) {
              logger.error('Signup error:', { error: error.message });
              throw new Error(`Signup failed: ${error.message}`);
            }
          },
          login: async (_, { email, password }) => {
            const user = await User.findOne({ email });
            if (!user || !(await bcrypt.compare(password, user.password))) {
              throw new Error('Invalid credentials');
            }
            if (!user.isEmailVerified) {
              const otp = crypto.randomInt(100000, 999999).toString();
              const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
              await User.findByIdAndUpdate(user._id, { otp, otpExpires });
              await sendVerificationEmail(email, otp);
              throw new Error('Email not verified. New OTP sent.');
            }
            const token = jwt.sign(
              { userId: user._id, role: user.role },
              config.jwtSecret,
              { expiresIn: '1d' }
            );
            logger.info(`User logged in: ${email}`);
            return { token, user };
          },
          googleSignup: async (_, { code }) => {
  try {
    const { googleId, email, name } = await verifyGoogleToken(code);
    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user = await User.findByIdAndUpdate(
          user._id,
          { googleId },
          { new: true }
        );
      } else {
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        user = await User.create({
          googleId,
          email,
          name,
          role: 'user',
          otp,
          otpExpires,
        });
        await sendVerificationEmail(email, otp);
        logger.info(`Google signup, OTP sent: ${email}`);
        return { message: 'OTP sent to your email' };
      }
    }
    if (!user.isEmailVerified) {
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      await User.findByIdAndUpdate(user._id, { otp, otpExpires });
      await sendVerificationEmail(email, otp);
      logger.info(`Google signup, OTP resent: ${email}`);
      return { message: 'OTP sent to your email' };
    }
    await sendVerificationEmail(email, 'No OTP needed');
    logger.info(`Google signup, already verified: ${email}`);
    return { message: 'Email already verified, please log in' };
  } catch (error) {
    logger.error('Google signup error:', { error: error.message });
    throw new Error(`Google signup failed: ${error.message}`);
  }
},
          sendVerificationEmail: async (_, { email }) => {
            try {
              const user = await User.findOne({ email });
              if (!user) {
                throw new Error('User not found');
              }
              if (user.isEmailVerified) {
                throw new Error('Email already verified');
              }
              const otp = crypto.randomInt(100000, 999999).toString();
              const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
              await User.findByIdAndUpdate(user._id, { otp, otpExpires });
              await sendVerificationEmail(email, otp);
              logger.info(`Verification email resent: ${email}`);
              return true;
            } catch (error) {
              logger.error('Send verification email error:', { error: error.message });
              throw new Error(`Failed to send verification email: ${error.message}`);
            }
          },
          verifyEmail: async (_, { email, otp }) => {
            try {
              const user = await User.findOne({ email });
              if (!user) {
                throw new Error('User not found');
              }
              if (user.isEmailVerified) {
                throw new Error('Email already verified');
              }
              if (user.otp !== otp || user.otpExpires < new Date()) {
                throw new Error('Invalid or expired OTP');
              }
              const updatedUser = await User.findByIdAndUpdate(
                user._id,
                { isEmailVerified: true, otp: null, otpExpires: null },
                { new: true }
              );
              const token = jwt.sign(
                { userId: updatedUser._id, role: updatedUser.role },
                config.jwtSecret,
                { expiresIn: '1d' }
              );
              logger.info(`Email verified: ${email}`);
              return { token, user: updatedUser };
            } catch (error) {
              logger.error('Verify email error:', { error: error.message });
              throw new Error(`Email verification failed: ${error.message}`);
            }
          },
          becomeInstaller: async (_, { skills, address }, { user }) => {
            logger.info('Attempting becomeInstaller', { userId: user?._id, role: user?.role });
            if (!user) throw new Error('Unauthorized: No user authenticated');
            if (user.role !== 'user') throw new Error(`Unauthorized: User role is ${user.role}, expected 'user'`);
            if (!address) throw new Error('Address is required');
            await Installer.create({ userId: user._id, skills, address });
            const updatedUser = await User.findByIdAndUpdate(
              user._id,
              { role: 'installer', address },
              { new: true }
            );
            logger.info(`User became installer: ${user.email}`);
            return updatedUser;
          },
        },
      };
   