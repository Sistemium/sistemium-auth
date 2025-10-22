# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library (`sistemium-auth`) that provides authentication and authorization helpers for Node.js applications. It's published as an npm package with the compiled JavaScript output in the `lib/` directory.

## Build and Development Commands

- **Build**: `npx tsc` - Compile TypeScript to JavaScript (output to `lib/`)
- **Watch mode**: `npm run watch` - Automatically rebuild on file changes using tsc-watch
- **Test**: `npm test` - Run Jest tests
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
   - **Breaking change from v1.2.x**: First parameter is now an `Auth` instance
   - Second parameter is `TokenAuthConfig` (optional)
   - Returns Koa-style middleware that validates authorization headers
   - Uses `sistemium-redis` for caching auth responses (configurable via AUTH_EXPIRE env var)
   - Supports optional `registerUser` callback for user registration/sync
   - Supports optional `requiredRole` for role-based access control
   - Sets `state.roles`, `state.account`, and `state.authId` on successful authentication

3. **middleware** ([src/middleware.ts](src/middleware.ts)) - Simpler middleware without Redis caching:
   - **Breaking change from v1.2.x**: First parameter is now an `Auth` instance
   - Second parameter is `TokenAuthConfig` (optional)
   - Similar to tokenAuth but without caching layer
   - Use this when Redis is not available or caching is not needed

### Migration from v1.2.x to v1.3.x

**Old usage (v1.2.x)**:
```typescript
import { tokenAuth } from 'sistemium-auth';
const mw = tokenAuth({ requiredRole: 'admin' });
```

**New usage (v1.3.x)**:
```typescript
import { Auth, tokenAuth } from 'sistemium-auth';
const auth = new Auth({ rolesUrl: 'https://custom.api/roles' });
const mw = tokenAuth(auth, { requiredRole: 'admin' });
```

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

Tests are located in [src/__tests__/](src/__tests__/) and use Jest with ts-jest:
- [auth.test.ts](src/__tests__/auth.test.ts) - Tests for Auth class
- [middleware.test.ts](src/__tests__/middleware.test.ts) - Tests for middleware function
- [tokenAuth.test.ts](src/__tests__/tokenAuth.test.ts) - Tests for tokenAuth with Redis mocking

## Package Configuration

- **Target**: ES2020, CommonJS modules
- **Strict mode**: Enabled with noUnusedLocals
- **Output**: `lib/` directory with declaration files
- **Dependencies**: axios, sistemium-debug, sistemium-redis
- **Dev Dependencies**: Jest, ts-jest, TypeScript, tsc-watch
