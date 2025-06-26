import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../../models/User.js';
import Installer from '../../models/installer.js';
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
    signup: async (_, { email, password, name, role, phoneNumber, address }) => {
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
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await User.create({
          email,
          password: hashedPassword,
          name,
          phoneNumber,
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
          logger.warn(`User not found for email: ${email}`);
          throw new Error('User not found');
        }
        if (user.isEmailVerified) {
          logger.info(`Email already verified: ${email}`);
          throw new Error('Email already verified');
        }
        // Rate limiting: max 3 resends in 5 minutes
        const now = new Date();
        if (user.lastOtpResend && now - user.lastOtpResend < 5 * 60 * 1000 && user.otpResendCount >= 3) {
          logger.warn(`OTP resend limit reached for email: ${email}`);
          throw new Error('Too many OTP resend attempts. Please try again later.');
        }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(now.getTime() + 5 * 60 * 1000);
        const updateData = {
          otp,
          otpExpires,
          otpResendCount: user.lastOtpResend && now - user.lastOtpResend < 5 * 60 * 1000 ? user.otpResendCount + 1 : 1,
          lastOtpResend: now,
        };
        await User.findByIdAndUpdate(user._id, updateData);
        await sendVerificationEmail(email, otp);
        logger.info(`Verification email resent: ${email}`);
        return { message: 'OTP resent to your email' };
      } catch (error) {
        logger.error('Send verification email error:', { error: error.message });
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    },
    verifyEmail: async (_, { email, otp }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          logger.warn(`User not found for email: ${email}`);
          throw new Error('User not found');
        }
        if (user.isEmailVerified) {
          logger.info(`Email already verified: ${email}`);
          throw new Error('Email already verified');
        }
        if (user.otp !== otp || user.otpExpires < new Date()) {
          logger.warn(`Invalid or expired OTP for email: ${email}`);
          throw new Error('Invalid or expired OTP');
        }
        const updatedUser = await User.findByIdAndUpdate(
          user._id,
          { isEmailVerified: true, otp: null, otpExpires: null, otpResendCount: 0, lastOtpResend: null },
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
    resendOTP: async (_, { email }) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          logger.warn(`User not found for email: ${email}`);
          throw new Error('User not found');
        }
        if (user.isEmailVerified) {
          logger.info(`Email already verified: ${email}`);
          throw new Error('Email already verified');
        }
        const now = new Date();
        if (user.lastOtpResend && now - user.lastOtpResend < 5 * 60 * 1000 && user.otpResendCount >= 3) {
          logger.warn(`OTP resend limit reached for email: ${email}`);
          throw new Error('Too many OTP resend attempts. Please try again later.');
        }
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(now.getTime() + 5 * 60 * 1000);
        const updateData = {
          otp,
          otpExpires,
          otpResendCount: user.lastOtpResend && now - user.lastOtpResend < 5 * 60 * 1000 ? user.otpResendCount + 1 : 1,
          lastOtpResend: now,
        };
        await User.findByIdAndUpdate(user._id, updateData);
        await sendVerificationEmail(email, otp);
        logger.info(`OTP resent: ${email}`);
        return { message: 'OTP resent to your email' };
      } catch (error) {
        logger.error('Resend OTP error:', { error: error.message });
        throw new Error(`Failed to resend OTP: ${error.message}`);
      }
    },
  },
};