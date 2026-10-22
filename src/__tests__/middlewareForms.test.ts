// Both call forms of middleware() and tokenAuth() in a real Koa app against a fake roles server:
// (config) from 1.2.x, used by SAW, gapi and ae-api, and (auth, config) since 1.3
import Koa from 'koa';
import request from 'supertest';
import Auth from '../auth';
import middleware from '../middleware';
import tokenAuth from '../tokenAuth';
import { AuthMiddleware, TokenAuthConfig } from '../types';
import { ACCOUNT, FakePha, ROLE, startFakePha, TOKENS } from './fakePha';

let pha: FakePha;

beforeAll(async () => {
  pha = await startFakePha();
  // the 1.2.x form uses the default Auth, which reads the env
  process.env.PHA_ROLES_URL = pha.rolesUrl;
});

afterAll(async () => {
  delete process.env.PHA_ROLES_URL;
  await pha.close();
});

beforeEach(() => {
  pha.requests.length = 0;
});

function app(mw: AuthMiddleware) {
  const koa = new Koa();
  koa.silent = true;
  koa.use(mw);
  koa.use(ctx => {
    ctx.body = { account: ctx.state.account, roles: ctx.state.roles, authId: ctx.state.authId };
  });
  return koa.callback();
}

type Factory = (config?: TokenAuthConfig) => AuthMiddleware;

const FORMS: [string, Factory][] = [
  ['middleware(config)', config => middleware(config)],
  ['middleware(auth, config)', config => middleware(new Auth({ rolesUrl: pha.rolesUrl }), config)],
  ['tokenAuth(config)', config => tokenAuth(config)],
  ['tokenAuth(auth, config)', config => tokenAuth(new Auth({ rolesUrl: pha.rolesUrl }), config)],
];

describe.each(FORMS)('%s', (_name, factory) => {

  describe('with requiredRole', () => {

    let callback: ReturnType<typeof app>;

    beforeAll(() => {
      callback = app(factory({ requiredRole: ROLE }));
    });

    it('responds 401 without a token and does not call the roles server', async () => {
      await request(callback).get('/').expect(401);
      expect(pha.requests).toHaveLength(0);
    });

    it('responds 401 when the roles server rejects the token', async () => {
      await request(callback).get('/').set('authorization', TOKENS.unknown).expect(401);
      expect(pha.requests).toHaveLength(1);
      expect(pha.requests[0].headers.authorization).toBe(TOKENS.unknown);
    });

    // axios 1.x puts the server's status on the error, which must not leak out as a 500
    it('responds 401 when the roles server fails', async () => {
      await request(callback).get('/').set('authorization', TOKENS.serverError).expect(401);
    });

    it('responds 403 without the required role', async () => {
      await request(callback).get('/').set('authorization', TOKENS.withoutRole).expect(403);
    });

    it('passes a token with the required role and sets the state', async () => {
      const { body } = await request(callback).get('/').set('authorization', TOKENS.withRole).expect(200);
      expect(body.account).toEqual(ACCOUNT);
      expect(body.roles).toEqual({ [ROLE]: true, other: true });
      expect(pha.requests).toHaveLength(1);
      expect(pha.requests[0]).toMatchObject({
        method: 'GET',
        url: '/roles',
        headers: { authorization: TOKENS.withRole },
      });
    });

  });

  it('without requiredRole passes any known token', async () => {
    const callback = app(factory({}));
    await request(callback).get('/').set('authorization', TOKENS.withoutRole).expect(200);
    await request(callback).get('/').set('authorization', TOKENS.unknown).expect(401);
  });

  it('with an empty requiredRole (as gapi does) passes any known token', async () => {
    const callback = app(factory({ requiredRole: '' }));
    await request(callback).get('/').set('authorization', TOKENS.withoutRole).expect(200);
  });

});

describe('called without arguments', () => {

  it.each([
    ['middleware()', () => middleware()],
    ['tokenAuth()', () => tokenAuth()],
  ])('%s uses the default Auth', async (_name, make) => {
    const callback = app(make());
    await request(callback).get('/').set('authorization', TOKENS.withRole).expect(200);
    await request(callback).get('/').set('authorization', TOKENS.unknown).expect(401);
  });

});

describe('the 1.2.x form', () => {

  it('reads PHA_ROLES_URL on each request, not when the middleware is created', async () => {
    const callback = app(middleware({ requiredRole: ROLE }));
    const saved = process.env.PHA_ROLES_URL;
    process.env.PHA_ROLES_URL = 'http://127.0.0.1:1/roles';
    try {
      await request(callback).get('/').set('authorization', TOKENS.withRole).expect(401);
    } finally {
      process.env.PHA_ROLES_URL = saved;
    }
    await request(callback).get('/').set('authorization', TOKENS.withRole).expect(200);
  });

});

describe('tokenAuth specifics', () => {

  it.each([
    ['tokenAuth(config)', (config: TokenAuthConfig) => tokenAuth(config)],
    ['tokenAuth(auth, config)', (config: TokenAuthConfig) => tokenAuth(new Auth({ rolesUrl: pha.rolesUrl }), config)],
  ])('%s sets authId and merges roles from registerUser', async (_name, factory) => {
    const registerUser = jest.fn(async (auth: any) => ({ ...auth, roles: { registered: true } }));
    const callback = app(factory({ requiredRole: 'registered', registerUser }));
    const { body } = await request(callback).get('/').set('authorization', TOKENS.withoutRole).expect(200);
    expect(registerUser).toHaveBeenCalledWith({ account: ACCOUNT, roles: { other: true } });
    expect(body.authId).toBe(ACCOUNT.authId);
    expect(body.roles).toEqual({ other: true, registered: true });
  });

  // jest.setup.js sets REDIS_AUTO_CONNECT=false, so sistemium-redis has no client and nothing is cached
  it('works without Redis and does not cache', async () => {
    const callback = app(tokenAuth({ requiredRole: ROLE }));
    await request(callback).get('/').set('authorization', TOKENS.withRole).expect(200);
    await request(callback).get('/').set('authorization', TOKENS.withRole).expect(200);
    expect(pha.requests).toHaveLength(2);
  });

});

describe('roles server unreachable', () => {

  it.each([
    ['middleware(auth, config)', () => middleware(new Auth({ rolesUrl: 'http://127.0.0.1:1/roles' }), { requiredRole: ROLE })],
    ['tokenAuth(auth, config)', () => tokenAuth(new Auth({ rolesUrl: 'http://127.0.0.1:1/roles' }), { requiredRole: ROLE })],
  ])('%s responds 401', async (_name, make) => {
    await request(app(make())).get('/').set('authorization', TOKENS.withRole).expect(401);
  });

});
