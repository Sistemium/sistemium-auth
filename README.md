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

Redis caching is controlled by `AUTH_EXPIRE` environment variable (default: 300 seconds). `sistemium-redis` connects to Redis when it is loaded (`REDIS_HOST`, `REDIS_PORT`); with `REDIS_AUTO_CONNECT=false` or `AUTH_EXPIRE=0` nothing is cached. If Redis is configured but unreachable, tokenAuth answers 401. Importing the package root loads tokenAuth and so `sistemium-redis`; `sistemium-auth/lib/middleware` does not.

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

## Compatibility with v1.2.x

Version 1.3.0 changed the middleware signature and removed the 1.2.x functions, which broke existing projects. Since 1.3.1 both APIs work:

```typescript
// 1.2.x: the default Auth (PHA_ROLES_URL or the Sistemium endpoint)
import middleware from 'sistemium-auth/lib/middleware';
import { roles } from 'sistemium-auth/lib/auth';
import { tokenAuth, auth } from 'sistemium-auth';

app.use(middleware({ requiredRole: 'admin' }));
app.use(tokenAuth({ requiredRole: 'admin' }));
const { account } = await roles(token);   // or auth.roles(token)

// 1.3: an explicit Auth instance
import { Auth, middleware, tokenAuth } from 'sistemium-auth';

const pha = new Auth();
app.use(middleware(pha, { requiredRole: 'admin' }));
app.use(tokenAuth(pha, { requiredRole: 'admin' }));
```

`middleware` and `tokenAuth` take an auth client when their first argument has a `roles()` method, otherwise they treat it as the config. The 1.2.x functions read `PHA_ROLES_URL` / `PHA_AUTH_URL` on every call.

A failed roles request (any HTTP error from the roles server, or no connection) always answers 401, a missing `requiredRole` answers 403.

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
- `REDIS_AUTO_CONNECT=false` - do not connect to Redis (handled by `sistemium-redis`)

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
npm test              # Build lib, check the consumer types (test-types/), run Jest
npm run test:watch    # Run tests in watch mode
```

The tests run against a local fake PHA server and need neither network nor Redis.

## Development

```bash
npm run watch         # Build in watch mode
npm run build         # Clean build of lib/
```

## License

ISC

## Author

Alexander Levin

## Repository

https://github.com/Sistemium/sistemium-auth
