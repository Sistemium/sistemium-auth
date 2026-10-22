import http from 'axios';
import { roles } from './auth';
import { AuthResponse, RolesProvider, TokenAuthConfig } from './types';

// Used by the 1.2.x call form, middleware(config) / tokenAuth(config)
const defaultAuth: RolesProvider = { roles };

export function isRolesProvider(arg: unknown): arg is RolesProvider {
  return !!arg && typeof (arg as RolesProvider).roles === 'function';
}

/**
 * Accepts both middleware call forms: (auth, config) since 1.3 and (config) from 1.2.x
 */
export function middlewareArgs(
  authOrConfig?: RolesProvider | TokenAuthConfig,
  config?: TokenAuthConfig,
): [RolesProvider, TokenAuthConfig] {
  if (isRolesProvider(authOrConfig)) {
    return [authOrConfig, config || {}];
  }
  return [defaultAuth, authOrConfig || {}];
}

/**
 * auth.roles() for the middleware, keeping a failed roles request a 401.
 * axios 1.x puts the roles server's HTTP status on the error (0.27 did not),
 * and ctx.throw(401, e) would answer with that status instead of 401.
 */
export async function fetchRoles(auth: RolesProvider, token: string): Promise<AuthResponse> {
  try {
    return await auth.roles(token);
  } catch (e: any) {
    if (http.isAxiosError(e)) {
      delete e.status;
    }
    throw e;
  }
}
