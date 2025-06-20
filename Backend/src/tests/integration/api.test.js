import request from 'supertest';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { typeDefs, resolvers } from '../../src/graphql/schema.js';
import { connectDB } from '../../src/config/db.js';
import { authMiddleware } from '../../src/middleware/auth.js';

describe('GraphQL API Integration Tests', () => {
  let server;
  let app;

  beforeAll(async () => {
    // Set up test server
    app = express();
    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: async ({ req }) => await authMiddleware(req),
    });
    await server.start();
    server.applyMiddleware({ app });

    // Connect to test database
    await connectDB(); // Ensure MONGO_URI points to a test database
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should sign up a new user', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            signup(email: "test@example.com", password: "password123", role: "user") {
              token
              user { id, email, role }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.signup).toHaveProperty('token');
    expect(response.body.data.signup.user.email).toBe('test@example.com');
    expect(response.body.data.signup.user.role).toBe('user');
  });

  it('should log in an existing user', async () => {
    // Pre-create a user
    await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            signup(email: "login@example.com", password: "password123", role: "user") {
              token
            }
          }
        `,
      });

    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(email: "login@example.com", password: "password123") {
              token
              user { id, email, role }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.login).toHaveProperty('token');
    expect(response.body.data.login.user.email).toBe('login@example.com');
  });

  it('should return an error for invalid login credentials', async () => {
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          mutation {
            login(email: "wrong@example.com", password: "wrongpassword") {
              token
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0].message).toBe('Invalid credentials');
  });
});