// File: src/graphql/schemas/guestSchema.js
import { gql } from 'apollo-server-express';

export const guestTypeDefs = gql`
  type Guest {
    guestId: ID!
    name: String
    email: String
    phone: String
    address: String
    createdAt: String!
  }

  input GuestInput {
    name: String
    email: String
    phone: String
    address: String
  }

  type Mutation {
    saveGuestDetails(input: GuestInput!): Guest!
  }
`;