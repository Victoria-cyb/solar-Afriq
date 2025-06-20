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

const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found ❌');
  process.exit(1);
}
dotenv.config({ path: envPath });
console.log('DOTENV TEST:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Not loaded');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('.env file found at:', envPath);

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

app.use('/api', router);

// Google OAuth callback
app.get('/api/auth/google/callback', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  // Redirect to frontend with code (frontend will call googleSignup mutation)
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