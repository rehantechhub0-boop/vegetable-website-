import { PrismaClient } from '@prisma/client';
import { CreateOrderInput } from '../schemas/order.schema.js';
import { validateAndCalculateWeight, ALLOWED_FIXED_WEIGHTS } from './weight.service.js';

export interface OrderCreationResult {
  order: {
    id: number;
    orderNumber: string;
    uuid: string;
    orderStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    subtotal: number;
    deliveryFee: number;
    grandTotal: number;
    customerName: string;
    customerPhone: string;
    deliveryZone: string;
    deliveryAddress: string;
    deliveryNotes: string | null;
    createdAt: string;
    items: Array<{
      id: string;
      vegetableId: string | null;
      vegetableName: string;
      vegetableImage: string | null;
      pricePerKg: number;
      weightDisplay: string;
      weightInKg: number;
      unitPrice: number;
      quantity: number;
      itemTotal: number;
    }>;
  };
}

export class OrderValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'OrderValidationError';
    this.statusCode = statusCode;
  }
}

export async function createOrder(
  prisma: PrismaClient,
  input: CreateOrderInput,
  authenticatedUserId?: string | null
): Promise<OrderCreationResult> {
  // 1. Payment Method check
  if (input.paymentMethod !== 'COD') {
    throw new OrderValidationError('Online payment is not available yet. Please select Cash on Delivery (COD).', 400);
  }

  // 2. Delivery Zone validation
  const zone = await prisma.deliveryZone.findUnique({
    where: { id: input.delivery.zoneId },
  });

  if (!zone) {
    throw new OrderValidationError('Selected delivery zone does not exist.', 404);
  }

  if (!zone.isActive) {
    throw new OrderValidationError('Selected delivery zone is currently inactive and not accepting deliveries.', 400);
  }

  const deliveryFee = zone.deliveryFee;

  // 3. Vegetable & Item validation + Server-side price calculation
  const validatedItems: Array<{
    vegetableId: string;
    vegetableName: string;
    vegetableImage: string | null;
    pricePerKg: number;
    weightDisplay: string;
    weightInKg: number;
    unitPrice: number;
    quantity: number;
    itemTotal: number;
  }> = [];

  let calculatedSubtotal = 0;

  for (const item of input.items) {
    const vegetable = await prisma.vegetable.findUnique({
      where: { id: item.vegetableId },
      include: {
        images: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!vegetable) {
      throw new OrderValidationError(`Vegetable with ID "${item.vegetableId}" was not found.`, 404);
    }

    if (!vegetable.isAvailable) {
      throw new OrderValidationError(
        `"${vegetable.name}" is currently unavailable. Please remove it from your cart to proceed.`,
        400
      );
    }

    // Determine effective price per kg from DB
    const authoritativePricePerKg =
      vegetable.isOffer && vegetable.offerPrice !== null && vegetable.offerPrice !== undefined
        ? vegetable.offerPrice
        : vegetable.pricePerKg;

    if (authoritativePricePerKg <= 0 || isNaN(authoritativePricePerKg)) {
      throw new OrderValidationError(`Invalid price configuration for "${vegetable.name}".`, 400);
    }

    // Determine weight mode: fixed vs custom
    const requestedWeightKg = Math.round(item.weightInKg * 100) / 100;
    let selectionType: 'fixed' | 'custom';
    let fixedKey: string | null = null;
    let customWeightKg: number | null = null;

    // Check if it matches any fixed weight (e.g. 0.25 -> 250g, 0.5 -> 500g, 1 -> 1kg, 2 -> 2kg, 5 -> 5kg, 10 -> 10kg)
    const fixedEntry = Object.entries(ALLOWED_FIXED_WEIGHTS).find(
      ([, kg]) => Math.abs(kg - requestedWeightKg) < 0.0001
    );

    if (fixedEntry) {
      selectionType = 'fixed';
      fixedKey = fixedEntry[0];
    } else {
      selectionType = 'custom';
      customWeightKg = requestedWeightKg;
    }

    // Run authoritative calculation and weight constraint validation through weight.service.ts
    const weightCalc = validateAndCalculateWeight(
      selectionType,
      fixedKey,
      customWeightKg,
      authoritativePricePerKg,
      item.quantity
    );

    // Primary vegetable image for historical snapshot
    const primaryImage =
      vegetable.images.find((img) => img.isPrimary)?.url ||
      vegetable.images[0]?.url ||
      null;

    validatedItems.push({
      vegetableId: vegetable.id,
      vegetableName: vegetable.name,
      vegetableImage: primaryImage,
      pricePerKg: authoritativePricePerKg,
      weightDisplay: weightCalc.weightDisplay,
      weightInKg: weightCalc.weightInKg,
      unitPrice: weightCalc.unitPrice,
      quantity: weightCalc.quantity,
      itemTotal: weightCalc.itemTotal,
    });

    calculatedSubtotal = Math.round((calculatedSubtotal + weightCalc.itemTotal) * 100) / 100;
  }

  // Check minimum order amount if zone has one
  if (zone.minOrderAmount > 0 && calculatedSubtotal < zone.minOrderAmount) {
    throw new OrderValidationError(
      `Minimum order amount for ${zone.areaName} is Rs. ${zone.minOrderAmount}. Current subtotal: Rs. ${calculatedSubtotal}.`,
      400
    );
  }

  const calculatedGrandTotal = Math.round((calculatedSubtotal + deliveryFee) * 100) / 100;

  // 4. Atomic Prisma Transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    const orderRecord = await tx.order.create({
      data: {
        userId: authenticatedUserId || null,
        customerName: input.customer.name.trim(),
        customerPhone: input.customer.phone.trim(),
        deliveryAddress: input.delivery.address.trim(),
        deliveryZoneId: zone.id,
        deliveryNotes: input.delivery.notes ? input.delivery.notes.trim() : null,
        subtotal: calculatedSubtotal,
        deliveryFee: deliveryFee,
        grandTotal: calculatedGrandTotal,
        paymentMethod: 'COD',
        paymentStatus: 'COD',
        orderStatus: 'NEW',
        items: {
          create: validatedItems.map((it) => ({
            vegetableId: it.vegetableId,
            vegetableName: it.vegetableName,
            vegetableImage: it.vegetableImage,
            pricePerKg: it.pricePerKg,
            weightDisplay: it.weightDisplay,
            weightInKg: it.weightInKg,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            itemTotal: it.itemTotal,
          })),
        },
      },
      include: {
        deliveryZone: true,
        items: true,
      },
    });

    return orderRecord;
  });

  const readableOrderNumber = `ORD-${createdOrder.id}`;

  return {
    order: {
      id: createdOrder.id,
      orderNumber: readableOrderNumber,
      uuid: createdOrder.uuid,
      orderStatus: createdOrder.orderStatus,
      paymentStatus: createdOrder.paymentStatus,
      paymentMethod: createdOrder.paymentMethod,
      subtotal: createdOrder.subtotal,
      deliveryFee: createdOrder.deliveryFee,
      grandTotal: createdOrder.grandTotal,
      customerName: createdOrder.customerName,
      customerPhone: createdOrder.customerPhone,
      deliveryZone: createdOrder.deliveryZone?.areaName || zone.areaName,
      deliveryAddress: createdOrder.deliveryAddress,
      deliveryNotes: createdOrder.deliveryNotes,
      createdAt: createdOrder.createdAt.toISOString(),
      items: createdOrder.items.map((it) => ({
        id: it.id,
        vegetableId: it.vegetableId,
        vegetableName: it.vegetableName,
        vegetableImage: it.vegetableImage,
        pricePerKg: it.pricePerKg,
        weightDisplay: it.weightDisplay,
        weightInKg: it.weightInKg,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        itemTotal: it.itemTotal,
      })),
    },
  };
}
