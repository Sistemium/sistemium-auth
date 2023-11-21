"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("./auth");
const sistemium_debug_1 = __importDefault(require("sistemium-debug"));
const { debug, error } = (0, sistemium_debug_1.default)('auth');
function default_1(config) {
    const { requiredRole } = config;
    return async (ctx, next) => {
        const { header: { authorization }, assert, state } = ctx;
        assert(authorization, 401);
        try {
            const { account, roles } = await (0, auth_1.roles)(authorization);
            if (requiredRole) {
                assert(roles[requiredRole], 403);
            }
            debug('authorized:', `"${account.name}"`);
            state.roles = roles;
            state.account = account;
        }
        catch (e) {
            error('auth:', e.message);
            ctx.throw(401, e);
        }
        await next();
    };
}
exports.default = default_1;
