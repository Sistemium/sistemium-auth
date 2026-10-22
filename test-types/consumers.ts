// Type-level check: every call form that dependent projects use must compile, wrong ones must not
import Koa from 'koa';
import middleware from 'sistemium-auth/lib/middleware';
import tokenAuth from 'sistemium-auth/lib/tokenAuth';
import Auth, { roles as getRoles, login, confirm } from 'sistemium-auth/lib/auth';
import * as root from 'sistemium-auth';
import { AuthResponse, AuthMiddleware, RolesProvider, TokenAuthConfig } from 'sistemium-auth';

const app = new Koa();
const auth = new Auth({ rolesUrl: 'http://localhost/roles' });

// 1.2.x: SAW, ae-api, gapi
app.use(middleware({ requiredRole: 'role' }));
app.use(middleware({ requiredRole: '' }));
app.use(tokenAuth({ requiredRole: 'role', registerUser: async a => ({ ...a, roles: {} }) }));

// 1.3
app.use(middleware(auth));
app.use(middleware(auth, { requiredRole: 'role' }));
app.use(tokenAuth(auth, { requiredRole: 'role' }));
app.use(root.middleware(auth, { requiredRole: 'role' }));
app.use(root.tokenAuth(new root.Auth()));

// no arguments: the default Auth
app.use(middleware());
app.use(tokenAuth());

// anything with roles() is accepted as the auth client
const provider: RolesProvider = { roles: getRoles };
app.use(middleware(provider, { requiredRole: 'role' }));

// 1.2.x lib/auth functions: bs-api
const rolesResult: Promise<AuthResponse> = getRoles('token');
const loginResult: Promise<string> = login('+37060000000');
const confirmResult: Promise<any> = confirm('1234', 'id');

// 1.2.x root namespace
const nsRoles: Promise<AuthResponse> = root.auth.roles('token');
const nsLogin: Promise<string> = root.auth.login('+37060000000');

// 1.3 class
const classRoles: Promise<AuthResponse> = auth.roles('token');

const config: TokenAuthConfig = { requiredRole: 'role' };
const mw: AuthMiddleware = middleware(config);

// @ts-expect-error requiredRole is a string
middleware({ requiredRole: 1 });
// @ts-expect-error the second argument is a config, not an auth client
middleware(auth, auth);
// @ts-expect-error unknown config option
tokenAuth({ requiredRol: 'role' });
// @ts-expect-error a config is not an auth client
middleware({ requiredRole: 'role' }, { requiredRole: 'role' });

export {
  rolesResult, loginResult, confirmResult, nsRoles, nsLogin, classRoles, mw,
};
