
      import bcrypt from 'bcryptjs';
      import crypto from 'crypto';
      import User from '../models/User.js';
      import { sendVerificationEmail } from './emailService.js';

      export const signup = async (email, password, role, name, address) => {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new Error('Email already in use');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = crypto.randomInt(100000, 999999).toString();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        const user = await User.create({
          email,
          password: hashedPassword,
          role: role || 'user',
          name,
          address,
          otp,
          otpExpires,
        });
        await sendVerificationEmail(email, otp);
        return { message: 'OTP sent to your email' };
      };

      export const login = async (email, password) => {
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
        return { token, user };
      };
  