import Auth from '../auth';
import middleware from '../middleware';
import { AuthResponse } from '../types';

describe('middleware', () => {

  let mockAuth: jest.Mocked<Auth>;
  let mockCtx: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
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

  it('should authorize valid token and set state', async () => {
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

    const mw = middleware(mockAuth);
    await mw(mockCtx, mockNext);

    expect(mockAuth.roles).toHaveBeenCalledWith('Bearer token123');
    expect(mockCtx.state.roles).toEqual({ user: true });
    expect(mockCtx.state.account).toEqual(mockResponse.account);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw 401 if no authorization header', async () => {
    mockCtx.header.authorization = null;

    const mw = middleware(mockAuth);
    await expect(mw(mockCtx, mockNext)).rejects.toThrow('Assert failed: 401');

    expect(mockAuth.roles).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw 403 if required role is missing', async () => {
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

    const mw = middleware(mockAuth, { requiredRole: 'admin' });
    await expect(mw(mockCtx, mockNext)).rejects.toThrow('Assert failed: 403');

    expect(mockAuth.roles).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should allow access if required role is present', async () => {
    const mockResponse: AuthResponse = {
      account: {
        authId: '123',
        name: 'Test User',
        email: 'test@example.com',
        'mobile-number': '+1234567890',
      },
      roles: { admin: true, user: true },
    };

    mockAuth.roles.mockResolvedValue(mockResponse);

    const mw = middleware(mockAuth, { requiredRole: 'admin' });
    await mw(mockCtx, mockNext);

    expect(mockAuth.roles).toHaveBeenCalled();
    expect(mockCtx.state.roles).toEqual({ admin: true, user: true });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle auth errors', async () => {
    mockAuth.roles.mockRejectedValue(new Error('Invalid token'));

    const mw = middleware(mockAuth);
    await expect(mw(mockCtx, mockNext)).rejects.toThrow();

    expect(mockCtx.throw).toHaveBeenCalledWith(401, expect.any(Error));
    expect(mockNext).not.toHaveBeenCalled();
  });

});
