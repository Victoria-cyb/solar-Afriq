
import { gql } from 'apollo-server-express';

export const userTypeDefs = gql`
  type User {
    id: ID!
    email: String!
    phoneNumber: String
    name: String
    role: String!
    address: String
    isEmailVerified: Boolean
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type SignupPayload {
    message: String!
  }

  type Query {
    me: User
  }

  type Mutation {
    signup(email: String!, password: String!, name: String, phoneNumber: String, role: String, address: String): SignupPayload
    login(email: String!, password: String!): AuthPayload
    googleSignup(code: String!): SignupPayload
    sendVerificationEmail(email: String!): SignupPayload!
    verifyEmail(email: String!, otp: String!): AuthPayload
    becomeInstaller(skills: [String!]!, address: String!): User
    resendOTP(email: String!): SignupPayload!  # New mutation for resending OTP
  }
`;