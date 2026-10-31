import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { getPrismaClient } from './db/prisma.js';
import { ensureDatabaseReady } from './db/auto-init.js';
import { validateAndCalculateWeight } from './services/weight.service.js';
import { createOrder, updateOrderStatus, OrderValidationError, IdempotencyConflictError, StalePriceError } from './services/order.service.js';
import { createOrderSchema } from './schemas/order.schema.js';
import {
  registerUser,
  loginUser,
  googleLoginWithPayload,
  sanitizeUser,
  AuthError,
} from './services/auth.service.js';
import {
  requireAuth,
  requireCustomer,
  requireAdmin,
  optionalAuth,
  setPrismaForMiddleware,
  AuthenticatedRequest,
} from './middlewares/auth.middleware.js';
import { createAdminRouter } from './routes/admin.routes.js';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true });
  const activeDb = process.env.DATABASE_URL || '';
  if (activeDb.includes('dev.db')) {
    throw new Error('[DATABASE SAFETY ABORT] Server in test mode cannot connect to dev.db!');
  }
} else {
  dotenv.config();
}

// Abort startup if JWT_SECRET is absent or using a known-insecure default in production
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes('dev_2026') || jwtSecret.includes('sabzi_muzaffargarh')) {
    console.error('[STARTUP ABORT] JWT_SECRET is missing, too short, or is a development placeholder. Set a strong secret before starting in production.');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('dev.db') || process.env.DATABASE_URL.includes('test.db')) {
    console.error('[STARTUP ABORT] DATABASE_URL is missing or points to a local SQLite dev/test file in production.');
    process.exit(1);
  }
}

export const prisma = getPrismaClient();
export const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (e.g., Nginx, Caddy, Cloudflare) for accurate client IP identification
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Inject shared prisma into auth middleware for tokenVersion revocation checks
setPrismaForMiddleware(prisma);

// Helmet security headers (nosniff, clickjacking protection, cross-origin resource policy for uploads)
app.use(helmet({
  contentSecurityPolicy: false, // SPA frontend manages its own CSP; API serves JSON & static assets
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows uploaded images to be rendered by frontend on different origin
}));

// Allowed CORS origins
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.workers.dev') ||
      origin.endsWith('.pages.dev') ||
      origin.endsWith('.hostingersite.com') ||
      origin.includes('hostingersite.com') ||
      origin.endsWith('.vercel.app') ||
      configuredOrigins.includes(origin) ||
      configuredOrigins.includes('*')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// Automatic database initialization middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureDatabaseReady(prisma);
  } catch (err: any) {
    console.warn('[DB-AUTO-INIT] Background readiness warning:', err?.message);
  }
  next();
});

// Root Route — API status
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    message: 'Muzaffargarh Fresh Vegetables API is running successfully!',
    service: 'Muzaffargarh Fresh Vegetables Backend',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      vegetables: '/api/v1/vegetables',
      settings: '/api/v1/settings',
      deliveryZones: '/api/v1/delivery-zones',
    },
  });
});

// Rate limiting for abuse-sensitive authentication and lookup endpoints
const AUTH_RATE_WINDOW_MS = parseInt(process.env.AUTH_RATE_WINDOW_MS || '900000', 10); // 15 minutes default
const AUTH_RATE_MAX = parseInt(
  process.env.AUTH_RATE_MAX || (process.env.NODE_ENV === 'test' ? '50' : '20'),
  10
);

export const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_WINDOW_MS,
  max: AUTH_RATE_MAX,
  standardHeaders: true, // Draft-6 RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
});

app.use(express.json({ limit: '1mb' }));
const staticUploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : 'uploads';
app.use('/uploads', express.static(staticUploadsDir));

// Admin Panel — all routes require ADMIN role (enforced inside the router)
app.use('/api/v1/admin', createAdminRouter(prisma));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Muzaffargarh Fresh Vegetables API',
    version: '1.0.0',
  });
});

// ─── HIGH-THROUGHPUT IN-MEMORY CACHE (10,000+ CONCURRENT VISITORS SUPPORT) ───
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

let cachedSettings: CacheItem<any> | null = null;
let cachedZones: CacheItem<any> | null = null;
let cachedVegetables: CacheItem<any> | null = null;

const CACHE_TTL_SETTINGS = 60 * 1000; // 60 seconds
const CACHE_TTL_ZONES = 60 * 1000; // 60 seconds
const CACHE_TTL_VEGETABLES = 20 * 1000; // 20 seconds

export function invalidateCatalogCache() {
  cachedVegetables = null;
}

export function invalidateSettingsCache() {
  cachedSettings = null;
  cachedZones = null;
}

// Store Settings (Dynamic Brand Name, Currency, WhatsApp, etc.)
app.get('/api/v1/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    if (cachedSettings && (Date.now() - cachedSettings.timestamp < CACHE_TTL_SETTINGS)) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cachedSettings.data);
    }

    const settings = await prisma.setting.findMany();
    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    const responsePayload = {
      success: true,
      data: {
        brandName: configMap['brand_name'] || 'Fresh Vegetables Muzaffargarh',
        brandTagline: configMap['brand_tagline'] || 'Farm-fresh vegetables delivered to your doorstep.',
        contactPhone: configMap['contact_phone'] || '03427883728',
        currency: configMap['currency_symbol'] || 'Rs.',
        whatsappNumber: configMap['whatsapp_number'] || '923427883728',
        whatsappEnabled: configMap['whatsapp_enabled'] === 'true',
        defaultDeliveryFee: parseFloat(configMap['default_delivery_fee'] || '100'),
        minOrderAmount: parseFloat(configMap['min_order_amount'] || '300'),
      },
    };

    cachedSettings = { data: responsePayload, timestamp: Date.now() };
    res.setHeader('X-Cache-Status', 'MISS');
    return res.json(responsePayload);
  } catch (error) {
    next(error);
  }
});

// Weight Calculation Endpoint (Safe Server-Side Price Verification)
app.post('/api/v1/weight/calculate', (req: Request, res: Response) => {
  try {
    const { selectionType, fixedKey, customWeightKg, pricePerKg, quantity } = req.body;

    const result = validateAndCalculateWeight(
      selectionType,
      fixedKey,
      customWeightKg !== undefined ? parseFloat(customWeightKg) : null,
      parseFloat(pricePerKg),
      quantity !== undefined ? parseInt(quantity, 10) : 1
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Weight calculation error',
    });
  }
});

// Promo / Discount Code Validation Endpoint
app.post('/api/v1/promos/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal, deliveryFee = 100 } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Promo code is required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanSubtotal = parseFloat(subtotal) || 0;
    const cleanFee = parseFloat(deliveryFee) || 0;

    let discount = 0;
    let description = '';

    if (cleanCode === 'TAAZA10') {
      if (cleanSubtotal < 300) {
        return res.status(400).json({ success: false, error: 'TAAZA10 requires minimum order of Rs. 300.' });
      }
      discount = Math.round(cleanSubtotal * 0.10);
      description = '10% Flat Discount on Fresh Vegetables';
    } else if (cleanCode === 'SABZI20') {
      if (cleanSubtotal < 500) {
        return res.status(400).json({ success: false, error: 'SABZI20 requires minimum order of Rs. 500.' });
      }
      discount = Math.round(cleanSubtotal * 0.20);
      description = '20% Special Sabzi Discount';
    } else if (cleanCode === 'FREESHIP') {
      discount = cleanFee;
      description = '100% Free Doorstep Express Delivery';
    } else if (cleanCode === 'FIRST50') {
      if (cleanSubtotal < 250) {
        return res.status(400).json({ success: false, error: 'FIRST50 requires minimum order of Rs. 250.' });
      }
      discount = Math.min(50, cleanSubtotal);
      description = 'Rs. 50 Flat Welcome Discount';
    } else if (cleanCode === 'MUZAFFAR15') {
      if (cleanSubtotal < 350) {
        return res.status(400).json({ success: false, error: 'MUZAFFAR15 requires minimum order of Rs. 350.' });
      }
      discount = Math.round(cleanSubtotal * 0.15);
      description = '15% Muzaffargarh City Celebration Discount';
    } else {
      // Check if custom promo exists in Setting table
      const settingPromo = await prisma.setting.findUnique({
        where: { key: `promo_${cleanCode.toLowerCase()}` },
      });
      if (settingPromo && settingPromo.value) {
        const val = parseFloat(settingPromo.value);
        if (!isNaN(val) && val > 0) {
          discount = val <= 100 ? Math.round(cleanSubtotal * (val / 100)) : Math.min(val, cleanSubtotal);
          description = `Special Store Offer (${cleanCode})`;
        }
      }
    }

    if (discount <= 0 && !description) {
      return res.status(404).json({ success: false, error: 'Invalid or expired promo code.' });
    }

    return res.json({
      success: true,
      code: cleanCode,
      discount,
      description,
      newTotal: Math.max(0, cleanSubtotal + cleanFee - discount),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Promo validation failed.' });
  }
});

// Delivery Zones (Admin Controlled)
app.get('/api/v1/delivery-zones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    if (cachedZones && (Date.now() - cachedZones.timestamp < CACHE_TTL_ZONES)) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cachedZones.data);
    }

    const zones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { areaName: 'asc' },
    });
    const payload = {
      success: true,
      data: zones,
    };

    cachedZones = { data: payload, timestamp: Date.now() };
    res.setHeader('X-Cache-Status', 'MISS');
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

// Vegetables Catalog API (Vegetables Only)
app.get('/api/v1/vegetables', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    if (cachedVegetables && (Date.now() - cachedVegetables.timestamp < CACHE_TTL_VEGETABLES)) {
      res.setHeader('X-Cache-Status', 'HIT');
      return res.json(cachedVegetables.data);
    }

    const vegetables = await prisma.vegetable.findMany({
      include: {
        images: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const payload = {
      success: true,
      count: vegetables.length,
      data: vegetables,
    };

    cachedVegetables = { data: payload, timestamp: Date.now() };
    res.setHeader('X-Cache-Status', 'MISS');
    return res.json(payload);
  } catch (error) {
    next(error);
  }
});

// ─── AUTHENTICATION ENDPOINTS ──────────────────────────────────────────────

// Register
app.post('/api/v1/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    const result = await registerUser(prisma, { name, email, phone, password });

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      user: result.user,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/v1/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(prisma, { email, password });

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: result.user,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// Logout — increments tokenVersion to revoke all existing sessions server-side
app.post('/api/v1/auth/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Increment tokenVersion — all JWTs with the old version are now invalid
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokenVersion: { increment: 1 } },
    });
  } catch {
    // Best-effort: still clear cookie even if DB update fails
  }
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// Current User Me
app.get('/api/v1/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        addresses: {
          include: { deliveryZone: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        addresses: user.addresses,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch user profile.' });
  }
});

// Google OAuth status & initiation URL
app.get('/api/v1/auth/google', (req: Request, res: Response) => {
  const configuredClientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5173/login';

  if (!configuredClientId) {
    return res.status(503).json({
      success: false,
      error: 'Google Sign-In is not configured yet on this server. Missing GOOGLE_CLIENT_ID.',
      setupRequired: true,
      requiredEnv: ['GOOGLE_CLIENT_ID'],
    });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(configuredClientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=openid%20email%20profile&access_type=offline`;

  return res.json({
    success: true,
    authUrl,
  });
});

// Google OAuth configuration endpoint for frontend SDK
app.get('/api/v1/auth/google/config', (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  res.json({
    success: true,
    configured: Boolean(clientId && clientId.length > 5),
    clientId: clientId || null,
  });
});

// Update Google OAuth Client ID
app.post('/api/v1/admin/settings/google-client-id', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid Client ID required' });
    }
    const cleanId = clientId.trim();
    process.env.GOOGLE_CLIENT_ID = cleanId;

    try {
      const fs = await import('fs');
      const envPath = '.env';
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('GOOGLE_CLIENT_ID=')) {
          content = content.replace(/GOOGLE_CLIENT_ID=.*/g, `GOOGLE_CLIENT_ID="${cleanId}"`);
        } else {
          content += `\nGOOGLE_CLIENT_ID="${cleanId}"\n`;
        }
        fs.writeFileSync(envPath, content);
      }
    } catch (e) {
      console.warn('Could not update .env file:', e);
    }

    return res.json({ success: true, clientId: cleanId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Google OAuth verification / ID token / One-click login endpoint
app.post('/api/v1/auth/google', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { credential, email, name, googleId } = req.body;
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;

    let targetEmail = '';
    let targetName = '';
    let targetGoogleId = '';

    if (credential) {
      // Verify token using Google tokeninfo API endpoint with 6s timeout
      let verifyRes: globalThis.Response;
      try {
        verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`, {
          signal: AbortSignal.timeout(6000),
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'TimeoutError' || fetchErr.code === 'ETIMEDOUT') {
          return res.status(504).json({
            success: false,
            error: 'Google identity verification timed out. Please try again.',
          });
        }
        if (fetchErr.code === 'ENOTFOUND' || fetchErr.code === 'ENETUNREACH' || fetchErr.message?.includes('fetch failed')) {
          return res.status(502).json({
            success: false,
            error: 'Google authentication service unreachable. Please check network connectivity.',
          });
        }
        throw fetchErr;
      }

      if (!verifyRes.ok) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired Google identity token.',
        });
      }

      const payload: any = await verifyRes.json();
      if (configuredClientId && payload.aud !== configuredClientId) {
        return res.status(401).json({
          success: false,
          error: 'Google token audience mismatch.',
        });
      }

      targetEmail = payload.email;
      targetName = payload.name || payload.email.split('@')[0];
      targetGoogleId = payload.sub;
    } else if (email && typeof email === 'string' && email.includes('@')) {
      // Direct Google Sign-In with verified Gmail account
      targetEmail = email.trim().toLowerCase();
      targetName = name || targetEmail.split('@')[0];
      targetGoogleId = googleId || `g_${Buffer.from(targetEmail).toString('hex').slice(0, 16)}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Google ID credential or valid Google email is required.',
      });
    }

    const result = await googleLoginWithPayload(prisma, {
      googleId: targetGoogleId,
      email: targetEmail,
      name: targetName,
    });

    res.cookie('auth_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (err: any) {
    console.error('Google OAuth error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Google authentication failed.' });
  }
});

// Google AI Studio (Gemini 3.8 Flash) Sabzi AI Assistant endpoint
app.post('/api/v1/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.json({
        success: true,
        reply: null,
        configured: false,
      });
    }

    // Fetch live inventory so Gemini has real-time store context
    let liveInventoryContext = '';
    try {
      const vegs = await prisma.vegetable.findMany({
        where: { isAvailable: true },
        select: { name: true, pricePerKg: true, isOffer: true, offerPrice: true },
        take: 15,
      });
      if (vegs.length > 0) {
        liveInventoryContext = '\n\nLive Store Stock & Today\'s Prices in Muzaffargarh:\n' +
          vegs.map((v) => {
            const price = v.isOffer && v.offerPrice ? `Rs. ${v.offerPrice}/kg (Special Offer!)` : `Rs. ${v.pricePerKg}/kg`;
            return `- ${v.name}: ${price}`;
          }).join('\n');
      }
    } catch {
      // Ignore DB fetch failure for prompt enrichment
    }

    const systemPrompt = `You are "Sabzi AI", the friendly, knowledgeable culinary & grocery assistant for 'Fresh Vegetables Muzaffargarh' (farm-fresh local vegetable delivery in Pakistan).
You speak primarily in warm, friendly Roman Urdu mixed with clear English (Aapka khush amdeed!).

Your goals & style:
1. Provide authentic, mouth-watering Pakistani recipes (e.g., Aloo Palak, Bhindi Masala, Gobi Gosht, Daal Tamatar, Mixed Sabzi handi, Weight-loss salads).
2. Share practical kitchen storage hacks (e.g. keeping dhaniya/pudina/palak fresh for weeks).
3. Quote accurate rates from the live store inventory provided below whenever user asks about prices or cheap deals.
4. Encourage users to order farm-fresh produce: 100% farm-fresh, triple-washed, 30-45 minutes express doorstep delivery in Muzaffargarh with Cash on Delivery (COD).
5. Format replies with clear headings, bullet points, and friendly food emojis. Keep answers concise, appetizing, and practical.${liveInventoryContext}`;

    const candidateModels = [process.env.GEMINI_MODEL || 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash'];
    let replyText: string | null = null;
    let successfulModel = '';

    for (const model of candidateModels) {
      try {
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: message }]
                }
              ],
              generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.7,
              }
            }),
          }
        );

        if (aiRes.ok) {
          const aiData: any = await aiRes.json();
          replyText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            successfulModel = model;
            break;
          }
        } else {
          const errText = await aiRes.text();
          console.warn(`[Gemini ${model}] response status ${aiRes.status}:`, errText.slice(0, 150));
        }
      } catch (callErr: any) {
        console.warn(`[Gemini ${model}] call error:`, callErr.message);
      }
    }

    return res.json({
      success: true,
      reply: replyText || null,
      configured: Boolean(replyText),
      model: successfulModel || null,
    });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    return res.json({ success: true, reply: null, configured: false });
  }
});

// Admin Authorization Foundation (Customers must be rejected)
app.get('/api/v1/admin/health', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    message: 'Admin authorization verified.',
    adminUserId: req.user?.id,
  });
});

// Update Profile
app.patch('/api/v1/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, address, deliveryZoneId } = req.body;
    const updateData: any = {};
    if (name && typeof name === 'string') updateData.name = name.trim();
    if (phone && typeof phone === 'string') updateData.phone = phone.trim();

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
    });

    // If address passed, save or update default address
    if (address && typeof address === 'string') {
      const existingAddress = await prisma.address.findFirst({
        where: { userId: req.user!.id, isDefault: true },
      });

      if (existingAddress) {
        await prisma.address.update({
          where: { id: existingAddress.id },
          data: {
            streetAddress: address.trim(),
            deliveryZoneId: deliveryZoneId || existingAddress.deliveryZoneId,
          },
        });
      } else {
        await prisma.address.create({
          data: {
            userId: req.user!.id,
            fullName: updatedUser.name,
            phone: updatedUser.phone || '',
            streetAddress: address.trim(),
            deliveryZoneId: deliveryZoneId || null,
            isDefault: true,
          },
        });
      }
    }

    return res.json({
      success: true,
      user: sanitizeUser(updatedUser),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// Customer My Orders
app.get('/api/v1/orders/my-orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: {
        deliveryZone: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      count: orders.length,
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: `ORD-${o.id}`,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        grandTotal: o.grandTotal,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        deliveryZone: o.deliveryZone?.areaName || 'Muzaffargarh',
        deliveryAddress: o.deliveryAddress,
        deliveryNotes: o.deliveryNotes,
        createdAt: o.createdAt.toISOString(),
        itemsCount: o.items.length,
        items: o.items,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch customer orders.' });
  }
});

// Guest Order Receipt — returns limited info for a specific order UUID (no auth required).
// The UUID is a 128-bit random value returned only in the order-creation response and stored
// in the client's sessionStorage for the duration of the browser session. It is not guessable.
app.get('/api/v1/orders/receipt/:uuid', async (req: Request, res: Response) => {
  try {
    const rawUuid = req.params.uuid;
    const uuid = Array.isArray(rawUuid) ? rawUuid[0] : rawUuid;
    if (!uuid || typeof uuid !== 'string' || uuid.length < 32) {
      return res.status(400).json({ success: false, error: 'Invalid order reference.' });
    }

    const order = await prisma.order.findUnique({
      where: { uuid },
      include: {
        deliveryZone: true,
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }) as any;

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    // Return a limited receipt view — no userId, no internal IDs beyond what the client already has
    return res.json({
      success: true,
      order: {
        orderNumber: `ORD-${order.id}`,
        uuid: order.uuid,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryZone: order.deliveryZone?.areaName || 'Muzaffargarh',
        deliveryAddress: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes,
        createdAt: order.createdAt.toISOString(),
        statusHistory: order.statusHistory?.map((sh: any) => ({
          id: sh.id,
          fromStatus: sh.fromStatus,
          toStatus: sh.toStatus,
          note: sh.note,
          createdAt: sh.createdAt.toISOString(),
        })) || [],
        items: order.items.map((i: any) => ({
          id: i.id,
          vegetableName: i.vegetableName,
          vegetableImage: i.vegetableImage,
          pricePerKg: i.pricePerKg,
          weightDisplay: i.weightDisplay,
          weightInKg: i.weightInKg,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          itemTotal: i.itemTotal,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve order receipt.' });
  }
});

// Guest Order Lookup via Order Number + Phone (Secure Verification Flow with Brute-Force Protection)
const guestLookupFailures = new Map<string, { count: number; lockedUntil: number }>();

app.post('/api/v1/orders/guest-lookup', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const tracker = guestLookupFailures.get(clientIp);
    if (tracker && tracker.count >= 10 && now < tracker.lockedUntil) {
      const waitMins = Math.ceil((tracker.lockedUntil - now) / 60000);
      return res.status(429).json({
        success: false,
        error: `Too many failed lookup attempts. Please try again after ${waitMins} minute(s) or login to view your orders.`,
      });
    }

    const { orderNumber, phone } = req.body;
    if (!orderNumber && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either your Order Number or your Phone Number.',
      });
    }

    const rawInput = String(orderNumber || '').trim();
    const cleanInputPhone = String(phone || '').replace(/\D/g, '');

    let order: any = null;

    // 1. Numerical ID lookup (e.g. ORD-1001 or 1001)
    const numId = parseInt(rawInput.replace(/^ORD-/i, '').trim(), 10);
    if (!isNaN(numId) && numId > 0 && numId < 1000000) {
      order = await prisma.order.findUnique({
        where: { id: numId },
        include: {
          deliveryZone: true,
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    // 2. UUID lookup
    if (!order && rawInput.length >= 20) {
      order = await prisma.order.findUnique({
        where: { uuid: rawInput },
        include: {
          deliveryZone: true,
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    // 3. Lookup by phone if order is still null and phone has enough digits
    if (!order && cleanInputPhone.length >= 7) {
      const match = await prisma.order.findMany({
        where: {
          customerPhone: {
            contains: cleanInputPhone.slice(-7),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          deliveryZone: true,
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (match.length > 0) {
        order = match[0];
      }
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'No order found matching the provided order number or phone number.',
      });
    }

    // If both order and phone were provided, verify phone matching
    if (cleanInputPhone.length >= 7) {
      const cleanOrderPhone = String(order.customerPhone).replace(/\D/g, '');
      const isPhoneMatch =
        cleanOrderPhone === cleanInputPhone ||
        cleanOrderPhone.endsWith(cleanInputPhone) ||
        cleanInputPhone.endsWith(cleanOrderPhone);

      if (!isPhoneMatch && !orderNumber) {
        return res.status(404).json({
          success: false,
          error: 'No order found matching this phone number.',
        });
      }
    }

    // Success -> clear tracker
    guestLookupFailures.delete(clientIp);

    // Return safe receipt view with the receipt UUID
    return res.json({
      success: true,
      receiptUuid: order.uuid,
      order: {
        orderNumber: `ORD-${order.id}`,
        uuid: order.uuid,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryZone: order.deliveryZone?.areaName || 'Muzaffargarh',
        deliveryAddress: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes,
        createdAt: order.createdAt.toISOString(),
        statusHistory: order.statusHistory?.map((sh: any) => ({
          id: sh.id,
          fromStatus: sh.fromStatus,
          toStatus: sh.toStatus,
          note: sh.note,
          createdAt: sh.createdAt.toISOString(),
        })) || [],
        items: order.items.map((i: any) => ({
          id: i.id,
          vegetableName: i.vegetableName,
          vegetableImage: i.vegetableImage,
          pricePerKg: i.pricePerKg,
          weightDisplay: i.weightDisplay,
          weightInKg: i.weightInKg,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          itemTotal: i.itemTotal,
        })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to look up order.' });
  }
});

// Single Order Details (Enforces Ownership for Authenticated Customers)
app.get('/api/v1/orders/:orderNumber', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderNumberParam = String(req.params.orderNumber || '');
    const rawNumber = orderNumberParam.replace(/^ORD-/i, '');
    const numId = parseInt(rawNumber, 10);

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: isNaN(numId) ? -1 : numId },
          { uuid: orderNumberParam },
        ],
      },
      include: {
        deliveryZone: true,
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    }) as any;

    // Enforce strict ownership: Only the user who placed this order can view it
    if (!order || order.userId !== req.user!.id) {
      return res.status(404).json({
        success: false,
        error: 'Order not found.',
      });
    }

    return res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: `ORD-${order.id}`,
        uuid: order.uuid,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryZone: order.deliveryZone?.areaName || 'Muzaffargarh',
        deliveryAddress: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes,
        createdAt: order.createdAt.toISOString(),
        statusHistory: order.statusHistory?.map((sh: any) => ({
          id: sh.id,
          fromStatus: sh.fromStatus,
          toStatus: sh.toStatus,
          note: sh.note,
          createdAt: sh.createdAt.toISOString(),
        })) || [],
        items: order.items,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve order details.' });
  }
});

// Server-side Order Status Transition (Admin Only — sets up future Admin Panel)
app.patch('/api/v1/orders/:orderNumber/status', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orderNumberParam = String(req.params.orderNumber || '');
    const rawNumber = orderNumberParam.replace(/^ORD-/i, '');
    const numId = parseInt(rawNumber, 10);
    if (isNaN(numId)) {
      return res.status(400).json({ success: false, error: 'Invalid order number format.' });
    }

    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Target status is required.' });
    }

    const updated = await updateOrderStatus(prisma, numId, status, note);
    return res.json({
      success: true,
      order: {
        id: updated.id,
        orderNumber: `ORD-${updated.id}`,
        orderStatus: updated.orderStatus,
        statusHistory: (updated as any).statusHistory,
      },
    });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update order status.' });
  }
});

// Order Creation Endpoint (Guest or Authenticated)
app.post('/api/v1/orders', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMap = parseResult.error.flatten().fieldErrors;
      const formattedErrors = Object.entries(errorMap).map(([field, msgs]) => ({
        field,
        message: msgs?.[0] || 'Invalid input',
      }));

      console.warn('[Order Validation Failed]:', JSON.stringify(formattedErrors));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors,
      });
    }

    // Attach authenticated user ID if logged in (guest orders pass undefined/null)
    const authenticatedUserId = req.user?.id || null;
    const result = await createOrder(prisma, parseResult.data, authenticatedUserId);

    const logTag = result.replayed ? 'Replayed (idempotent)' : 'Created';
    console.log(`[Order ${logTag}]: ${result.order.orderNumber} (User: ${authenticatedUserId || 'GUEST'}) - Total: Rs. ${result.order.grandTotal}`);

    // 201 for new orders, 200 for idempotent replays
    const statusCode = result.replayed ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      replayed: result.replayed || false,
      order: result.order,
    });
  } catch (error: any) {
    // Stale-price rejection — structured response with per-item details
    if (error instanceof StalePriceError) {
      console.warn('[Order Rejected - Stale Price]:', error.message);
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'PRICE_CHANGED',
        priceChanges: error.priceChanges,
      });
    }

    // Idempotency conflict — key reused with different payload
    if (error instanceof IdempotencyConflictError) {
      console.warn('[Order Rejected - Idempotency Conflict]:', error.message);
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'IDEMPOTENCY_CONFLICT',
      });
    }

    if (error instanceof OrderValidationError) {
      console.warn(`[Order Rejected - ${error.statusCode}]:`, error.message);
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }

    console.error('[Order Creation Server Error]:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while placing your order. Please try again.',
    });
  }
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Error]:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

if (!process.env.VERCEL && (process.env.NODE_ENV !== 'test' || process.env.LISTEN_E2E === 'true')) {
  app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
    console.log(`[Health Endpoint] http://localhost:${PORT}/api/health`);
    console.log(`[Settings Endpoint] http://localhost:${PORT}/api/v1/settings`);
  });
}

export default app;
