import { gql } from 'apollo-server-express';

export const contactTypeDefs = gql`
  type Contact {
    id: ID!
    name: String!
    email: String!
    message: String!
    createdAt: String!
  }

  type Mutation {
    sendContactEmail(name: String!, email: String!, message: String!): Contact
  }
`;