"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyThrottle = exports.MultiTierThrottle = exports.NoThrottle = exports.UploadThrottle = exports.MessageThrottle = exports.AuthThrottle = exports.LenientThrottle = exports.StrictThrottle = exports.StandardThrottle = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const StandardThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }));
exports.StandardThrottle = StandardThrottle;
const StrictThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }));
exports.StrictThrottle = StrictThrottle;
const LenientThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }));
exports.LenientThrottle = LenientThrottle;
const AuthThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }));
exports.AuthThrottle = AuthThrottle;
const MessageThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60000 } }));
exports.MessageThrottle = MessageThrottle;
const UploadThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({ default: { limit: 2, ttl: 60000 } }));
exports.UploadThrottle = UploadThrottle;
const NoThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.SkipThrottle)());
exports.NoThrottle = NoThrottle;
const MultiTierThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({
    short: { limit: 10, ttl: 60000 },
    medium: { limit: 50, ttl: 300000 },
    long: { limit: 200, ttl: 3600000 },
}));
exports.MultiTierThrottle = MultiTierThrottle;
const ApiKeyThrottle = () => (0, common_1.applyDecorators)((0, throttler_1.Throttle)({
    short: { limit: 50, ttl: 60000 },
    medium: { limit: 200, ttl: 300000 },
    long: { limit: 1000, ttl: 3600000 },
}));
exports.ApiKeyThrottle = ApiKeyThrottle;
//# sourceMappingURL=throttler.decorators.js.map