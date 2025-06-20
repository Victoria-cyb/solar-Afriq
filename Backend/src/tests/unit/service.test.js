import { signup, login } from '../../src/services/authService.js';
import { searchProducts } from '../../src/services/searchService.js';
import User from '../../src/models/User.js';
import Product from '../../src/models/Product.js';
import bcrypt from 'bcryptjs';

jest.mock('../../src/models/User.js');
jest.mock('../../src/models/Product.js');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sign up a new user', async () => {
    User.create.mockResolvedValue({
      _id: '123',
      email: 'test@example.com',
      role: 'user',
      password: await bcrypt.hash('password123', 10),
    });

    const result = await signup('test@example.com', 'password123', 'user');
    expect(User.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: expect.any(String),
      role: 'user',
    });
    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should throw an error for invalid login', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(login('wrong@example.com', 'password123')).rejects.toThrow('Invalid credentials');
  });
});

describe('Search Service', () => {
  it('should search products with filters', async () => {
    Product.find.mockResolvedValue([
      { _id: '1', name: 'Laptop', price: 799.99, category: 'electronics' },
    ]);

    const result = await searchProducts({ query: 'laptop', filters: { category: 'electronics', priceRange: { min: 500, max: 1000 } } });
    expect(Product.find).toHaveBeenCalledWith({
      $text: { $search: 'laptop' },
      category: 'electronics',
      price: { $gte: 500, $lte: 1000 },
    });
    expect(result[0].name).toBe('Laptop');
  });
});