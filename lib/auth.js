"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
class Auth {
    constructor(config = {}) {
        this.rolesUrl = config.rolesUrl || process.env.PHA_ROLES_URL || 'https://api.sistemium.com/pha/roles';
        this.authUrl = config.authUrl || process.env.PHA_AUTH_URL || 'https://api.sistemium.com/pha/auth';
    }
    async roles(token) {
        return axios_1.default.get(this.rolesUrl, {
            headers: { authorization: token },
        })
            .then(res => res.data);
    }
    async login(phone) {
        const config = {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        };
        return axios_1.default.post(this.authUrl, `mobileNumber=${phone}`, config)
            .then(res => res.data.ID);
    }
    async confirm(code, id) {
        const params = { ID: id, smsCode: code };
        const config = {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: [(data) => {
                    const str = Object.keys(data)
                        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
                    return str.join('&');
                }],
        };
        const { data } = await axios_1.default.post(this.authUrl, params, config);
        return data;
    }
}
exports.default = Auth;
