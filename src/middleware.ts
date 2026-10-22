import log from 'sistemium-debug';
import { fetchRoles, middlewareArgs } from './compat';
import { AuthMiddleware, RolesProvider, TokenAuthConfig } from './types';

const { debug, error } = log('auth');

export default function middleware(auth: RolesProvider, config?: TokenAuthConfig): AuthMiddleware;
/** 1.2.x form: uses the default Auth (PHA_ROLES_URL or the Sistemium endpoint) */
export default function middleware(config?: TokenAuthConfig): AuthMiddleware;
export default function middleware(
  authOrConfig?: RolesProvider | TokenAuthConfig,
  maybeConfig?: TokenAuthConfig,
): AuthMiddleware {

  const [auth, config] = middlewareArgs(authOrConfig, maybeConfig);
  const { requiredRole } = config;

  return async (ctx: Record<string, any>, next: () => Promise<any>) => {

    const { header: { authorization }, assert, state } = ctx;
    assert(authorization, 401);

    try {

      const { account, roles } = await fetchRoles(auth, authorization);

      if (requiredRole) {
        assert(roles[requiredRole], 403);
      }

      debug('authorized:', `"${account.name}"`);
      state.roles = roles;
      state.account = account;

    } catch (e: any) {
      error('auth:', e.message);
      ctx.throw(401, e);
    }

    await next();

  };
}
