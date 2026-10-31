import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildStringSearchFilter } from '../utils/search.util.js';

export class AdminValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AdminValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * 1. Dashboard Statistics & Server-side Aggregation
 */
export async function getDashboardStats(prisma: PrismaClient) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Aggregate orders by status
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderStatus: true,
      paymentStatus: true,
      paymentMethod: true,
      grandTotal: true,
      createdAt: true,
    },
  });

  const ordersCountTotal = orders.length;
  let ordersNewCount = 0;
  let ordersConfirmedCount = 0;
  let ordersPreparingCount = 0;
  let ordersOutForDeliveryCount = 0;
  let ordersDeliveredCount = 0;
  let ordersCancelledCount = 0;

  let ordersTodayCount = 0;
  let salesToday = 0;
  let salesPaidToday = 0;
  let salesCodToday = 0;
  let totalSalesAllTime = 0;

  for (const o of orders) {
    switch (o.orderStatus) {
      case 'NEW':
        ordersNewCount++;
        break;
      case 'CONFIRMED':
        ordersConfirmedCount++;
        break;
      case 'PREPARING':
        ordersPreparingCount++;
        break;
      case 'OUT_FOR_DELIVERY':
        ordersOutForDeliveryCount++;
        break;
      case 'DELIVERED':
        ordersDeliveredCount++;
        break;
      case 'CANCELLED':
        ordersCancelledCount++;
        break;
    }

    const isCancelled = o.orderStatus === 'CANCELLED';
    if (!isCancelled) {
      totalSalesAllTime += o.grandTotal;
    }

    const isToday = o.createdAt >= startOfToday;
    if (isToday) {
      ordersTodayCount++;
      if (!isCancelled) {
        salesToday += o.grandTotal;
        if (o.paymentStatus === 'PAID') {
          salesPaidToday += o.grandTotal;
        }
        if (o.paymentMethod === 'COD') {
          salesCodToday += o.grandTotal;
        }
      }
    }
  }

  // Recent 10 orders with item count
  const recentOrdersRaw = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      deliveryZone: true,
      items: {
        select: { id: true, vegetableName: true, quantity: true, itemTotal: true },
      },
    },
  });

  const recentOrders = recentOrdersRaw.map((o) => ({
    id: o.id,
    orderNumber: `ORD-${o.id}`,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    deliveryZone: o.deliveryZone?.areaName || 'Muzaffargarh',
    grandTotal: o.grandTotal,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    itemsCount: o.items.length,
    createdAt: o.createdAt.toISOString(),
  }));

  // Vegetables counts
  const totalVegetables = await prisma.vegetable.count();
  const availableVegetables = await prisma.vegetable.count({ where: { isAvailable: true } });
  const offerVegetables = await prisma.vegetable.count({ where: { isOffer: true } });

  // Customers count
  const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });

  return {
    ordersCountTotal,
    ordersNewCount,
    ordersConfirmedCount,
    ordersPreparingCount,
    ordersOutForDeliveryCount,
    ordersDeliveredCount,
    ordersCancelledCount,
    ordersTodayCount,
    salesToday,
    salesPaidToday,
    salesCodToday,
    totalSalesAllTime,
    customerCount: totalCustomers,
    totalVegetables,
    orders: {
      total: ordersCountTotal,
      new: ordersNewCount,
      confirmed: ordersConfirmedCount,
      preparing: ordersPreparingCount,
      outForDelivery: ordersOutForDeliveryCount,
      delivered: ordersDeliveredCount,
      cancelled: ordersCancelledCount,
      todayCount: ordersTodayCount,
    },
    financials: {
      salesToday,
      salesPaidToday,
      salesCodToday,
      totalSalesAllTime,
    },
    vegetables: {
      total: totalVegetables,
      available: availableVegetables,
      outOfStock: totalVegetables - availableVegetables,
      onOffer: offerVegetables,
    },
    customers: {
      total: totalCustomers,
    },
    recentOrders,
  };
}

/**
 * 2. Vegetable Management CRUD
 */
export async function getAdminVegetables(
  prisma: PrismaClient,
  params: { search?: string; page?: number; limit?: number }
) {
  const { search, page = 1, limit = 50 } = params;
  const where: any = {};

  if (search && search.trim()) {
    const s = search.trim();
    const strFilter = buildStringSearchFilter(s, prisma);
    where.OR = [
      { name: strFilter },
      { description: strFilter },
      { slug: strFilter },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, items] = await Promise.all([
    prisma.vegetable.count({ where }),
    prisma.vegetable.findMany({
      where,
      skip,
      take: limit,
      include: {
        images: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    data: items.map((v) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      description: v.description,
      pricePerKg: v.pricePerKg,
      isAvailable: v.isAvailable,
      isFeatured: v.isFeatured,
      isOffer: v.isOffer,
      offerPrice: v.offerPrice,
      ordersCount: v._count.orderItems,
      images: v.images,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  };
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `veg-${Date.now()}`;
}

export async function createVegetable(
  prisma: PrismaClient,
  data: {
    name: string;
    slug?: string;
    description: string;
    pricePerKg: number;
    isAvailable?: boolean;
    isFeatured?: boolean;
    isOffer?: boolean;
    offerPrice?: number | null;
    imageUrl?: string;
  }
) {
  const name = String(data.name || '').trim();
  if (name.length < 2) {
    throw new AdminValidationError('Vegetable name must be at least 2 characters.', 400);
  }

  const pricePerKg = Number(data.pricePerKg);
  if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
    throw new AdminValidationError('Price per kg must be a positive number greater than 0.', 400);
  }

  const isOffer = Boolean(data.isOffer);
  let offerPrice = data.offerPrice !== undefined && data.offerPrice !== null ? Number(data.offerPrice) : null;

  if (isOffer) {
    if (offerPrice === null || !Number.isFinite(offerPrice) || offerPrice <= 0) {
      throw new AdminValidationError('Offer price must be a positive number when offer is enabled.', 400);
    }
    if (offerPrice >= pricePerKg) {
      throw new AdminValidationError('Offer price must be strictly less than the regular price per kg.', 400);
    }
  } else {
    offerPrice = null;
  }

  let slug = data.slug ? String(data.slug).trim() : generateSlug(name);
  // Ensure uniqueness
  const existingWithSlug = await prisma.vegetable.findUnique({ where: { slug } });
  if (existingWithSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const vegetable = await prisma.vegetable.create({
    data: {
      name,
      slug,
      description: String(data.description || '').trim(),
      pricePerKg,
      isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
      isFeatured: Boolean(data.isFeatured),
      isOffer,
      offerPrice,
      images: data.imageUrl
        ? {
            create: {
              url: data.imageUrl,
              isPrimary: true,
              orderIndex: 0,
            },
          }
        : undefined,
    },
    include: {
      images: true,
    },
  });

  return vegetable;
}

export async function updateVegetable(
  prisma: PrismaClient,
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    pricePerKg?: number;
    isAvailable?: boolean;
    isFeatured?: boolean;
    isOffer?: boolean;
    offerPrice?: number | null;
  }
) {
  const existing = await prisma.vegetable.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminValidationError('Vegetable not found.', 404);
  }

  const updateData: any = {};

  if (data.name !== undefined) {
    const cleanName = String(data.name).trim();
    if (cleanName.length < 2) {
      throw new AdminValidationError('Vegetable name must be at least 2 characters.', 400);
    }
    updateData.name = cleanName;
  }

  const pricePerKg = data.pricePerKg !== undefined ? Number(data.pricePerKg) : existing.pricePerKg;
  if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
    throw new AdminValidationError('Price per kg must be a positive number greater than 0.', 400);
  }
  updateData.pricePerKg = pricePerKg;

  if (data.description !== undefined) {
    updateData.description = String(data.description).trim();
  }

  if (data.isAvailable !== undefined) {
    updateData.isAvailable = Boolean(data.isAvailable);
  }

  if (data.isFeatured !== undefined) {
    updateData.isFeatured = Boolean(data.isFeatured);
  }

  const isOffer = data.isOffer !== undefined ? Boolean(data.isOffer) : existing.isOffer;
  updateData.isOffer = isOffer;

  if (isOffer) {
    const offerPrice = data.offerPrice !== undefined && data.offerPrice !== null ? Number(data.offerPrice) : existing.offerPrice;
    if (offerPrice === null || !Number.isFinite(offerPrice) || offerPrice <= 0) {
      throw new AdminValidationError('Offer price must be a positive number when offer is enabled.', 400);
    }
    if (offerPrice >= pricePerKg) {
      throw new AdminValidationError('Offer price must be strictly less than the regular price per kg.', 400);
    }
    updateData.offerPrice = offerPrice;
  } else {
    updateData.offerPrice = null;
  }

  if (data.slug !== undefined && data.slug.trim()) {
    const cleanSlug = data.slug.trim();
    if (cleanSlug !== existing.slug) {
      const slugCollision = await prisma.vegetable.findUnique({ where: { slug: cleanSlug } });
      if (slugCollision && slugCollision.id !== id) {
        throw new AdminValidationError(`Slug "${cleanSlug}" is already in use by another vegetable.`, 409);
      }
      updateData.slug = cleanSlug;
    }
  }

  const updated = await prisma.vegetable.update({
    where: { id },
    data: updateData,
    include: { images: true },
  });

  return updated;
}

export async function deleteVegetable(prisma: PrismaClient, id: string) {
  const existing = await prisma.vegetable.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });

  if (!existing) {
    throw new AdminValidationError('Vegetable not found.', 404);
  }

  // Preserve historical order snapshot integrity:
  // If vegetable has existing order items, soft-deactivate it rather than cascade-deleting
  if (existing._count.orderItems > 0) {
    await prisma.vegetable.update({
      where: { id },
      data: { isAvailable: false },
    });
    return {
      deleted: false,
      deactivated: true,
      message: `Vegetable "${existing.name}" is referenced by ${existing._count.orderItems} past order(s). It has been deactivated to preserve order history.`,
    };
  }

  await prisma.vegetable.delete({ where: { id } });
  return {
    deleted: true,
    deactivated: false,
    message: `Vegetable "${existing.name}" deleted successfully.`,
  };
}

/**
 * 3. Vegetable Image Operations
 */
export async function addVegetableImage(
  prisma: PrismaClient,
  vegetableId: string,
  url: string,
  isPrimary: boolean = false
) {
  const veg = await prisma.vegetable.findUnique({ where: { id: vegetableId } });
  if (!veg) {
    throw new AdminValidationError('Vegetable not found.', 404);
  }

  if (isPrimary) {
    await prisma.vegetableImage.updateMany({
      where: { vegetableId },
      data: { isPrimary: false },
    });
  }

  const count = await prisma.vegetableImage.count({ where: { vegetableId } });

  const image = await prisma.vegetableImage.create({
    data: {
      vegetableId,
      url,
      isPrimary: isPrimary || count === 0,
      orderIndex: count,
    },
  });

  return image;
}

export async function deleteVegetableImage(
  prisma: PrismaClient,
  vegetableId: string,
  imageId: string
) {
  const image = await prisma.vegetableImage.findFirst({
    where: { id: imageId, vegetableId },
  });

  if (!image) {
    throw new AdminValidationError('Image not found for this vegetable.', 404);
  }

  await prisma.vegetableImage.delete({ where: { id: imageId } });

  // If deleted image was primary, set next available image as primary
  if (image.isPrimary) {
    const nextImg = await prisma.vegetableImage.findFirst({
      where: { vegetableId },
      orderBy: { orderIndex: 'asc' },
    });
    if (nextImg) {
      await prisma.vegetableImage.update({
        where: { id: nextImg.id },
        data: { isPrimary: true },
      });
    }
  }

  return { success: true, message: 'Image deleted successfully.' };
}

export async function setPrimaryVegetableImage(
  prisma: PrismaClient,
  vegetableId: string,
  imageId: string
) {
  const image = await prisma.vegetableImage.findFirst({
    where: { id: imageId, vegetableId },
  });

  if (!image) {
    throw new AdminValidationError('Image not found for this vegetable.', 404);
  }

  await prisma.vegetableImage.updateMany({
    where: { vegetableId },
    data: { isPrimary: false },
  });

  const updated = await prisma.vegetableImage.update({
    where: { id: imageId },
    data: { isPrimary: true },
  });

  return updated;
}

/**
 * 4. Admin Order Management
 */
export async function getAdminOrders(
  prisma: PrismaClient,
  params: {
    search?: string;
    orderStatus?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }
) {
  const { search, orderStatus, paymentStatus, page = 1, limit = 50 } = params;
  const where: any = {};

  if (orderStatus && orderStatus !== 'ALL') {
    where.orderStatus = orderStatus;
  }

  if (paymentStatus && paymentStatus !== 'ALL') {
    where.paymentStatus = paymentStatus;
  }

  if (search && search.trim()) {
    const s = search.trim();
    const rawNum = parseInt(s.replace(/^ORD-/i, ''), 10);
    const strFilter = buildStringSearchFilter(s, prisma);
    const conditions: any[] = [
      { customerName: strFilter },
      { customerPhone: strFilter },
    ];
    if (!isNaN(rawNum)) {
      conditions.push({ id: rawNum });
    }
    where.OR = conditions;
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      include: {
        deliveryZone: true,
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    data: orders.map((o) => ({
      id: o.id,
      orderNumber: `ORD-${o.id}`,
      uuid: o.uuid,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      deliveryArea: o.deliveryZone?.areaName || 'Muzaffargarh',
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      grandTotal: o.grandTotal,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      orderStatus: o.orderStatus,
      itemsCount: o.items.length,
      latestNote: o.statusHistory?.[0]?.note || null,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export async function getAdminOrderDetails(prisma: PrismaClient, idOrNumber: string) {
  const rawNum = parseInt(String(idOrNumber).replace(/^ORD-/i, ''), 10);

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: isNaN(rawNum) ? -1 : rawNum },
        { uuid: idOrNumber },
      ],
    },
    include: {
      deliveryZone: true,
      items: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    throw new AdminValidationError('Order not found.', 404);
  }

  return {
    id: order.id,
    orderNumber: `ORD-${order.id}`,
    uuid: order.uuid,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    deliveryZone: order.deliveryZone?.areaName || 'Muzaffargarh',
    deliveryNotes: order.deliveryNotes,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    grandTotal: order.grandTotal,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    paymentTxnRef: order.paymentTxnRef,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    user: order.user,
    statusHistory: order.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
    items: order.items.map((i) => ({
      id: i.id,
      vegetableId: i.vegetableId,
      vegetableName: i.vegetableName,
      vegetableImage: i.vegetableImage,
      pricePerKg: i.pricePerKg,
      weightDisplay: i.weightDisplay,
      weightInKg: i.weightInKg,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      itemTotal: i.itemTotal,
    })),
  };
}

export async function updateOrderPaymentStatus(
  prisma: PrismaClient,
  orderId: number,
  newPaymentStatus: string,
  txnRef?: string,
  actor?: string
) {
  const allowed = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'];
  if (!allowed.includes(newPaymentStatus)) {
    throw new AdminValidationError(`Invalid payment status: ${newPaymentStatus}`, 400);
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { statusHistory: true },
  });
  if (!existing) {
    throw new AdminValidationError('Order not found.', 404);
  }

  // Idempotent check
  if (existing.paymentStatus === newPaymentStatus && (!txnRef || txnRef === existing.paymentTxnRef)) {
    return existing;
  }

  // Transition validation:
  // Cannot un-refund a refunded order arbitrarily
  if (existing.paymentStatus === 'REFUNDED' && (newPaymentStatus === 'PAID' || newPaymentStatus === 'PENDING')) {
    throw new AdminValidationError('Cannot transition a refunded order back to PAID or PENDING.', 400);
  }

  // Cannot transition an already PAID order back to PENDING
  if (existing.paymentStatus === 'PAID' && newPaymentStatus === 'PENDING') {
    throw new AdminValidationError('Cannot transition an already paid order back to PENDING.', 400);
  }

  // Online Payment Verification Gate:
  // If payment method is online (ADVANCE_ONLINE or CARD) and marking as PAID,
  // require a verified transaction reference (evidence).
  if (existing.paymentMethod !== 'COD' && newPaymentStatus === 'PAID') {
    if (!txnRef || txnRef.trim().length < 4) {
      throw new AdminValidationError(
        'Transaction reference (txnRef) is required to reconcile online orders as PAID.',
        400
      );
    }
  }

  // Execute in transaction with audit logging in statusHistory
  const updated = await prisma.$transaction(async (tx) => {
    const orderUpdated = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newPaymentStatus,
        paymentTxnRef: txnRef || existing.paymentTxnRef,
        statusHistory: {
          create: {
            fromStatus: existing.orderStatus,
            toStatus: existing.orderStatus,
            note: `Payment status updated: ${existing.paymentStatus} -> ${newPaymentStatus}${txnRef ? ` (Ref: ${txnRef})` : ''} by ${actor || 'Admin'}`,
          },
        },
      },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return orderUpdated;
  });

  return updated;
}

/**
 * 5. Customer Management
 */
export async function getAdminCustomers(
  prisma: PrismaClient,
  params: { search?: string; page?: number; limit?: number }
) {
  const { search, page = 1, limit = 50 } = params;
  const where: any = {};

  if (search && search.trim()) {
    const s = search.trim();
    const strFilter = buildStringSearchFilter(s, prisma);
    where.OR = [
      { name: strFilter },
      { email: strFilter },
      { phone: strFilter },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            grandTotal: true,
            orderStatus: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    total,
    page,
    limit,
    data: users.map((u) => {
      const nonCancelledOrders = u.orders.filter((o) => o.orderStatus !== 'CANCELLED');
      const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.grandTotal, 0);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        ordersCount: u.orders.length,
        totalSpent,
      };
    }),
  };
}

export async function getAdminCustomerDetails(prisma: PrismaClient, customerId: string) {
  const user = await prisma.user.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      addresses: {
        include: { deliveryZone: true },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { deliveryZone: true, items: true },
      },
    },
  });

  if (!user) {
    throw new AdminValidationError('Customer not found.', 404);
  }

  const totalSpent = user.orders
    .filter((o) => o.orderStatus !== 'CANCELLED')
    .reduce((sum, o) => sum + o.grandTotal, 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    addresses: user.addresses,
    ordersCount: user.orders.length,
    totalSpent,
    recentOrders: user.orders.slice(0, 5).map((o) => ({
      id: o.id,
      orderNumber: `ORD-${o.id}`,
      grandTotal: o.grandTotal,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

/**
 * 6. Delivery Zone Management CRUD
 */
export async function getAdminDeliveryZones(prisma: PrismaClient) {
  const zones = await prisma.deliveryZone.findMany({
    include: {
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { areaName: 'asc' },
  });

  return zones.map((z) => ({
    id: z.id,
    areaName: z.areaName,
    deliveryFee: z.deliveryFee,
    minOrderAmount: z.minOrderAmount,
    estimatedDeliveryTime: z.estimatedDeliveryTime,
    isActive: z.isActive,
    ordersCount: z._count.orders,
    createdAt: z.createdAt.toISOString(),
    updatedAt: z.updatedAt.toISOString(),
  }));
}

export async function createDeliveryZone(
  prisma: PrismaClient,
  data: {
    areaName: string;
    deliveryFee: number;
    minOrderAmount?: number;
    estimatedDeliveryTime?: string;
    isActive?: boolean;
  }
) {
  const areaName = String(data.areaName || '').trim();
  if (areaName.length < 2) {
    throw new AdminValidationError('Area name must be at least 2 characters long.', 400);
  }

  const deliveryFee = Number(data.deliveryFee);
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    throw new AdminValidationError('Delivery fee must be 0 or a positive number.', 400);
  }

  const minOrderAmount = data.minOrderAmount !== undefined ? Number(data.minOrderAmount) : 0;
  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    throw new AdminValidationError('Minimum order amount must be 0 or a positive number.', 400);
  }

  const existing = await prisma.deliveryZone.findUnique({ where: { areaName } });
  if (existing) {
    throw new AdminValidationError(`Delivery area "${areaName}" already exists.`, 409);
  }

  const zone = await prisma.deliveryZone.create({
    data: {
      areaName,
      deliveryFee,
      minOrderAmount,
      estimatedDeliveryTime: data.estimatedDeliveryTime ? String(data.estimatedDeliveryTime).trim() : '30-45 mins',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });

  return zone;
}

export async function updateDeliveryZone(
  prisma: PrismaClient,
  id: string,
  data: {
    areaName?: string;
    deliveryFee?: number;
    minOrderAmount?: number;
    estimatedDeliveryTime?: string;
    isActive?: boolean;
  }
) {
  const existing = await prisma.deliveryZone.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminValidationError('Delivery zone not found.', 404);
  }

  const updateData: any = {};

  if (data.areaName !== undefined) {
    const cleanName = String(data.areaName).trim();
    if (cleanName.length < 2) {
      throw new AdminValidationError('Area name must be at least 2 characters.', 400);
    }
    if (cleanName !== existing.areaName) {
      const collision = await prisma.deliveryZone.findUnique({ where: { areaName: cleanName } });
      if (collision && collision.id !== id) {
        throw new AdminValidationError(`Area name "${cleanName}" already exists.`, 409);
      }
      updateData.areaName = cleanName;
    }
  }

  if (data.deliveryFee !== undefined) {
    const fee = Number(data.deliveryFee);
    if (!Number.isFinite(fee) || fee < 0) {
      throw new AdminValidationError('Delivery fee must be 0 or a positive number.', 400);
    }
    updateData.deliveryFee = fee;
  }

  if (data.minOrderAmount !== undefined) {
    const min = Number(data.minOrderAmount);
    if (!Number.isFinite(min) || min < 0) {
      throw new AdminValidationError('Minimum order amount must be 0 or a positive number.', 400);
    }
    updateData.minOrderAmount = min;
  }

  if (data.estimatedDeliveryTime !== undefined) {
    updateData.estimatedDeliveryTime = String(data.estimatedDeliveryTime).trim();
  }

  if (data.isActive !== undefined) {
    updateData.isActive = Boolean(data.isActive);
  }

  const updated = await prisma.deliveryZone.update({
    where: { id },
    data: updateData,
  });

  return updated;
}

export async function deleteDeliveryZone(prisma: PrismaClient, id: string) {
  const existing = await prisma.deliveryZone.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!existing) {
    throw new AdminValidationError('Delivery zone not found.', 404);
  }

  // Preserve historical order relationships:
  if (existing._count.orders > 0) {
    await prisma.deliveryZone.update({
      where: { id },
      data: { isActive: false },
    });
    return {
      deleted: false,
      deactivated: true,
      message: `Delivery zone "${existing.areaName}" is linked to ${existing._count.orders} order(s). It has been deactivated to preserve delivery records.`,
    };
  }

  await prisma.deliveryZone.delete({ where: { id } });
  return {
    deleted: true,
    deactivated: false,
    message: `Delivery zone "${existing.areaName}" deleted successfully.`,
  };
}

/**
 * 7. Offers Management
 */
export async function getAdminOffers(prisma: PrismaClient) {
  const vegetables = await prisma.vegetable.findMany({
    where: { isOffer: true },
    include: { images: { where: { isPrimary: true }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  });

  return vegetables.map((v) => {
    const discountAmount = v.pricePerKg - (v.offerPrice || v.pricePerKg);
    const discountPercent = Math.round((discountAmount / v.pricePerKg) * 100);

    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      pricePerKg: v.pricePerKg,
      offerPrice: v.offerPrice,
      discountAmount,
      discountPercent,
      isAvailable: v.isAvailable,
      image: v.images[0]?.url || null,
      updatedAt: v.updatedAt.toISOString(),
    };
  });
}

export async function setVegetableOffer(
  prisma: PrismaClient,
  vegetableId: string,
  offerPrice: number
) {
  const veg = await prisma.vegetable.findUnique({ where: { id: vegetableId } });
  if (!veg) {
    throw new AdminValidationError('Vegetable not found.', 404);
  }

  const price = Number(offerPrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new AdminValidationError('Offer price must be greater than 0.', 400);
  }

  if (price >= veg.pricePerKg) {
    throw new AdminValidationError(`Offer price (Rs. ${price}) must be strictly lower than regular price (Rs. ${veg.pricePerKg}).`, 400);
  }

  const updated = await prisma.vegetable.update({
    where: { id: vegetableId },
    data: {
      isOffer: true,
      offerPrice: price,
    },
  });

  return updated;
}

export async function removeVegetableOffer(prisma: PrismaClient, vegetableId: string) {
  const veg = await prisma.vegetable.findUnique({ where: { id: vegetableId } });
  if (!veg) {
    throw new AdminValidationError('Vegetable not found.', 404);
  }

  const updated = await prisma.vegetable.update({
    where: { id: vegetableId },
    data: {
      isOffer: false,
      offerPrice: null,
    },
  });

  return updated;
}

/**
 * 8. Settings Management (Homepage, WhatsApp, Payment, Website)
 */
const SENSITIVE_SETTING_KEYS = [
  'whatsapp_api_token',
  'whatsapp_app_secret',
  'payment_secret_key',
  'payment_webhook_secret',
  'payment_private_key',
];

export async function getAdminSettings(prisma: PrismaClient) {
  const settings = await prisma.setting.findMany({
    orderBy: { key: 'asc' },
  });

  const grouped: Record<string, Record<string, any>> = {
    general: {},
    homepage: {},
    whatsapp: {},
    payment: {},
    delivery: {},
  };

  for (const s of settings) {
    const isSensitive = SENSITIVE_SETTING_KEYS.includes(s.key);
    const safeValue = isSensitive && s.value ? '••••••••••••••••' : s.value;
    const groupKey = grouped[s.group] ? s.group : 'general';

    grouped[groupKey][s.key] = {
      key: s.key,
      value: safeValue,
      isConfigured: Boolean(s.value),
      isSensitive,
      description: s.description,
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  return grouped;
}

export async function updateAdminSettings(
  prisma: PrismaClient,
  rawSettings: any
) {
  let entries: Array<{ key: string; value: string; group?: string; description?: string }> = [];

  if (Array.isArray(rawSettings)) {
    entries = rawSettings;
  } else if (rawSettings && typeof rawSettings === 'object') {
    entries = Object.entries(rawSettings).map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }));
  }

  if (entries.length === 0) {
    throw new AdminValidationError('Settings entries are required.', 400);
  }

  return await prisma.$transaction(async (tx) => {
    let updated = 0;
    let skipped = 0;
    for (const item of entries) {
      const key = String(item.key || '').trim();
      if (!key) {
        skipped++;
        continue;
      }

      // If user submitted masked placeholder, don't overwrite existing secret
      if (item.value === '••••••••••••••••') {
        skipped++;
        continue;
      }

      await tx.setting.upsert({
        where: { key },
        update: {
          value: String(item.value ?? ''),
          group: item.group || undefined,
          description: item.description || undefined,
        },
        create: {
          key,
          value: String(item.value ?? ''),
          group: item.group || 'general',
          description: item.description || null,
        },
      });
      updated++;
    }
    return { success: true, updated, skipped };
  });
}

/**
 * 9. Admin Profile & Password Management
 */
export async function updateAdminProfile(
  prisma: PrismaClient,
  adminId: string,
  data: { name?: string; phone?: string }
) {
  const user = await prisma.user.findUnique({ where: { id: adminId } });
  if (!user || user.role !== 'ADMIN') {
    throw new AdminValidationError('Admin user not found.', 404);
  }

  const updateData: any = {};
  if (data.name !== undefined) {
    const cleanName = String(data.name).trim();
    if (cleanName.length < 2) {
      throw new AdminValidationError('Name must be at least 2 characters long.', 400);
    }
    updateData.name = cleanName;
  }

  if (data.phone !== undefined) {
    const cleanPhone = String(data.phone).trim();
    if (cleanPhone && cleanPhone !== user.phone) {
      const collision = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (collision && collision.id !== adminId) {
        throw new AdminValidationError('Phone number already associated with another account.', 409);
      }
      updateData.phone = cleanPhone;
    }
  }

  const updated = await prisma.user.update({
    where: { id: adminId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return updated;
}

export async function changeAdminPassword(
  prisma: PrismaClient,
  adminId: string,
  currentPass: string,
  newPass: string
) {
  const user = await prisma.user.findUnique({ where: { id: adminId } });
  if (!user || user.role !== 'ADMIN' || !user.passwordHash) {
    throw new AdminValidationError('Admin user not found.', 404);
  }

  const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
  if (!isMatch) {
    throw new AdminValidationError('Current password is incorrect.', 400);
  }

  if (!newPass || newPass.length < 6) {
    throw new AdminValidationError('New password must be at least 6 characters long.', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPass, salt);

  // Invalidate previous sessions by incrementing tokenVersion
  await prisma.user.update({
    where: { id: adminId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });

  return { success: true, message: 'Password updated successfully. Please login with your new password.' };
}
