import axios from 'axios';
import Auth from '../auth';
import { AuthResponse } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Auth', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {

    it('should use default URLs when no config provided', () => {
      const auth = new Auth();
      expect(auth).toBeInstanceOf(Auth);
    });

    it('should use custom URLs from config', () => {
      const auth = new Auth({
        rolesUrl: 'https://custom.com/roles',
        authUrl: 'https://custom.com/auth',
      });
      expect(auth).toBeInstanceOf(Auth);
    });

    it('should fall back to env variables', () => {
      process.env.PHA_ROLES_URL = 'https://env.com/roles';
      process.env.PHA_AUTH_URL = 'https://env.com/auth';
      const auth = new Auth();
      expect(auth).toBeInstanceOf(Auth);
      delete process.env.PHA_ROLES_URL;
      delete process.env.PHA_AUTH_URL;
    });

  });

  describe('roles', () => {

    it('should fetch roles with authorization token', async () => {
      const mockResponse: AuthResponse = {
        account: {
          authId: '123',
          name: 'Test User',
          email: 'test@example.com',
          'mobile-number': '+1234567890',
        },
        roles: { admin: true },
      };

      mockedAxios.get.mockResolvedValue({ data: mockResponse });

      const auth = new Auth({ rolesUrl: 'https://test.com/roles' });
      const result = await auth.roles('Bearer token123');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://test.com/roles', {
        headers: { authorization: 'Bearer token123' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Unauthorized'));

      const auth = new Auth();
      await expect(auth.roles('invalid-token')).rejects.toThrow('Unauthorized');
    });

  });

  describe('login', () => {

    it('should initiate login with phone number', async () => {
      const mockId = 'session-123';
      mockedAxios.post.mockResolvedValue({ data: { ID: mockId } });

      const auth = new Auth({ authUrl: 'https://test.com/auth' });
      const result = await auth.login('+1234567890');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/auth',
        'mobileNumber=+1234567890',
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      expect(result).toBe(mockId);
    });

  });

  describe('confirm', () => {

    it('should confirm SMS code', async () => {
      const mockAuthData = { token: 'auth-token-123', userId: '456' };
      mockedAxios.post.mockResolvedValue({ data: mockAuthData });

      const auth = new Auth({ authUrl: 'https://test.com/auth' });
      const result = await auth.confirm('1234', 'session-123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.com/auth',
        { ID: 'session-123', smsCode: '1234' },
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
      expect(result).toEqual(mockAuthData);
    });

  });

  describe('multiple instances', () => {

    it('should allow multiple Auth instances with different configs', async () => {
      const auth1 = new Auth({ rolesUrl: 'https://api1.com/roles' });
      const auth2 = new Auth({ rolesUrl: 'https://api2.com/roles' });

      const mockResponse1: AuthResponse = {
        account: { authId: '1', name: 'User 1', email: 'user1@test.com', 'mobile-number': '+1111111111' },
        roles: { user: true },
      };

      const mockResponse2: AuthResponse = {
        account: { authId: '2', name: 'User 2', email: 'user2@test.com', 'mobile-number': '+2222222222' },
        roles: { admin: true },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockResponse1 })
        .mockResolvedValueOnce({ data: mockResponse2 });

      const result1 = await auth1.roles('token1');
      const result2 = await auth2.roles('token2');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://api1.com/roles', expect.any(Object));
      expect(mockedAxios.get).toHaveBeenCalledWith('https://api2.com/roles', expect.any(Object));
      expect(result1).toEqual(mockResponse1);
      expect(result2).toEqual(mockResponse2);
    });

  });

});
