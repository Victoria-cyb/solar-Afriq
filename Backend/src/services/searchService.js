import Product  from '../models/Product.js';
import { logger } from '../utils/logger.js';

export const searchProducts = async ({ query, filters }) => {
  try {
    const searchCriteria = {};

    // Handle search query (case-insensitive)
    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    // Handle filters
    if (filters) {
      if (filters.category) {
        searchCriteria.category = { $regex: `^${filters.category}$`, $options: 'i' }; // Case-insensitive
      }
      if (filters.priceRange) {
        searchCriteria.price = {
          $gte: filters.priceRange.min || 0,
          $lte: filters.priceRange.max || Infinity,
        };
      }
    }
    const products = await Product.find(searchCriteria);
    return products;
  } catch (error) {
    logger.error('Error in searchProducts', { error: error.message });
    throw new Error('Failed to search products');
  }
};