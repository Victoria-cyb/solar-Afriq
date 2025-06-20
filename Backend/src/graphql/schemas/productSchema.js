import { gql } from 'apollo-server-express';

export const productTypeDefs = gql`
  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
    createdAt: String!
  }

  input ProductInput {
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
  }

  input ProductFiltersInput {
    category: String
    priceRange: PriceRangeInput
  }

  input PriceRangeInput {
    min: Float
    max: Float
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
    searchProducts(query: String, filters: ProductFiltersInput): [Product!]!
  }

  type Mutation {
    createProduct(input: ProductInput!): Product!
  }
`;