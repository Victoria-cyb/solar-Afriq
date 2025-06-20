import { findNearbyInstallers } from '../../services/matchingService.js';
import Guest from '../../models/Guest.js';
import User from '../../models/User.js';
import { logger } from '../../utils/logger.js';
import { nanoid } from 'nanoid';

export const installerResolvers = {
  Query: {
    findNearbyInstallers: async (_, { name, email, address, phoneNumber, maxDistance, guestId }, { user }) => {
      try {
        let finalGuestId = guestId;
        let finalName = name;
        let finalEmail = email;
        let finalPhoneNumber = phoneNumber;
        let finalAddress = address;

        // Registered user: Fetch details
        if (user) {
          const dbUser = await User.findById(user._id);
          if (!dbUser.email || !dbUser.address) {
            throw new Error('Registered user must provide email and address in profile');
          }
          finalName = dbUser.name || name;
          finalEmail = dbUser.email;
          finalAddress = dbUser.address;
          finalPhoneNumber = dbUser.phoneNumber || phoneNumber;
          finalGuestId = null;
        } else if (!guestId) {
          // New guest: Require name, email, address
          if (!name || !email || !address) {
            throw new Error('Name, email, and address are required for new guest users');
          }
          const guest = await Guest.create({
            guestId: nanoid(12),
            name,
            email,
            phone: null,
            address,
          });
          finalGuestId = guest.guestId;
        } else {
          // Existing guest: Update/fetch details
          const guest = await Guest.findOne({ guestId });
          if (!guest) throw new Error('Invalid guestId');
          if (!guest.email || !guest.address) {
            if (!email || !address) {
              throw new Error('Email and address are required to update guest details');
            }
            await Guest.findOneAndUpdate(
              { guestId },
              { name: name || guest.name, email, address },
              { new: true }
            );
          }
          finalName = name || guest.name;
          finalEmail = email || guest.email;
          finalAddress = address || guest.address;
        }

        // Find installers using geocoded address
        const installers = await findNearbyInstallers({ address: finalAddress }, maxDistance);
        return installers;
      } catch (error) {
        logger.error('Error finding installers', { error: error.message, guestId });
        throw new Error(error.message);
      }
    },
  },
};