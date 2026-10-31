import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { upload, processAndSaveImage } from '../middlewares/upload.middleware.js';
import {
  AdminValidationError,
  getDashboardStats,
  getAdminVegetables,
  createVegetable,
  updateVegetable,
  deleteVegetable,
  addVegetableImage,
  deleteVegetableImage,
  setPrimaryVegetableImage,
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderPaymentStatus,
  getAdminCustomers,
  getAdminCustomerDetails,
  getAdminDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  deleteDeliveryZone,
  getAdminOffers,
  setVegetableOffer,
  removeVegetableOffer,
  getAdminSettings,
  updateAdminSettings,
  updateAdminProfile,
  changeAdminPassword,
} from '../services/admin.service.js';
import { updateOrderStatus } from '../services/order.service.js';

export function createAdminRouter(prisma: PrismaClient): Router {
  const router = Router();

  // Enforce ADMIN role on EVERY route
  router.use(requireAuth);
  router.use(requireAdmin);

  // 1. Health check & current admin info
  router.get('/health', (req: AuthenticatedRequest, res: Response) => {
    return res.json({
      status: 'ok',
      admin: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role,
      },
    });
  });

  router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });
      return res.json({ success: true, user });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve admin details.' });
    }
  });

  router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, phone } = req.body;
      const updated = await updateAdminProfile(prisma, req.user!.id, { name, phone });
      return res.json({ success: true, user: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Profile update failed.' });
    }
  });

  router.put('/password', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await changeAdminPassword(prisma, req.user!.id, currentPassword, newPassword);
      return res.json({ success: true, message: result.message });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Password update failed.' });
    }
  });

  // 2. Dashboard
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const stats = await getDashboardStats(prisma);
      return res.json({ success: true, data: stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to fetch dashboard metrics.' });
    }
  });

  // 3. Vegetables CRUD
  router.get('/vegetables', async (req: Request, res: Response) => {
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const result = await getAdminVegetables(prisma, { search, page, limit });
      return res.json({ success: true, ...result, vegetables: result.data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve vegetables.' });
    }
  });

  router.get('/vegetables/:id', async (req: Request, res: Response) => {
    try {
      const vegId = String(req.params.id);
      const veg = await prisma.vegetable.findUnique({
        where: { id: vegId },
        include: { images: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!veg) {
        return res.status(404).json({ success: false, error: 'Vegetable not found.' });
      }
      return res.json({ success: true, vegetable: veg });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to fetch vegetable.' });
    }
  });

  router.post('/vegetables', async (req: Request, res: Response) => {
    try {
      const created = await createVegetable(prisma, req.body);
      return res.status(201).json({ success: true, vegetable: created });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to create vegetable.' });
    }
  });

  router.put('/vegetables/:id', async (req: Request, res: Response) => {
    try {
      const updated = await updateVegetable(prisma, String(req.params.id), req.body);
      return res.json({ success: true, vegetable: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update vegetable.' });
    }
  });

  router.delete('/vegetables/:id', async (req: Request, res: Response) => {
    try {
      const result = await deleteVegetable(prisma, String(req.params.id));
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to delete vegetable.' });
    }
  });

  // 4. Image Upload & Management
  router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded.' });
      }
      const saved = await processAndSaveImage(req.file.buffer, 'veg');
      return res.json({ success: true, ...saved });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Image processing failed.' });
    }
  });

  router.post('/vegetables/:id/images', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file && !req.body.imageUrl) {
        return res.status(400).json({ success: false, error: 'Image file or image URL is required.' });
      }

      const vegId = String(req.params.id);
      let imageUrl = req.body.imageUrl;
      if (req.file) {
        const saved = await processAndSaveImage(req.file.buffer, `veg-${vegId}`);
        imageUrl = saved.relativeUrl;
      }

      const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;
      const imageRecord = await addVegetableImage(prisma, vegId, imageUrl, isPrimary);
      return res.status(201).json({ success: true, image: imageRecord });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to add image.' });
    }
  });

  router.delete('/vegetables/:id/images/:imageId', async (req: Request, res: Response) => {
    try {
      const result = await deleteVegetableImage(prisma, String(req.params.id), String(req.params.imageId));
      return res.json({ success: true, message: result.message });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to delete image.' });
    }
  });

  router.patch('/vegetables/:id/images/:imageId/primary', async (req: Request, res: Response) => {
    try {
      const updated = await setPrimaryVegetableImage(prisma, String(req.params.id), String(req.params.imageId));
      return res.json({ success: true, image: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to set primary image.' });
    }
  });

  // 5. Orders Management
  router.get('/orders', async (req: Request, res: Response) => {
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const orderStatus = req.query.orderStatus ? String(req.query.orderStatus) : undefined;
      const paymentStatus = req.query.paymentStatus ? String(req.query.paymentStatus) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const result = await getAdminOrders(prisma, { search, orderStatus, paymentStatus, page, limit });
      return res.json({ success: true, ...result, orders: result.data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve orders.' });
    }
  });

  router.get('/orders/:id', async (req: Request, res: Response) => {
    try {
      const order = await getAdminOrderDetails(prisma, String(req.params.id));
      return res.json({ success: true, order });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to retrieve order details.' });
    }
  });

  router.patch('/orders/:id/status', async (req: Request, res: Response) => {
    try {
      const rawNum = parseInt(String(req.params.id).replace(/^ORD-/i, ''), 10);
      if (isNaN(rawNum)) {
        return res.status(400).json({ success: false, error: 'Invalid order number.' });
      }

      const { status, note } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required.' });
      }

      const updated = await updateOrderStatus(prisma, rawNum, status, note);
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

  router.patch('/orders/:id/payment-status', async (req: Request, res: Response) => {
    try {
      const rawNum = parseInt(String(req.params.id).replace(/^ORD-/i, ''), 10);
      if (isNaN(rawNum)) {
        return res.status(400).json({ success: false, error: 'Invalid order number.' });
      }

      const { paymentStatus, txnRef } = req.body;
      if (!paymentStatus) {
        return res.status(400).json({ success: false, error: 'Payment status is required.' });
      }

      const actor = (req as AuthenticatedRequest).user?.email || 'Admin';
      const updated = await updateOrderPaymentStatus(prisma, rawNum, paymentStatus, txnRef, actor);
      return res.json({
        success: true,
        order: {
          id: updated.id,
          orderNumber: `ORD-${updated.id}`,
          paymentStatus: updated.paymentStatus,
          paymentTxnRef: updated.paymentTxnRef,
          statusHistory: (updated as any).statusHistory,
        },
      });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update payment status.' });
    }
  });

  // 6. Customers
  router.get('/customers', async (req: Request, res: Response) => {
    try {
      const search = req.query.search ? String(req.query.search) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

      const result = await getAdminCustomers(prisma, { search, page, limit });
      return res.json({ success: true, ...result, customers: result.data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve customers.' });
    }
  });

  router.get('/customers/:id', async (req: Request, res: Response) => {
    try {
      const customer = await getAdminCustomerDetails(prisma, String(req.params.id));
      return res.json({ success: true, customer });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to retrieve customer.' });
    }
  });

  // 7. Delivery Zones
  router.get('/delivery-zones', async (req: Request, res: Response) => {
    try {
      const zones = await getAdminDeliveryZones(prisma);
      return res.json({ success: true, data: zones });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve delivery zones.' });
    }
  });

  router.post('/delivery-zones', async (req: Request, res: Response) => {
    try {
      const zone = await createDeliveryZone(prisma, req.body);
      return res.status(201).json({ success: true, zone });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to create delivery zone.' });
    }
  });

  router.put('/delivery-zones/:id', async (req: Request, res: Response) => {
    try {
      const updated = await updateDeliveryZone(prisma, String(req.params.id), req.body);
      return res.json({ success: true, zone: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update delivery zone.' });
    }
  });

  router.delete('/delivery-zones/:id', async (req: Request, res: Response) => {
    try {
      const result = await deleteDeliveryZone(prisma, String(req.params.id));
      return res.json({ success: true, message: result.message });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to delete delivery zone.' });
    }
  });

  // 8. Offers
  router.get('/offers', async (req: Request, res: Response) => {
    try {
      const offers = await getAdminOffers(prisma);
      return res.json({ success: true, data: offers });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve offers.' });
    }
  });

  router.post('/offers', async (req: Request, res: Response) => {
    try {
      const { vegetableId, offerPrice } = req.body;
      if (!vegetableId || offerPrice === undefined) {
        return res.status(400).json({ success: false, error: 'vegetableId and offerPrice are required.' });
      }
      const updated = await setVegetableOffer(prisma, vegetableId, offerPrice);
      return res.json({ success: true, vegetable: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to set offer.' });
    }
  });

  router.delete('/offers/:vegetableId', async (req: Request, res: Response) => {
    try {
      const updated = await removeVegetableOffer(prisma, String(req.params.vegetableId));
      return res.json({ success: true, vegetable: updated });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to remove offer.' });
    }
  });

  // 9. Settings (Homepage, WhatsApp, Payment, Website)
  router.get('/settings', async (req: Request, res: Response) => {
    try {
      const settings = await getAdminSettings(prisma);
      return res.json({ success: true, data: settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
    }
  });

  router.put('/settings', async (req: Request, res: Response) => {
    try {
      const { settings } = req.body;
      const result = await updateAdminSettings(prisma, settings);
      return res.json({ success: true, updated: result.updated, skipped: result.skipped });
    } catch (err: any) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Failed to update settings.' });
    }
  });

  return router;
}
