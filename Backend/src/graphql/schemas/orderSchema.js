import { gql } from 'apollo-server-express';

export const orderTypeDefs = gql`
  type Order {
    id: ID!
    user: User!
    guestId: String
    items: [OrderItem!]!
    total: Float!
    status: String!
    paymentReference: String
    createdAt: String!
  }

  type OrderItem {
    product: Product!
    quantity: Int!
  }

  type PaymentResponse {
    authorizationUrl: String!
    accessCode: String!
    reference: String!
  }

  type Query {
    order(id: ID!): Order
    orders: [Order!]!
  }

  type Mutation {
    createOrder(items: [OrderItemInput!]!, guestId: String, email: String): PaymentResponse!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }
`;