# sistemium-auth

Sistemium AAA (Authentication, Authorization, and Accounting) helpers for Node.js applications.

## Installation

```bash
npm install sistemium-auth
```

## Features

- 🔐 SMS-based authentication via Sistemium PHA service
- 🔑 Token validation with role-based access control
- 💾 Optional Redis caching for auth responses
- 🎯 Multiple instance support with different configurations
- 📦 TypeScript support with full type definitions
- 🧪 Fully tested with Jest

## Quick Start

```typescript
import { Auth, tokenAuth } from 'sistemium-auth';

// Create an Auth instance
const auth = new Auth({
  rolesUrl: 'https://api.sistemium.com/pha/roles',
  authUrl: 'https://api.sistemium.com/pha/auth',
});

// Use as Koa middleware with Redis caching
const authMiddleware = tokenAuth(auth, {
  requiredRole: 'admin',
  registerUser: async (authResponse) => {
    // Optional: register or sync user in your database
    return {
      ...authResponse,
      roles: { ...authResponse.roles, registered: true },
    };
  },
});

app.use(authMiddleware);
```

## API

### Auth Class

```typescript
import { Auth } from 'sistemium-auth';

const auth = new Auth({
  rolesUrl: 'https://custom.api/roles',  // optional
  authUrl: 'https://custom.api/auth',    // optional
});
```

Configuration falls back to environment variables `PHA_ROLES_URL` and `PHA_AUTH_URL`, then to defaults.

#### Methods

- `roles(token: string): Promise<AuthResponse>` - Fetch user account and roles
- `login(phone: string): Promise<string>` - Initiate SMS authentication
- `confirm(code: string, id: string): Promise<any>` - Verify SMS code

### Middleware Functions

#### tokenAuth (with Redis caching)

```typescript
import { Auth, tokenAuth } from 'sistemium-auth';

const auth = new Auth();
const middleware = tokenAuth(auth, {
  requiredRole: 'admin',      // optional
  registerUser: async (auth) => { ... },  // optional
});
```

Redis caching is controlled by `AUTH_EXPIRE` environment variable (default: 300 seconds).

#### middleware (without caching)

```typescript
import { Auth, middleware } from 'sistemium-auth';

const auth = new Auth();
const mw = middleware(auth, {
  requiredRole: 'user',
});
```

Both middleware functions set the following on Koa context state:
- `state.roles` - User roles object
- `state.account` - User account information
- `state.authId` - User auth ID (tokenAuth only)

## Migration from v1.2.x

Version 1.3.0 introduces breaking changes for better flexibility and multiple instance support.

**Before (v1.2.x)**:
```typescript
import { tokenAuth } from 'sistemium-auth';
const mw = tokenAuth({ requiredRole: 'admin' });
```

**After (v1.3.x)**:
```typescript
import { Auth, tokenAuth } from 'sistemium-auth';
const auth = new Auth();
const mw = tokenAuth(auth, { requiredRole: 'admin' });
```

## Multiple Instances

```typescript
import { Auth, tokenAuth } from 'sistemium-auth';

// Different auth services
const prodAuth = new Auth({ rolesUrl: 'https://prod.api/roles' });
const testAuth = new Auth({ rolesUrl: 'https://test.api/roles' });

const prodMw = tokenAuth(prodAuth, { requiredRole: 'admin' });
const testMw = tokenAuth(testAuth);
```

## Environment Variables

- `PHA_ROLES_URL` - Default roles endpoint (fallback: `https://api.sistemium.com/pha/roles`)
- `PHA_AUTH_URL` - Default auth endpoint (fallback: `https://api.sistemium.com/pha/auth`)
- `AUTH_EXPIRE` - Redis cache TTL in seconds (default: 300)

## TypeScript

Full TypeScript support with exported types:

```typescript
import {
  Auth,
  AuthConfig,
  AuthResponse,
  TokenAuthConfig,
  AuthCallback
} from 'sistemium-auth';
```

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
```

## Development

```bash
npm run watch         # Build in watch mode
npx tsc              # Build once
```

## License

ISC

## Author

Alexander Levin

## Repository

https://github.com/Sistemium/sistemium-auth
