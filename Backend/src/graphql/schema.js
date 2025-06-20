import { gql } from 'apollo-server-express';
import { userTypeDefs } from './schemas/userSchema.js';
import { productTypeDefs } from './schemas/productSchema.js';
import { installerTypeDefs } from './schemas/installerSchema.js';
import { contactTypeDefs } from './schemas/contactSchema.js';
import { orderTypeDefs } from './schemas/orderSchema.js';
import { guestTypeDefs } from './schemas/guestSchema.js';
import { userResolvers } from './resolvers/userResolver.js';
import { productResolvers } from './resolvers/productResolver.js';
import { installerResolvers } from './resolvers/installerResolver.js';
import { contactResolvers } from './resolvers/contactResolver.js';
import { orderResolvers } from './resolvers/orderResolver.js';
import { guestResolvers } from './resolvers/guestResolver.js';

export const typeDefs = [
  gql`
    type Query
    type Mutation
  `,
  userTypeDefs,
  productTypeDefs,
  installerTypeDefs,
  contactTypeDefs,
  orderTypeDefs,
  guestTypeDefs
];

export const resolvers = [
  userResolvers,
  productResolvers,
  installerResolvers,
  contactResolvers,
  orderResolvers,
  guestResolvers
];