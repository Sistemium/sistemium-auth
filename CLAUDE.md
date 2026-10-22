# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library (`sistemium-auth`) that provides authentication and authorization helpers for Node.js applications. It's published as an npm package with the compiled JavaScript output in the `lib/` directory.

## Build and Development Commands

- **Build**: `npm run build` - Clean `lib/` and compile TypeScript into it
- **Watch mode**: `npm run watch` - Automatically rebuild on file changes using tsc-watch
- **Test**: `npm test` - Build, type-check `test-types/consumers.ts` against `lib/*.d.ts`, run Jest (also runs before `npm publish`)
- **Test (watch)**: `npm run test:watch` - Run tests in watch mode

## Architecture

### Core Modules

The library exports three main components:

1. **Auth Class** ([src/auth.ts](src/auth.ts)) - Core authentication class that interacts with the Sistemium PHA API:
   - Constructor accepts `AuthConfig` with optional `rolesUrl` and `authUrl` parameters
   - Falls back to env variables (`PHA_ROLES_URL`, `PHA_AUTH_URL`) or defaults if not provided
   - Supports multiple instances with different configurations
   - Methods:
     - `roles(token)` - Fetch user account and roles from the configured roles endpoint
     - `login(phone)` - Initiate SMS-based authentication
     - `confirm(code, id)` - Verify SMS code and complete authentication

2. **tokenAuth** ([src/tokenAuth.ts](src/tokenAuth.ts)) - Middleware factory with Redis caching:
   - Accepts `(auth, config?)` (1.3) and `(config?)` (1.2.x, uses the default Auth)
   - Returns Koa-style middleware that validates authorization headers
   - Uses `sistemium-redis` for caching auth responses (configurable via AUTH_EXPIRE env var)
   - Supports optional `registerUser` callback for user registration/sync
   - Supports optional `requiredRole` for role-based access control
   - Sets `state.roles`, `state.account`, and `state.authId` on successful authentication

3. **middleware** ([src/middleware.ts](src/middleware.ts)) - Simpler middleware without Redis caching:
   - Accepts `(auth, config?)` (1.3) and `(config?)` (1.2.x, uses the default Auth)
   - Similar to tokenAuth but without caching layer
   - Use this when Redis is not available or caching is not needed

### Compatibility with v1.2.x

1.3.0 dropped the 1.2.x API in a minor release and broke dependents (bs-api, SAW, gapi, ae-api use it). 1.3.1 restores it next to the 1.3 API; keep both working:

- `src/compat.ts`: `middlewareArgs()` tells the two call forms apart by whether the first argument has a `roles()` function; `fetchRoles()` drops the HTTP status axios 1.x puts on its errors, so a failed roles request stays a 401
- `src/auth.ts`: the named `roles`, `login`, `confirm` (1.2.x) build a default `Auth` per call, so `PHA_*_URL` are read at call time
- `src/index.ts`: exports the `auth` namespace (1.2.x) besides `Auth`, `middleware`, `tokenAuth`
- `lib/middleware` must not import `sistemium-redis`

### Multiple Instance Support

You can now create multiple Auth instances with different configurations:

```typescript
import { Auth, tokenAuth } from 'sistemium-auth';

const prodAuth = new Auth({ rolesUrl: 'https://prod.api/roles' });
const testAuth = new Auth({ rolesUrl: 'https://test.api/roles' });

const prodMw = tokenAuth(prodAuth, { requiredRole: 'admin' });
const testMw = tokenAuth(testAuth);
```

### Authentication Flow

The library integrates with Sistemium's PHA (Phone Auth) service:
- Default endpoints: `https://api.sistemium.com/pha/auth` and `https://api.sistemium.com/pha/roles`
- Override via constructor config or environment variables (`PHA_AUTH_URL`, `PHA_ROLES_URL`)
- Uses bearer token authorization headers

### Redis Caching

The tokenAuth middleware uses Redis caching when:
- `AUTH_EXPIRE > 0` (defaults to 300 seconds)
- Redis client is available from `sistemium-redis`
- Cache key is the authorization token itself

### Type Definitions

See [src/types.ts](src/types.ts) for:
- `AuthResponse` - Structure returned from PHA roles endpoint
- `AuthConfig` - Configuration for Auth class constructor
- `TokenAuthConfig` - Configuration for middleware factories
- `AuthCallback` - Type for registerUser callback functions

## Testing

Tests are located in [src/__tests__/](src/__tests__/) and use Jest with ts-jest. They need no network and no Redis ([jest.setup.js](jest.setup.js) sets `REDIS_AUTO_CONNECT=false`):
- [auth.test.ts](src/__tests__/auth.test.ts) - Tests for Auth class
- [middleware.test.ts](src/__tests__/middleware.test.ts) - Tests for middleware function
- [tokenAuth.test.ts](src/__tests__/tokenAuth.test.ts) - Tests for tokenAuth with Redis mocking
- [middlewareForms.test.ts](src/__tests__/middlewareForms.test.ts) - Both call forms of middleware and tokenAuth in a real Koa app against [fakePha.ts](src/__tests__/fakePha.ts)
- [legacyApi.test.ts](src/__tests__/legacyApi.test.ts) - The 1.2.x functions and the package root exports
- [test-types/consumers.ts](test-types/consumers.ts) - Type-level check of every call form, compiled against `lib/*.d.ts`

## Package Configuration

- **Target**: ES2020, CommonJS modules
- **Strict mode**: Enabled with noUnusedLocals
- **Output**: `lib/` directory with declaration files
- **Dependencies**: axios 1.x, sistemium-debug, sistemium-redis
- **Dev Dependencies**: Jest, ts-jest, Koa, supertest, TypeScript, tsc-watch
- `lib/auth.js`, `lib/middleware.js`, `lib/tokenAuth.js` are tracked in git although `lib` is in `.gitignore`; the other `lib/` files are not. npm publishes `lib/` from the working tree
