import { roles as getRoles } from './auth';
import log from 'sistemium-debug';
import { setAsync, getAsync, client } from 'sistemium-redis';

const { debug, error } = log('auth');
const AUTH_EXPIRE = parseInt(process.env.AUTH_EXPIRE, 0) || 300;
const USE_REDIS = AUTH_EXPIRE > 0 && client;

/**
 *
 * @callback registerUserCallback
 * @param {object} auth
 * @return {Promise<object>}
 */

/**
 * Returns koa middleware for authentication
 * @param config
 * @param {string} [config.requiredRole]
 * @param {registerUserCallback} [config.registerUser]
 * @returns {(function(*, *): Promise<void>)|*}
 */

export default function (config) {

  const {
    requiredRole,
    registerUser = auth => auth,
  } = config;

  return async (ctx, next) => {

    const { header: { authorization }, assert, state } = ctx;

    assert(authorization, 401);

    try {

      const { account, roles } = await cachedAuth(authorization, registerUser);

      if (requiredRole) {
        assert(roles[requiredRole], 403);
      }

      debug('authorized:', `"${account.name}"`);

      state.roles = roles;
      state.account = account;
      state.authId = account.authId;

    } catch (e) {
      error('auth:', e.message);
      ctx.throw(401, e);
    }

    await next();

  };

}

/**
 *
 * @param {string} authorization
 * @param {registerUserCallback} registerUser
 * @returns {Promise<{[p: string]: *}>}
 */

async function cachedAuth(authorization, registerUser) {

  const cached = USE_REDIS && await getAsync(authorization);

  if (cached) {
    return JSON.parse(cached);
  }

  const auth = await getRoles(authorization);
  const account = auth && await registerUser(auth);
  const res = account && {
    ...auth,
    roles: {
      ...(auth.roles || {}),
      ...(account.roles || {}),
    },
  };

  if (USE_REDIS && res) {
    await saveAuth(authorization, res);
  }

  return res;

}


async function saveAuth(authorization, auth) {
  const saved = await setAsync(authorization, JSON.stringify(auth), 'EX', AUTH_EXPIRE);
  debug('savedAuth', authorization, saved);
}
