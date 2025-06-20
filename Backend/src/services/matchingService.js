import Installer from '../models/installer.js';
import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const extractCity = (address) => {
  const parts = address.split(',').map((part) => part.trim());
  return parts[1] || parts[0]; // e.g., "Lagos" from "123 Main St, Lagos, Nigeria"
};

const geocodeAddress = async (address) => {
  try {
    const response = await axios.get('http://api.positionstack.com/v1/forward', {
      params: {
        access_key: config.positionstackApiKey,
        query: address,
        limit: 1,
      },
    });
    if (!response.data.data || response.data.data.length === 0) {
      throw new Error(`No coordinates found for address: ${address}`);
    }
    const { latitude, longitude } = response.data.data[0];
    return { latitude, longitude };
  } catch (error) {
    logger.error('Geocoding error', { error: error.message, address });
    throw new Error(`Failed to geocode address: ${address}`);
  }
};

const calculateDistance = (loc1, loc2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) * Math.cos(toRad(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export const findNearbyInstallers = async ({ address }, maxDistance = 50) => {
  try {
    let userLocation;
    try {
      userLocation = await geocodeAddress(address);
    } catch (error) {
      logger.warn('Geocoding failed, using city-based fallback', { address });
      userLocation = null;
    }

    const installers = await Installer.find();
    const nearbyInstallers = [];

    for (const installer of installers) {
      try {
        if (userLocation) {
          const installerLocation = await geocodeAddress(installer.address);
          const distance = calculateDistance(userLocation, installerLocation);
          if (distance <= maxDistance) {
            nearbyInstallers.push({ installer, distance });
          }
        } else {
          // Fallback: Match by city
          if (extractCity(installer.address) === extractCity(address)) {
            nearbyInstallers.push({ installer, distance: 0 });
          }
        }
      } catch (error) {
        logger.warn('Skipping installer due to geocoding failure', { installerId: installer._id, address: installer.address });
      }
    }

    nearbyInstallers.sort((a, b) => a.distance - b.distance);
    return nearbyInstallers.map(({ installer }) => installer);
  } catch (error) {
    logger.error('Error finding nearby installers', { error: error.message, address });
    throw new Error('Failed to find nearby installers');
  }
};