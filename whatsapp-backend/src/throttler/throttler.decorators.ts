import { applyDecorators } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

// Standard rate limiting (10 requests per 60 seconds)
export const StandardThrottle = () =>
  applyDecorators(Throttle({ default: { limit: 10, ttl: 60000 } }));

// Strict rate limiting for sensitive operations (5 requests per 60 seconds)
export const StrictThrottle = () =>
  applyDecorators(Throttle({ default: { limit: 5, ttl: 60000 } }));

// Lenient rate limiting for read operations (20 requests per 60 seconds)
export const LenientThrottle = () =>
  applyDecorators(Throttle({ default: { limit: 20, ttl: 60000 } }));

// Authentication rate limiting (3 attempts per 60 seconds)
export const AuthThrottle = () =>
  applyDecorators(Throttle({ default: { limit: 3, ttl: 60000 } }));

// Message sending rate limiting (15 messages per 60 seconds)
export const MessageThrottle = () =>
  applyDecorators(Throttle({ default: { limit: 15, ttl: 60000 } }));

// File upload rate limiting (2 uploads per 60 seconds)
export const UploadThrottle = () =>
  applyDecorators(Throttle({ default: { limit: 2, ttl: 60000 } }));

// Skip throttling for certain routes
export const NoThrottle = () => applyDecorators(SkipThrottle());

// Multi-tier throttling (combines short, medium, and long-term limits)
export const MultiTierThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 10, ttl: 60000 }, // 10 per minute
      medium: { limit: 50, ttl: 300000 }, // 50 per 5 minutes
      long: { limit: 200, ttl: 3600000 }, // 200 per hour
    }),
  );

// API key based throttling (higher limits for authenticated users)
export const ApiKeyThrottle = () =>
  applyDecorators(
    Throttle({
      short: { limit: 50, ttl: 60000 }, // 50 per minute
      medium: { limit: 200, ttl: 300000 }, // 200 per 5 minutes
      long: { limit: 1000, ttl: 3600000 }, // 1000 per hour
    }),
  );
