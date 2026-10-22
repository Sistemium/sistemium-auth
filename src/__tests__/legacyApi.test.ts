// The 1.2.x functions of lib/auth (bs-api imports roles from there) against a fake PHA server,
// and the exports of the package root
import Auth, { confirm, login, roles } from '../auth';
import * as root from '../index';
import { ACCOUNT, FakePha, ROLE, startFakePha, TOKENS } from './fakePha';

let pha: FakePha;

beforeAll(async () => {
  pha = await startFakePha();
});

afterAll(async () => {
  await pha.close();
});

beforeEach(() => {
  pha.requests.length = 0;
  process.env.PHA_ROLES_URL = pha.rolesUrl;
  process.env.PHA_AUTH_URL = pha.authUrl;
});

afterEach(() => {
  delete process.env.PHA_ROLES_URL;
  delete process.env.PHA_AUTH_URL;
});

describe('roles()', () => {

  it('gets the account and roles from PHA_ROLES_URL with the token in authorization', async () => {
    const res = await roles(TOKENS.withRole);
    expect(res).toEqual({ account: ACCOUNT, roles: { [ROLE]: true, other: true } });
    expect(pha.requests).toHaveLength(1);
    expect(pha.requests[0]).toMatchObject({
      method: 'GET',
      url: '/roles',
      headers: { authorization: TOKENS.withRole },
      body: '',
    });
  });

  it('rejects when the roles server rejects the token', async () => {
    await expect(roles(TOKENS.unknown)).rejects.toThrow('Request failed with status code 401');
  });

  it('reads PHA_ROLES_URL at call time', async () => {
    process.env.PHA_ROLES_URL = 'http://127.0.0.1:1/roles';
    await expect(roles(TOKENS.withRole)).rejects.toThrow('ECONNREFUSED');
    expect(pha.requests).toHaveLength(0);
  });

});

describe('login()', () => {

  it('posts the phone number urlencoded to PHA_AUTH_URL and returns the ID', async () => {
    const id = await login('+37060000000');
    expect(id).toBe('login-id');
    expect(pha.requests).toHaveLength(1);
    expect(pha.requests[0]).toMatchObject({
      method: 'POST',
      url: '/auth',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      // sent as is, like 1.2.x did
      body: 'mobileNumber=+37060000000',
    });
  });

});

describe('confirm()', () => {

  it('posts ID and smsCode urlencoded to PHA_AUTH_URL and returns the response', async () => {
    const res = await confirm('12 34', 'id&x=1');
    expect(res).toEqual({ ID: 'id&x=1', accessToken: 'token-for-12 34' });
    expect(pha.requests).toHaveLength(1);
    expect(pha.requests[0]).toMatchObject({
      method: 'POST',
      url: '/auth',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'ID=id%26x%3D1&smsCode=12%2034',
    });
  });

});

describe('Auth instance', () => {

  it('sends the same requests as the functions', async () => {
    const auth = new Auth({ rolesUrl: pha.rolesUrl, authUrl: pha.authUrl });
    await auth.roles(TOKENS.withRole);
    await auth.login('+37060000000');
    await auth.confirm('1234', 'id');
    await roles(TOKENS.withRole);
    await login('+37060000000');
    await confirm('1234', 'id');
    const strip = ({ method, url, body, headers }: any) => ({
      method, url, body, authorization: headers.authorization, contentType: headers['content-type'],
    });
    const [instance, functions] = [pha.requests.slice(0, 3), pha.requests.slice(3)];
    expect(instance.map(strip)).toEqual(functions.map(strip));
  });

});

describe('package root', () => {

  it('exports the 1.2.x auth namespace', () => {
    expect(root.auth.roles).toBe(roles);
    expect(root.auth.login).toBe(login);
    expect(root.auth.confirm).toBe(confirm);
  });

  it('exports the 1.3 API', () => {
    expect(root.Auth).toBe(Auth);
    expect(typeof root.middleware).toBe('function');
    expect(typeof root.tokenAuth).toBe('function');
  });

});
