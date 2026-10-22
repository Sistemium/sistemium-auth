import log from 'sistemium-debug';
import { setAsync, getAsync, client } from 'sistemium-redis';
import { fetchRoles, middlewareArgs } from './compat';
import { AuthCallback, AuthMiddleware, AuthResponse, RolesProvider, TokenAuthConfig } from './types';

const { debug, error } = log('auth');
const AUTH_EXPIRE = parseInt(process.env.AUTH_EXPIRE || '300', 0);
const USE_REDIS = AUTH_EXPIRE > 0 && client;


export default function tokenAuth(auth: RolesProvider, config?: TokenAuthConfig): AuthMiddleware;
/** 1.2.x form: uses the default Auth (PHA_ROLES_URL or the Sistemium endpoint) */
export default function tokenAuth(config?: TokenAuthConfig): AuthMiddleware;
export default function tokenAuth(
  authOrConfig?: RolesProvider | TokenAuthConfig,
  maybeConfig?: TokenAuthConfig,
): AuthMiddleware {

  const [auth, config] = middlewareArgs(authOrConfig, maybeConfig);

  const {
    requiredRole,
    registerUser,
  } = config;

  return async (ctx: Record<string, any>, next: () => Promise<any>) => {

    const { header: { authorization }, assert, state } = ctx;

    assert(authorization, 401);

    try {

      const { account, roles } = await cachedAuth(auth, authorization, registerUser);

      if (requiredRole) {
        assert(roles[requiredRole], 403);
      }

      debug('authorized:', `"${account.name}"`);

      state.roles = roles;
      state.account = account;
      state.authId = account.authId;

    } catch (e: any) {
      error('auth:', e.message);
      ctx.throw(401, e);
    }

    await next();

  };

}

async function cachedAuth(auth: RolesProvider, authorization: string, registerUser?: AuthCallback): Promise<AuthResponse> {

  const cached = USE_REDIS && await getAsync(authorization);

  if (cached) {
    return JSON.parse(cached);
  }

  const authResponse = await fetchRoles(auth, authorization);
  const account = registerUser ? await registerUser(authResponse) : authResponse;
  const res = {
    ...authResponse,
    roles: {
      ...(authResponse.roles || {}),
      ...(account.roles || {}),
    },
  };

  if (USE_REDIS && res) {
    await saveAuth(authorization, res);
  }

  return res;

}


async function saveAuth(authorization: string, auth: Record<string, any>) {
  const saved = await setAsync(authorization, JSON.stringify(auth), 'EX', AUTH_EXPIRE);
  debug('savedAuth', authorization, saved);
}
