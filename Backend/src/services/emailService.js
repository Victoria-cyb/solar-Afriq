import nodemailer from 'nodemailer';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.emailUser,
    pass: config.emailPass,
  },
});

export const sendVerificationEmail = async (to, otp) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification - Solar Afriq</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background-color: #90EE90; padding: 20px; text-align: center; }
          .header h1 { color: #333333; margin: 0; font-size: 24px; }
          .header span.brand { color: #228B22; font-weight: bold; }
          .content { padding: 20px; text-align: center; }
          .content p { color: #333333; font-size: 16px; line-height: 1.5; }
          .otp { font-size: 24px; font-weight: bold; color: #228B22; margin: 20px 0; letter-spacing: 2px; }
          .footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; color: #666666; }
          .footer a { color: #90EE90; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to <span class="brand">Solar Afriq</span></h1>
          </div>
          <div class="content">
            <p>Thank you for signing up with Solar Afriq! To verify your email address, please use the following One-Time Password (OTP):</p>
            <div class="otp">${otp}</div>
            <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Solar Afriq. All rights reserved.</p>
            <p><a href="https://solarafriq.com">Visit our website</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `"Solar Afriq" <${config.emailUser}>`,
    to,
    subject: 'Verify Your Email - Solar Afriq',
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to: ${to}`);
    return true;
  } catch (error) {
    logger.error('Error sending verification email', { error: error.message, to });
    throw new Error('Failed to send verification email');
  }
};

export const sendContactEmail = async ({ name, email, message }) => {
  await transporter.sendMail({
    from: config.emailUser,
    to: 'support@yourapp.com',
    subject: `Contact Form Submission from ${name}`,
    text: `From: ${email}\n\n${message}`,
  });
};