import { roles as getRoles } from './auth';
import log from 'sistemium-debug';
import { TokenAuthConfig } from './types';

const { debug, error } = log('auth');

export default function (config: TokenAuthConfig) {

  const { requiredRole } = config;

  return async (ctx: Record<string, any>, next: () => Promise<any>) => {

    const { header: { authorization }, assert, state } = ctx;
    assert(authorization, 401);

    try {

      const { account, roles } = await getRoles(authorization);

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

  }
}
