"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirm = exports.login = exports.roles = void 0;
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
/*
 * The 1.2.x API: plain functions using the default Auth configuration.
 * Each call builds a default Auth, so PHA_ROLES_URL / PHA_AUTH_URL are read at call time
 * (1.2.x read them once at module load; anything set before loading is still honoured).
 */
async function roles(token) {
    return new Auth().roles(token);
}
exports.roles = roles;
async function login(phone) {
    return new Auth().login(phone);
}
exports.login = login;
async function confirm(code, id) {
    return new Auth().confirm(code, id);
}
exports.confirm = confirm;
