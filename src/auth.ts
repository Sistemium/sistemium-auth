import http from 'axios';
import { AuthResponse } from './types';

const { PHA_ROLES_URL = 'https://api.sistemium.com/pha/roles' } = process.env;
const { PHA_AUTH_URL = 'https://api.sistemium.com/pha/auth' } = process.env;

export async function roles(token: string): Promise<AuthResponse> {

  return http.get(PHA_ROLES_URL, {
    headers: { authorization: token },
  })
    .then(res => res.data);

}

export async function login(phone: string): Promise<string> {

  const config = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  };

  return http.post(PHA_AUTH_URL, `mobileNumber=${phone}`, config)
    .then(res => res.data.ID);

}

export async function confirm(code: string, id: string): Promise<any> {

  const params = { ID: id, smsCode: code };
  const config = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    transformRequest: [(data: any) => {
      const str = Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
      return str.join('&');
    }],
  };

  const { data } = await http.post(PHA_AUTH_URL, params, config);

  return data;

}
