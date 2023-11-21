"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirm = exports.login = exports.roles = void 0;
const axios_1 = __importDefault(require("axios"));
const { PHA_ROLES_URL = 'https://api.sistemium.com/pha/roles' } = process.env;
const { PHA_AUTH_URL = 'https://api.sistemium.com/pha/auth' } = process.env;
async function roles(token) {
    return axios_1.default.get(PHA_ROLES_URL, {
        headers: { authorization: token },
    })
        .then(res => res.data);
}
exports.roles = roles;
async function login(phone) {
    const config = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };
    return axios_1.default.post(PHA_AUTH_URL, `mobileNumber=${phone}`, config)
        .then(res => res.data.ID);
}
exports.login = login;
async function confirm(code, id) {
    const params = { ID: id, smsCode: code };
    const config = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        transformRequest: [(data) => {
                const str = Object.keys(data)
                    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`);
                return str.join('&');
            }],
    };
    const { data } = await axios_1.default.post(PHA_AUTH_URL, params, config);
    return data;
}
exports.confirm = confirm;
