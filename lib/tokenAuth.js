"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sistemium_debug_1 = __importDefault(require("sistemium-debug"));
const sistemium_redis_1 = require("sistemium-redis");
const compat_1 = require("./compat");
const { debug, error } = (0, sistemium_debug_1.default)('auth');
const AUTH_EXPIRE = parseInt(process.env.AUTH_EXPIRE || '300', 0);
const USE_REDIS = AUTH_EXPIRE > 0 && sistemium_redis_1.client;
function tokenAuth(authOrConfig, maybeConfig) {
    const [auth, config] = (0, compat_1.middlewareArgs)(authOrConfig, maybeConfig);
    const { requiredRole, registerUser, } = config;
    return async (ctx, next) => {
        const { header: { authorization }, assert, state } = ctx;
        assert(authorization, 401);
        try {
            const { account, roles } = await cachedAuth(auth, authorization, registerUser);
            if (requiredRole) {
                assert(roles[requiredRole], 403);
            }
            debug('authorized:', `"${account.name}"`);
            state.roles = roles;
            state.account = account;
            state.authId = account.authId;
        }
        catch (e) {
            error('auth:', e.message);
            ctx.throw(401, e);
        }
        await next();
    };
}
exports.default = tokenAuth;
async function cachedAuth(auth, authorization, registerUser) {
    const cached = USE_REDIS && await (0, sistemium_redis_1.getAsync)(authorization);
    if (cached) {
        return JSON.parse(cached);
    }
    const authResponse = await (0, compat_1.fetchRoles)(auth, authorization);
    const account = registerUser ? await registerUser(authResponse) : authResponse;
    const res = {
        ...authResponse,
        roles: {
            ...(authResponse.roles || {}),
            ...(account.roles || {}),
        },
    };
    if (USE_REDIS && res) {
        await saveAuth(authorization, res);
    }
    return res;
}
async function saveAuth(authorization, auth) {
    const saved = await (0, sistemium_redis_1.setAsync)(authorization, JSON.stringify(auth), 'EX', AUTH_EXPIRE);
    debug('savedAuth', authorization, saved);
}
