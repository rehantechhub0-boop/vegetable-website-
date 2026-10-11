/**
 * Weight System Calculation & Validation Service
 * 
 * Allowed Fixed Weights:
 * - 250g (0.25 kg)
 * - 500g (0.50 kg)
 * - 1kg   (1.00 kg)
 * - 2kg   (2.00 kg)
 * - 5kg   (5.00 kg)
 * - 10kg  (10.00 kg)
 * 
 * Strict Custom Rule:
 * - Custom weight is strictly for weights GREATER THAN 10kg (> 10.0 kg).
 * - Custom weights <= 10.0 kg are strictly forbidden.
 */

export const ALLOWED_FIXED_WEIGHTS: Record<string, number> = {
  '250g': 0.25,
  '500g': 0.50,
  '1kg': 1.00,
  '2kg': 2.00,
  '5kg': 5.00,
  '10kg': 10.00,
};

export interface WeightCalculationResult {
  weightDisplay: string;
  weightInKg: number;
  pricePerKg: number;
  unitPrice: number;    // Price for one unit of this weight (weightInKg * pricePerKg)
  quantity: number;
  itemTotal: number;    // unitPrice * quantity
}

export function validateAndCalculateWeight(
  selectionType: 'fixed' | 'custom',
  fixedKey: string | null | undefined,
  customWeightKg: number | null | undefined,
  pricePerKg: number,
  quantity: number = 1
): WeightCalculationResult {
  if (typeof pricePerKg !== 'number' || pricePerKg <= 0 || isNaN(pricePerKg)) {
    throw new Error('Price per kg must be a positive number');
  }

  if (typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be an integer of 1 or greater');
  }

  let weightInKg: number;
  let weightDisplay: string;

  if (selectionType === 'fixed') {
    if (!fixedKey || !(fixedKey in ALLOWED_FIXED_WEIGHTS)) {
      throw new Error(
        `Invalid fixed weight "${fixedKey}". Allowed fixed options are: 250g, 500g, 1kg, 2kg, 5kg, 10kg.`
      );
    }
    weightInKg = ALLOWED_FIXED_WEIGHTS[fixedKey];
    weightDisplay = fixedKey;
  } else if (selectionType === 'custom') {
    if (customWeightKg === null || customWeightKg === undefined || isNaN(customWeightKg)) {
      throw new Error('Custom weight must be specified as a valid number in kilograms.');
    }

    // STRICT CUSTOM WEIGHT RULE: Must be strictly greater than 10kg
    if (customWeightKg <= 10.0) {
      throw new Error(
        'Custom weight is strictly for orders above 10kg. For 10kg or less, please select from the predefined weight options (250g, 500g, 1kg, 2kg, 5kg, 10kg).'
      );
    }

    // Normalize to max 2 decimal places (e.g. 15.5kg, 12.25kg)
    weightInKg = Math.round(customWeightKg * 100) / 100;
    // Format display string nicely
    const formattedWeight = Number.isInteger(weightInKg) ? `${weightInKg}kg` : `${weightInKg}kg`;
    weightDisplay = `${formattedWeight} Custom`;
  } else {
    throw new Error('Invalid selection type. Must be either "fixed" or "custom".');
  }

  // Exact monetary rounding to 2 decimal places to prevent floating point inaccuracies
  const unitPrice = Math.round(pricePerKg * weightInKg * 100) / 100;
  const itemTotal = Math.round(unitPrice * quantity * 100) / 100;

  return {
    weightDisplay,
    weightInKg,
    pricePerKg,
    unitPrice,
    quantity,
    itemTotal,
  };
}
