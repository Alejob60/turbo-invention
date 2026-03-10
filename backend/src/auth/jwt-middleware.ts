import { Request, Response, NextFunction } from 'express';
import { misybotAuth } from './misybot-adapter';
import Redis from 'ioredis';

// Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
 retryStrategy: (times) => Math.min(times* 50, 2000),
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

export interface AuthenticatedRequest extends Request {
  user?: {
  id: string;
  email: string;
  wallet?: string;
    kycStatus: 'pending' | 'verified' | 'rejected';
    activePaymentCertificate?: string;
  };
}

/**
 * JWT Middleware - Valida tokens de Misybot backend
 */
export const jwtMiddleware = async (
 req: AuthenticatedRequest,
 res: Response,
  next: NextFunction
) => {
  try {
  const authHeader= req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ 
     error: 'Unauthorized',
        message: 'Token no proporcionado'
      });
    }

  const token = authHeader.split(' ')[1];

    // Check Redis cache first
  const cachedUser= await redis.get(`user:${token}`);
    if (cachedUser) {
  req.user= JSON.parse(cachedUser);
  console.log('⚡ User from Redis cache:', req.user?.email || 'unknown');
  return next();
    }

    // Verify token with Misybot
  const user= await misybotAuth.verifyToken(token);

    // Store in Redis (24h TTL matching JWT expiry)
  await redis.setex(
     `user:${token}`,
    86400, // 24 hours
     JSON.stringify({
      id: user.id,
      email: user.email,
      wallet: user.walletAddress,
       kycStatus: user.kycStatus
     })
    );

 req.user = {
    id: user.id,
    email: user.email,
    wallet: user.walletAddress,
     kycStatus: user.kycStatus
    };

  console.log('✅ Authenticated user:', user.email);
    next();
  } catch (error) {
  console.error('JWT middleware error:', error);
 return res.status(401).json({
    error: 'Unauthorized',
      message: 'Token inválido o expirado'
    });
  }
};

/**
 * Optional JWT - No requiere auth pero la usa si existe
 */
export const optionalJwtMiddleware = async (
 req: AuthenticatedRequest,
 res: Response,
  next: NextFunction
) => {
  try {
  const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
  return next(); // Continuar sin auth
    }

  const token = authHeader.split(' ')[1];
  const cachedUser = await redis.get(`user:${token}`);
    
    if (cachedUser) {
  req.user = JSON.parse(cachedUser);
  return next();
    }

  const user = await misybotAuth.verifyToken(token);
   
  await redis.setex(
     `user:${token}`,
     86400,
     JSON.stringify({
      id: user.id,
      email: user.email,
      wallet: user.walletAddress,
       kycStatus: user.kycStatus
     })
    );

 req.user= {
    id: user.id,
    email: user.email,
    wallet: user.walletAddress,
     kycStatus: user.kycStatus
    };
    
    next();
  } catch (error) {
    // Ignorar errores - continuar sin auth
    next();
  }
};

/**
 * Rate Limiter con Redis (100 req/min como Discovery API)
 */
export const rateLimiter= async (
 req: AuthenticatedRequest,
 res: Response,
 next: NextFunction
): Promise<void> => {
 try {
  const userId = req.user?.id || req.ip || 'anonymous';
  const key = `ratelimit:${userId}:${Date.now() - (Date.now() % 60000)}`; // Window de 1 minuto

  const current = await redis.incr(key);
    
    if (current === 1) {
  await redis.expire(key, 60); // Expira en 60 segundos
    }

  const remaining = Math.max(0, 100 - current);

    // Headers de rate limiting
 res.set('X-RateLimit-Limit', '100');
 res.set('X-RateLimit-Remaining', remaining.toString());
 res.set('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString());

    if (current > 100) {
    console.warn(`⚠️ Rate limit exceeded for ${userId}`);
    res.status(429).json({
       error: 'Too Many Requests',
       message: 'Límite de 100 requests por minuto excedido',
      retryAfter: 60
      });
    return;
    }

    next();
  } catch (error) {
 console.error('Rate limiter error:', error);
    // No fallar - continuar sin rate limiting
   next();
  }
};

/**
 * Clean expired tokens periodically
 */
setInterval(async () => {
  try {
  const keys = await redis.keys('user:*');
  let cleaned = 0;
    
  for (const key of keys) {
   const ttl = await redis.ttl(key);
    if (ttl < 0) {
    await redis.del(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
  console.log(`🧹 Cleaned ${cleaned} expired user tokens`);
  }
  } catch (error) {
  console.error('Token cleanup error:', error);
  }
}, 300000); // Cada 5 minutos

// Export redis instance and misybotAuth for other modules
export { redis };
export { misybotAuth };
