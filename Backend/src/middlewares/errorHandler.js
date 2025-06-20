import { ApolloError } from 'apollo-server-express';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Apollo/GraphQL errors
  if (err instanceof ApolloError) {
    return res.status(err.statusCode || 400).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.extensions,
      },
    });
  }

  // Handle other errors (e.g., database, authentication)
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};