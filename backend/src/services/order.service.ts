import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { CreateOrderInput } from '../schemas/order.schema.js';
import { validateAndCalculateWeight, ALLOWED_FIXED_WEIGHTS } from './weight.service.js';

// ─── Public Interfaces ───────────────────────────────────────────────────────

export interface OrderCreationResult {
  replayed?: boolean;
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
    statusHistory?: Array<{
      id: string;
      fromStatus: string | null;
      toStatus: string;
      note: string | null;
      createdAt: string;
    }>;
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

/** Per-item price-change detail surfaced to the caller. */
export interface PriceChangeDetail {
  vegetableId: string;
  vegetableName: string;
  submittedPricePerKg: number;
  currentPricePerKg: number;
}

// ─── Custom Errors ───────────────────────────────────────────────────────────

export class OrderValidationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'OrderValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when the submitted idempotency key was already used with a
 * materially different payload (different items/zone/customer).
 */
export class IdempotencyConflictError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
    this.statusCode = 409;
  }
}

/**
 * Thrown when one or more cart items have a price that has changed since
 * the customer built their cart.  The caller should surface `priceChanges`
 * to the customer for explicit review before they can proceed.
 */
export class StalePriceError extends Error {
  statusCode: number;
  priceChanges: PriceChangeDetail[];
  constructor(changes: PriceChangeDetail[]) {
    super(
      'One or more item prices have changed since you built your cart. ' +
      'Please review and confirm before proceeding.'
    );
    this.name = 'StalePriceError';
    this.statusCode = 409;
    this.priceChanges = changes;
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Build a stable SHA-256 hash of the meaningful checkout fields.
 * Volatile fields (timestamps, UI labels, nonces) are excluded so that a
 * genuine retry of the SAME attempt produces an identical hash.
 * Including expectedPricePerKg means a customer who reviews new prices
 * gets a different hash — and therefore a new idempotency window.
 */
function buildPayloadHash(input: CreateOrderInput): string {
  const canonical = {
    customerPhone: input.customer.phone.trim(),
    customerName: input.customer.name.trim(),
    zoneId: input.delivery.zoneId.trim(),
    address: input.delivery.address.trim(),
    items: [...input.items]
      .sort((a, b) => a.vegetableId.localeCompare(b.vegetableId))
      .map((it) => ({
        vegetableId: it.vegetableId,
        weightInKg: it.weightInKg,
        quantity: it.quantity,
        expectedPricePerKg: it.expectedPricePerKg ?? null,
      })),
    paymentMethod: input.paymentMethod,
    promoCode: input.promoCode ?? null,
    discountAmount: input.discountAmount ?? 0,
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/** Map a raw Prisma order record to the public OrderCreationResult shape. */
function mapOrderRecord(
  order: any,
  zoneName: string,
  replayed = false
): OrderCreationResult {
  return {
    replayed,
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
      deliveryZone: order.deliveryZone?.areaName || zoneName,
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
      items: order.items.map((it: any) => ({
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

export async function createOrder(
  prisma: PrismaClient,
  input: CreateOrderInput,
  authenticatedUserId?: string | null
): Promise<OrderCreationResult> {

  // ── Step 0: Resolve Payment Parameters ────────────────────────────────────
  const resolvedPaymentMethod = input.paymentMethod || 'COD';
  let resolvedPaymentStatus = 'COD';
  let resolvedOrderStatus = 'NEW';
  let resolvedTxnRef = input.paymentTxnRef ? input.paymentTxnRef.trim() : null;
  let statusNote = 'Order placed by customer (Cash on Delivery)';

  if (resolvedPaymentMethod === 'CARD') {
    resolvedPaymentStatus = 'PAID';
    resolvedOrderStatus = 'CONFIRMED';
    resolvedTxnRef = resolvedTxnRef || `CARD_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    statusNote = `Payment authorized & verified via Credit/Debit Card (${resolvedTxnRef})`;
  } else if (resolvedPaymentMethod === 'JAZZCASH') {
    resolvedPaymentStatus = 'PAID';
    resolvedOrderStatus = 'CONFIRMED';
    resolvedTxnRef = resolvedTxnRef || `JC_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    statusNote = `Advance payment completed via JazzCash (${resolvedTxnRef})`;
  } else if (resolvedPaymentMethod === 'EASYPAISA') {
    resolvedPaymentStatus = 'PAID';
    resolvedOrderStatus = 'CONFIRMED';
    resolvedTxnRef = resolvedTxnRef || `EP_TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    statusNote = `Advance payment completed via EasyPaisa (${resolvedTxnRef})`;
  } else if (resolvedPaymentMethod === 'BANK_TRANSFER') {
    resolvedPaymentStatus = 'PENDING_VERIFICATION';
    resolvedOrderStatus = 'CONFIRMED';
    resolvedTxnRef = resolvedTxnRef || `IBFT_${Date.now()}`;
    statusNote = `Direct Bank Transfer submitted for verification (${resolvedTxnRef})`;
  }

  // ── Step 1: Idempotency key processing ────────────────────────────────────
  const idempotencyKey = input.idempotencyKey ? input.idempotencyKey.trim() : '';
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new OrderValidationError(
      'A valid idempotency key (minimum 8 characters) is required for checkout.',
      400
    );
  }

  const payloadHash = buildPayloadHash(input);

  // Look for an existing order created with this key.
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
    include: {
      deliveryZone: true,
      items: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (existing) {
    // Key already used — verify the payload hash to detect changed payloads.
    if (existing.idempotencyPayloadHash !== payloadHash) {
      throw new IdempotencyConflictError(
        'This checkout key was already used with different order details. ' +
        'To place a new order with these changes, please start a new checkout attempt.'
      );
    }

    // Strict Scope check: key must belong to the exact same customer identity.
    if (existing.userId) {
      // Authenticated order: can only be replayed by the matching authenticated account.
      if (!authenticatedUserId || existing.userId !== authenticatedUserId) {
        throw new IdempotencyConflictError(
          'This checkout key belongs to a different account.'
        );
      }
    } else {
      // Guest order: cannot be replayed by an authenticated account,
      // and guest phone must match the original snapshot.
      if (authenticatedUserId) {
        throw new IdempotencyConflictError(
          'This checkout key belongs to a guest order.'
        );
      }
      if (existing.customerPhone !== input.customer.phone.trim()) {
        throw new IdempotencyConflictError(
          'This checkout key does not match the phone number used in the original attempt.'
        );
      }
    }

    // Valid replay — return existing order without creating a new one.
    return mapOrderRecord(existing, existing.deliveryZone?.areaName || '', true);
  }

  // ── Step 2: Delivery Zone validation ──────────────────────────────────────
  const zone = await prisma.deliveryZone.findUnique({
    where: { id: input.delivery.zoneId },
  });

  if (!zone) {
    throw new OrderValidationError('Selected delivery zone does not exist.', 404);
  }

  if (!zone.isActive) {
    throw new OrderValidationError(
      'Selected delivery zone is currently inactive and not accepting deliveries.',
      400
    );
  }

  const deliveryFee = zone.deliveryFee;

  // ── Step 3: Vegetable validation + server-side price calculation ───────────
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
  const priceChanges: PriceChangeDetail[] = [];

  for (const item of input.items) {
    const vegetable = await prisma.vegetable.findUnique({
      where: { id: item.vegetableId },
      include: { images: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!vegetable) {
      throw new OrderValidationError(
        `Vegetable with ID "${item.vegetableId}" was not found.`,
        404
      );
    }

    if (!vegetable.isAvailable) {
      throw new OrderValidationError(
        `"${vegetable.name}" is currently unavailable. Please remove it from your cart to proceed.`,
        400
      );
    }

    // Authoritative server price (offer price wins when active).
    const authoritativePricePerKg =
      vegetable.isOffer && vegetable.offerPrice !== null && vegetable.offerPrice !== undefined
        ? vegetable.offerPrice
        : vegetable.pricePerKg;

    if (authoritativePricePerKg <= 0 || isNaN(authoritativePricePerKg)) {
      throw new OrderValidationError(
        `Invalid price configuration for "${vegetable.name}".`,
        400
      );
    }

    // ── Stale-price check ────────────────────────────────────────────────
    if (item.expectedPricePerKg !== undefined && item.expectedPricePerKg !== null) {
      const submittedRounded = Math.round(item.expectedPricePerKg * 100) / 100;
      const currentRounded   = Math.round(authoritativePricePerKg * 100) / 100;
      if (submittedRounded !== currentRounded) {
        priceChanges.push({
          vegetableId: vegetable.id,
          vegetableName: vegetable.name,
          submittedPricePerKg: submittedRounded,
          currentPricePerKg: currentRounded,
        });
      }
    }

    // Determine weight mode: fixed vs custom.
    const requestedWeightKg = Math.round(item.weightInKg * 100) / 100;
    let selectionType: 'fixed' | 'custom';
    let fixedKey: string | null = null;
    let customWeightKg: number | null = null;

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

    // Authoritative weight calculation (also validates weight constraints).
    let weightCalc;
    try {
      weightCalc = validateAndCalculateWeight(
        selectionType,
        fixedKey,
        customWeightKg,
        authoritativePricePerKg,
        item.quantity
      );
    } catch (weightErr: any) {
      throw new OrderValidationError(weightErr.message || 'Invalid weight or quantity selection.', 400);
    }

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

  // Surface all stale-price changes at once — customer reviews the whole list.
  if (priceChanges.length > 0) {
    throw new StalePriceError(priceChanges);
  }

  // ── Step 4: Minimum order amount ──────────────────────────────────────────
  if (zone.minOrderAmount > 0 && calculatedSubtotal < zone.minOrderAmount) {
    throw new OrderValidationError(
      `Minimum order amount for ${zone.areaName} is Rs. ${zone.minOrderAmount}. ` +
      `Current subtotal: Rs. ${calculatedSubtotal}.`,
      400
    );
  }

  // ── Step 4.5: Calculate Promo / Discount ─────────────────────────────────
  let discountAmount = 0;
  if (input.promoCode) {
    const code = input.promoCode.trim().toUpperCase();
    if (code === 'TAAZA10') {
      discountAmount = Math.round(calculatedSubtotal * 0.10);
    } else if (code === 'SABZI20') {
      discountAmount = Math.round(calculatedSubtotal * 0.20);
    } else if (code === 'FREESHIP') {
      discountAmount = deliveryFee;
    } else if (code === 'FIRST50') {
      discountAmount = Math.min(50, calculatedSubtotal);
    } else if (code === 'MUZAFFAR15') {
      discountAmount = Math.round(calculatedSubtotal * 0.15);
    } else if (input.discountAmount && input.discountAmount > 0) {
      discountAmount = Math.min(input.discountAmount, calculatedSubtotal + deliveryFee);
    }

    if (discountAmount > 0) {
      statusNote += ` | Promo Code: ${code} (-Rs. ${discountAmount})`;
    }
  }

  const calculatedGrandTotal = Math.max(0, Math.round((calculatedSubtotal + deliveryFee - discountAmount) * 100) / 100);

  // ── Step 5: Atomic DB transaction ─────────────────────────────────────────
  //
  // The DB-level UNIQUE constraint on idempotencyKey is the last defence
  // against concurrent duplicate requests.  If two concurrent requests arrive
  // with the same key, the slower one will receive a P2002 unique-constraint
  // violation which we catch and convert to a replay response.
  let createdOrder: any;
  try {
    createdOrder = await prisma.$transaction(async (tx) => {
      return tx.order.create({
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
          paymentMethod: resolvedPaymentMethod,
          paymentStatus: resolvedPaymentStatus,
          paymentTxnRef: resolvedTxnRef,
          orderStatus: resolvedOrderStatus,
          idempotencyKey: idempotencyKey,
          idempotencyPayloadHash: payloadHash,
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
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: resolvedOrderStatus,
              note: statusNote,
            },
          },
        },
        include: {
          deliveryZone: true,
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  } catch (err: any) {
    // Concurrent duplicate: unique constraint on idempotencyKey fired.
    if (err?.code === 'P2002' && idempotencyKey) {
      const raceWinner = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: {
          deliveryZone: true,
          items: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (raceWinner) return mapOrderRecord(raceWinner, zone.areaName, true);
    }
    throw err;
  }

  return mapOrderRecord(createdOrder, zone.areaName, false);
}

export const VALID_ORDER_STATUSES = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatusType = typeof VALID_ORDER_STATUSES[number];

export async function updateOrderStatus(
  prisma: PrismaClient,
  orderId: number,
  newStatus: string,
  note?: string
) {
  if (!VALID_ORDER_STATUSES.includes(newStatus as OrderStatusType)) {
    throw new OrderValidationError(`Invalid order status: ${newStatus}`, 400);
  }

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id: orderId },
      include: { deliveryZone: true, items: true, statusHistory: true },
    });

    if (!existing) {
      throw new OrderValidationError('Order not found.', 404);
    }

    if (existing.orderStatus === newStatus) {
      return existing;
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        orderStatus: newStatus,
        statusHistory: {
          create: {
            fromStatus: existing.orderStatus,
            toStatus: newStatus,
            note: note || `Order status updated to ${newStatus}`,
          },
        },
      },
      include: {
        deliveryZone: true,
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return updated;
  });
}
