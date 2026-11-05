import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Standard handler that returns 429 with Retry-After header and uniform JSON shape
 */
const createRateLimitHandler = (message, windowSeconds) => (req, res, next, options) => {
  const retryAfter = Math.ceil(options.windowMs / 1000) || windowSeconds;
  res.setHeader('Retry-After', retryAfter);
  return res.status(429).json({
    message,
    retryAfter
  });
};

// 1. Login: 5 attempts per 15 minutes per IP and email
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const email = (req.body?.email || '').trim().toLowerCase();
    return `${ip}_${email}`;
  },
  handler: createRateLimitHandler(
    'Too many login attempts. Please try again after 15 minutes.',
    15 * 60
  )
});

// 2. Forgot Password: 3 per hour per IP and email
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    const email = (req.body?.email || '').trim().toLowerCase();
    return `${ip}_${email}`;
  },
  handler: createRateLimitHandler(
    'Too many password reset requests. Please try again after 1 hour.',
    60 * 60
  )
});

// 3. Reset Password & Set Password: 5 per 15 minutes
export const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    return `${ip}_${req.user?.id || req.params?.token || 'pwd'}`;
  },
  handler: createRateLimitHandler(
    'Too many password update attempts. Please try again after 15 minutes.',
    15 * 60
  )
});

// 4. Chatbot Queries: 30 requests per 15 minutes per user
export const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip);
    return `${ip}_${req.user?.id || 'chat_user'}`;
  },
  handler: createRateLimitHandler(
    'You have reached the question limit. Please wait a few minutes before asking another question.',
    15 * 60
  )
});
