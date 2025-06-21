import dotenv from 'dotenv';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import path from 'path';
import fs from 'fs';
import connectDB from './config/db.js';
import { typeDefs, resolvers } from './graphql/schema.js';
import { authMiddleware } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import cors from 'cors';
import router from './routes/index.js';
import { config } from './config/config.js';

// Load .env file only in development
const envPath = path.resolve(process.cwd(), '.env');
if (process.env.NODE_ENV !== 'production' && !fs.existsSync(envPath)) {
  console.error('.env file not found ❌');
  process.exit(1);
}
dotenv.config({ path: envPath });

// Validate critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'PAYSTACK_SECRET_KEY']; // Add other required variables here
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')} ❌`);
  process.exit(1);
}

console.log('DOTENV TEST:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Not loaded');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('.env file path:', envPath);

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', router);

// Google OAuth callback
app.get('/api/auth/google/callback', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  res.redirect(`http://localhost:3000/auth/google/callback?code=${code}`);
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => await authMiddleware(req),
});

async function startServer() {
  try {
    await connectDB();
    await server.start();
    server.applyMiddleware({ app });
    app.use(errorHandler);
    app.listen({ port: config.port }, () =>
      console.log(`Server running at http://localhost:${config.port}${server.graphqlPath}`)
    );
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

startServer();