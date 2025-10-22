import http from 'axios';
import { AuthResponse, AuthConfig } from './types';

export default class Auth {

  private readonly rolesUrl: string;
  private readonly authUrl: string;

  constructor(config: AuthConfig = {}) {
    this.rolesUrl = config.rolesUrl || process.env.PHA_ROLES_URL || 'https://api.sistemium.com/pha/roles';
    this.authUrl = config.authUrl || process.env.PHA_AUTH_URL || 'https://api.sistemium.com/pha/auth';
  }

  async roles(token: string): Promise<AuthResponse> {
    return http.get(this.rolesUrl, {
      headers: { authorization: token },
    })
      .then(res => res.data);
  }

  async login(phone: string): Promise<string> {
    const config = {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };

    return http.post(this.authUrl, `mobileNumber=${phone}`, config)
      .then(res => res.data.ID);
  }

  async confirm(code: string, id: string): Promise<any> {
    const params = { ID: id, smsCode: code };
    const config = {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      transformRequest: [(data: any) => {
        const str = Object.keys(data)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
        return str.join('&');
      }],
    };

    const { data } = await http.post(this.authUrl, params, config);

    return data;
  }

}
