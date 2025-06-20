import Contact from '../../models/Contact.js';
import { sendContactEmail } from '../../services/emailService.js';

export const contactResolvers = {
  Mutation: {
    sendContactEmail: async (_, { name, email, message }) => {
      const contact = await Contact.create({ name, email, message });
      await sendContactEmail({ name, email, message });
      return contact;
    },
  },
};