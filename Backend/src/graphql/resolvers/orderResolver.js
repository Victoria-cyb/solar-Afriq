// File: src/graphql/resolvers/orderResolver.js
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Guest from '../../models/Guest.js';
import { initializePayment } from '../../services/paymentService.js';
import { logger } from '../../utils/logger.js';

export const orderResolvers = {
  Query: {
    order: async (_, { id }, { user }) => {
      try {
        const order = await Order.findById(id).populate('items.product');
        if (!order) throw new Error('Order not found');
        if (user && order.user && order.user.toString() !== user._id.toString()) {
          throw new Error('Not authorized');
        }
        return order;
      } catch (error) {
        logger.error('Error fetching order', { error: error.message, userId: user?._id, orderId: id });
        throw new Error(error.message);
      }
    },
    orders: async (_, __, { user }) => {
      try {
        const query = user ? { user: user._id } : {};
        const orders = await Order.find(query).populate('items.product');
        return orders;
      } catch (error) {
        logger.error('Error fetching orders', { error: error.message, userId: user?._id });
        throw new Error('Failed to fetch orders');
      }
    },
  },
  Mutation: {
    createOrder: async (_, { items, guestId, email }) => {
      try {
        // Validate and calculate total
        let total = 0;
        const orderItems = await Promise.all(
          items.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) throw new Error(`Product ${item.productId} not found`);
            if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
            total += product.price * item.quantity;
            return { product: product._id, quantity: item.quantity };
          })
        );

        // Resolve email from guestId if provided
        let finalEmail = email;
        if (guestId && !email) {
          const guest = await Guest.findOne({ guestId });
          if (guest && guest.email) {
            finalEmail = guest.email;
          }
        }
        if (!finalEmail) {
          finalEmail = `guest_${nanoid(8)}@solarafriq.com`; // Fallback email
        }

        // Create order
        const order = await Order.create({
          guestId,
          items: orderItems,
          total,
          status: 'pending',
        });

        // Update product stock
        await Promise.all(
          items.map(async (item) => {
            await Product.findByIdAndUpdate(item.productId, {
              $inc: { stock: -item.quantity },
            });
          })
        );

        // Initialize Paystack payment
        const payment = await initializePayment({ email: finalEmail }, total, order._id);
        await Order.findByIdAndUpdate(order._id, { paymentReference: payment.reference });

        logger.info('Order created and payment initialized', { orderId: order._id, guestId });
        return {
          authorizationUrl: payment.authorizationUrl,
          accessCode: payment.accessCode,
          reference: payment.reference,
        };
      } catch (error) {
        logger.error('Error creating order', { error: error.message, guestId });
        throw new Error(error.message);
      }
    },
  },
};