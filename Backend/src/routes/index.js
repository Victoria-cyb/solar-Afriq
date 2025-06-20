import express from 'express';
import { verifyPayment } from '../services/paymentService.js';
import Order from '../models/Order.js';
import { logger } from '../utils/logger.js';
import { getEnvKeys } from '../config/config.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running' });
});

router.get('/env-keys', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    logger.warn('Unauthorized access attempt to /env-keys');
    return res.status(403).json({ error: 'Access restricted to development environment' });
  }
  try {
    const keys = getEnvKeys();
    res.status(200).json({ envKeys: keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/paystack/webhook', async (req, res) => {
  const { event, data } = req.body;
  try {
    if (event === 'charge.success') {
      const { reference, status, amount, metadata } = data;
      if (status === 'success') {
        const order = await Order.findById(metadata.orderId);
        if (order) {
          order.status = 'completed';
          order.total = amount / 100; // Convert kobo to NGN
          await order.save();
          logger.info('Payment successful, order updated', { reference, orderId: metadata.orderId });
        }
      }
    }
    res.status(200).send('Webhook received');
  } catch (error) {
    logger.error('Error processing Paystack webhook', { error: error.message });
    res.status(400).send('Webhook error');
  }
});

export default router;