// File: src/graphql/schemas/installerSchema.js
import { gql } from 'apollo-server-express';

export const installerTypeDefs = gql`
  type Installer {
    id: ID!
    userId: ID!
    skills: [String!]!
    address: String!
    rating: Float!
  }

  type Query {
    findNearbyInstallers(name: String, email: String!, address: String!, maxDistance: Float, guestId: String): [Installer]
  }
`;