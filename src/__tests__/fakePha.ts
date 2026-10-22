// A local fake of the PHA roles and auth endpoints, so the tests need no network
import http from 'node:http';
import { AddressInfo } from 'node:net';

export const ROLE = 'testRole';

export const TOKENS = {
  withRole: 'token-with-role',
  withoutRole: 'token-without-role',
  unknown: 'token-unknown',
  serverError: 'token-server-error',
};

export const ACCOUNT = {
  authId: 'auth-1',
  name: 'Test account',
  email: 'test@example.com',
  'mobile-number': '+37060000000',
};

const ROLES: Record<string, Record<string, boolean>> = {
  [TOKENS.withRole]: { [ROLE]: true, other: true },
  [TOKENS.withoutRole]: { other: true },
};

export interface RecordedRequest {
  method: string
  url: string
  headers: http.IncomingHttpHeaders
  body: string
}

export interface FakePha {
  rolesUrl: string
  authUrl: string
  requests: RecordedRequest[]
  close(): Promise<void>
}

export async function startFakePha(): Promise<FakePha> {

  const requests: RecordedRequest[] = [];

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      requests.push({ method: req.method || '', url: req.url || '', headers: req.headers, body });
      if (req.url === '/roles') {
        roles(req, res);
      } else if (req.url === '/auth') {
        auth(body, res);
      } else {
        res.writeHead(404).end();
      }
    });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  return {
    rolesUrl: `${base}/roles`,
    authUrl: `${base}/auth`,
    requests,
    close: () => new Promise<void>(resolve => {
      server.closeAllConnections();
      server.close(() => resolve());
    }),
  };

}

function roles(req: http.IncomingMessage, res: http.ServerResponse) {
  const token = req.headers.authorization || '';
  if (token === TOKENS.serverError) {
    res.writeHead(500).end();
    return;
  }
  const tokenRoles = ROLES[token];
  if (!tokenRoles) {
    res.writeHead(401).end();
    return;
  }
  json(res, { account: ACCOUNT, roles: tokenRoles });
}

function auth(body: string, res: http.ServerResponse) {
  const params = new URLSearchParams(body);
  if (params.has('mobileNumber')) {
    json(res, { ID: 'login-id' });
    return;
  }
  json(res, { ID: params.get('ID'), accessToken: `token-for-${params.get('smsCode')}` });
}

function json(res: http.ServerResponse, data: any) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}
