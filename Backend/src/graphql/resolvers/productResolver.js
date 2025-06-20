import Product from '../../models/Product.js';
import { searchProducts } from '../../services/searchService.js';
import { logger } from '../../utils/logger.js';

export const productResolvers = {
  Query: {
    products: async () => {
      try {
        const products = await Product.find();
        return products;
      } catch (error) {
        logger.error('Error fetching products', { error: error.message });
        throw new Error('Failed to fetch products');
      }
    },
    product: async (_, { id }) => {
      try {
        const product = await Product.findById(id);
        if (!product) throw new Error('Product not found');
        return product;
      } catch (error) {
        logger.error('Error fetching product', { error: error.message, id });
        throw new Error('Failed to fetch product');
      }
    },
    searchProducts: async (_, { query, filters }) => {
      try {
        const products = await searchProducts({ query, filters });
        return products;
      } catch (error) {
        logger.error('Error searching products', { error: error.message, query, filters });
        throw new Error('Failed to search products');
      }
    },
  },
  Mutation: {
    createProduct: async (_, { input }, { user }) => {
      if (!user || user.role !== 'admin') throw new Error('Not authorized');
      try {
        const product = await Product.create(input);
        return product;
      } catch (error) {
        logger.error('Error creating product', { error: error.message, userId: user._id });
        throw new Error('Failed to create product');
      }
    },
  },
};