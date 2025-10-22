import Auth from '../auth';
import tokenAuth from '../tokenAuth';
import { AuthResponse, AuthCallback } from '../types';

jest.mock('sistemium-redis', () => ({
  client: true,
  getAsync: jest.fn().mockResolvedValue(null),
  setAsync: jest.fn().mockResolvedValue('OK'),
}));

import * as redis from 'sistemium-redis';

describe('tokenAuth', () => {

  let mockAuth: jest.Mocked<Auth>;
  let mockCtx: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth = {
      roles: jest.fn(),
      login: jest.fn(),
      confirm: jest.fn(),
    } as any;

    mockCtx = {
      header: { authorization: 'Bearer token123' },
      assert: jest.fn((condition, code) => {
        if (!condition) throw new Error(`Assert failed: ${code}`);
      }),
      state: {},
      throw: jest.fn((code, error) => {
        throw error || new Error(`HTTP ${code}`);
      }),
    };

    mockNext = jest.fn();
  });

  it('should authorize and cache result in Redis', async () => {
    const mockResponse: AuthResponse = {
      account: {
        authId: '123',
        name: 'Test User',
        email: 'test@example.com',
        'mobile-number': '+1234567890',
      },
      roles: { user: true },
    };

    mockAuth.roles.mockResolvedValue(mockResponse);

    const mw = tokenAuth(mockAuth);
    await mw(mockCtx, mockNext);

    expect(mockAuth.roles).toHaveBeenCalledWith('Bearer token123');
    expect(mockCtx.state.roles).toEqual({ user: true });
    expect(mockCtx.state.account).toEqual(mockResponse.account);
    expect(mockCtx.state.authId).toBe('123');
    expect(redis.setAsync).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use cached data if available', async () => {
    const cachedResponse: AuthResponse = {
      account: {
        authId: '456',
        name: 'Cached User',
        email: 'cached@example.com',
        'mobile-number': '+9999999999',
      },
      roles: { admin: true },
    };

    (redis.getAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedResponse));

    const mw = tokenAuth(mockAuth);
    await mw(mockCtx, mockNext);

    expect(mockAuth.roles).not.toHaveBeenCalled();
    expect(mockCtx.state.roles).toEqual({ admin: true });
    expect(mockCtx.state.account).toEqual(cachedResponse.account);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call registerUser callback if provided', async () => {
    const mockResponse: AuthResponse = {
      account: {
        authId: '123',
        name: 'Test User',
        email: 'test@example.com',
        'mobile-number': '+1234567890',
      },
      roles: { user: true },
    };

    const registerUser: AuthCallback = jest.fn().mockResolvedValue({
      ...mockResponse,
      roles: { user: true, registered: true },
      customField: 'custom-value',
    });

    mockAuth.roles.mockResolvedValue(mockResponse);

    const mw = tokenAuth(mockAuth, { registerUser });
    await mw(mockCtx, mockNext);

    expect(registerUser).toHaveBeenCalledWith(mockResponse);
    expect(mockCtx.state.roles).toEqual({ user: true, registered: true });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should merge roles from auth and registerUser', async () => {
    const mockResponse: AuthResponse = {
      account: {
        authId: '123',
        name: 'Test User',
        email: 'test@example.com',
        'mobile-number': '+1234567890',
      },
      roles: { user: true, fromAuth: true },
    };

    const registerUser: AuthCallback = jest.fn().mockResolvedValue({
      ...mockResponse,
      roles: { registered: true, fromCallback: true },
    });

    mockAuth.roles.mockResolvedValue(mockResponse);

    const mw = tokenAuth(mockAuth, { registerUser });
    await mw(mockCtx, mockNext);

    expect(mockCtx.state.roles).toEqual({
      user: true,
      fromAuth: true,
      registered: true,
      fromCallback: true,
    });
  });

  it('should enforce required role', async () => {
    const mockResponse: AuthResponse = {
      account: {
        authId: '123',
        name: 'Test User',
        email: 'test@example.com',
        'mobile-number': '+1234567890',
      },
      roles: { user: true },
    };

    mockAuth.roles.mockResolvedValue(mockResponse);

    const mw = tokenAuth(mockAuth, { requiredRole: 'admin' });
    await expect(mw(mockCtx, mockNext)).rejects.toThrow('Assert failed: 403');

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle missing authorization header', async () => {
    mockCtx.header.authorization = null;

    const mw = tokenAuth(mockAuth);
    await expect(mw(mockCtx, mockNext)).rejects.toThrow('Assert failed: 401');

    expect(mockAuth.roles).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

});
