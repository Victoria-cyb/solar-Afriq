// File: src/graphql/resolvers/guestResolver.js
import Guest from '../../models/Guest.js';
import { logger } from '../../utils/logger.js';

export const guestResolvers = {
  Mutation: {
    saveGuestDetails: async (_, { input }) => {
      try {
        const { name, email, phone, address } = input;
        const guestData = {
          ...(name && { name }),
          ...(email && { email }),
          ...(phone && { phone }),
          ...(address && { address }),
        };
        const guest = await Guest.create(guestData);
        logger.info('Guest details saved', { guestId: guest.guestId });
        return guest;
      } catch (error) {
        logger.error('Error saving guest details', { error: error.message });
        throw new Error('Failed to save guest details');
      }
    },
  },
};