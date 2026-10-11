import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { validateAndCalculateWeight } from './services/weight.service.js';
import { createOrder, OrderValidationError } from './services/order.service.js';
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
  optionalAuth,
  AuthenticatedRequest,
} from './middlewares/auth.middleware.js';

dotenv.config();

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Muzaffargarh Fresh Vegetables API',
    version: '1.0.0',
  });
});

// Store Settings (Dynamic Brand Name, Currency, WhatsApp, etc.)
app.get('/api/v1/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();
    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    res.json({
      success: true,
      data: {
        brandName: configMap['brand_name'] || 'Fresh Vegetables Muzaffargarh',
        brandTagline: configMap['brand_tagline'] || 'Farm-fresh vegetables delivered to your doorstep.',
        contactPhone: configMap['contact_phone'] || '0300-1234567',
        currency: configMap['currency_symbol'] || 'Rs.',
        whatsappNumber: configMap['whatsapp_number'] || '923001234567',
        whatsappEnabled: configMap['whatsapp_enabled'] === 'true',
        defaultDeliveryFee: parseFloat(configMap['default_delivery_fee'] || '100'),
        minOrderAmount: parseFloat(configMap['min_order_amount'] || '300'),
      },
    });
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

// Delivery Zones (Admin Controlled)
app.get('/api/v1/delivery-zones', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const zones = await prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { areaName: 'asc' },
    });
    res.json({
      success: true,
      data: zones,
    });
  } catch (error) {
    next(error);
  }
});

// Vegetables Catalog API (Vegetables Only)
app.get('/api/v1/vegetables', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vegetables = await prisma.vegetable.findMany({
      include: {
        images: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      count: vegetables.length,
      data: vegetables,
    });
  } catch (error) {
    next(error);
  }
});

// ─── AUTHENTICATION ENDPOINTS ──────────────────────────────────────────────

// Register
app.post('/api/v1/auth/register', async (req: Request, res: Response) => {
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
      token: result.token,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/api/v1/auth/login', async (req: Request, res: Response) => {
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
      token: result.token,
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
});

// Logout
app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token');
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

// Google OAuth verification / endpoint
app.post('/api/v1/auth/google', async (req: Request, res: Response) => {
  try {
    const { credential, client_id } = req.body;
    const configuredClientId = process.env.GOOGLE_CLIENT_ID;

    if (!configuredClientId) {
      return res.status(503).json({
        success: false,
        error: 'Google Sign-In is not configured yet on this server. Please contact administrator or use Email login.',
        setupRequired: true,
      });
    }

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: 'Google ID token credential is required.',
      });
    }

    // Verify token using Google tokeninfo API endpoint
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired Google identity token.',
      });
    }

    const payload: any = await verifyRes.json();
    if (payload.aud !== configuredClientId) {
      return res.status(401).json({
        success: false,
        error: 'Google token audience mismatch.',
      });
    }

    const result = await googleLoginWithPayload(prisma, {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
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
  } catch (err) {
    console.error('Google OAuth error:', err);
    return res.status(500).json({ success: false, error: 'Google authentication failed.' });
  }
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

// Single Order Details (Enforces Ownership)
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
        items: order.items,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve order details.' });
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

    console.log(`[Order Created Successfully]: ${result.order.orderNumber} (User: ${authenticatedUserId || 'GUEST'}) - Total: Rs. ${result.order.grandTotal}`);

    return res.status(201).json({
      success: true,
      order: result.order,
    });
  } catch (error: any) {
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
    console.log(`[Health Endpoint] http://localhost:${PORT}/api/health`);
    console.log(`[Settings Endpoint] http://localhost:${PORT}/api/v1/settings`);
  });
}
