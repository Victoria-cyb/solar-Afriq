
import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

console.log('Paystack Secret Key:', config.paystackSecret);

const paystackApi = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    Authorization: `Bearer ${config.paystackSecret}`,
    'Content-Type': 'application/json',
  },
});

export const initializePayment = async (user, amount, orderId) => {
  let payload;
  try {
    const email = user.email || `guest_${Date.now()}@solarafriq.com`;
    if (amount <= 0) throw new Error('Invalid amount');
    payload = {
      email,
      amount: Math.floor(amount * 100), // Convert to kobo
      reference: `order_${orderId}_${Date.now()}`,
      callback_url: config.paystackCallbackUrl || 'http://localhost:4000/api/paystack/webhook',
      metadata: { orderId },
    };
    console.log('Paystack request:', payload);
    const response = await paystackApi.post('/transaction/initialize', payload);
    console.log('Paystack response:', response.data);

    if (!response.data.status) {
      throw new Error(`Paystack error: ${response.data.message || 'Unknown error'}`);
    }

    const { authorization_url, access_code, reference } = response.data.data;
    logger.info('Paystack transaction initialized', { reference, orderId });
    return { authorizationUrl: authorization_url, accessCode: access_code, reference };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error('Paystack error:', { errorMessage, payload: payload || 'Not defined' });
    logger.error('Error initializing Paystack payment', { error: errorMessage, orderId });
    throw new Error(`Failed to initialize payment: ${errorMessage}`);
  }
};

export const verifyPayment = async (reference) => {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    console.log('Paystack verify response:', response.data);
    const { status, amount, currency, metadata } = response.data.data;
    if (status !== 'success') {
      logger.error('Paystack payment verification failed', { reference, status });
      throw new Error('Payment not completed');
    }
    logger.info('Paystack payment verified', { reference, amount, currency });
    return { orderId: metadata.orderId, amount: amount / 100, currency };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error('Error verifying Paystack payment', { error: errorMessage, reference });
    throw new Error(`Failed to verify payment: ${errorMessage}`);
  }
};