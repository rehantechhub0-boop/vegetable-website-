import { validateAndCalculateWeight } from '../services/weight.service.js';

console.log('--- RUNNING WEIGHT CALCULATION SERVICE TESTS ---');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

// Test 1: Rs. 200/kg fixed weights
const p200 = 200;

// 250g = Rs. 50
const r250g = validateAndCalculateWeight('fixed', '250g', null, p200, 1);
assert(r250g.itemTotal === 50 && r250g.weightInKg === 0.25, '250g at Rs.200/kg should equal Rs.50');

// 500g = Rs. 100
const r500g = validateAndCalculateWeight('fixed', '500g', null, p200, 1);
assert(r500g.itemTotal === 100 && r500g.weightInKg === 0.50, '500g at Rs.200/kg should equal Rs.100');

// 1kg = Rs. 200
const r1kg = validateAndCalculateWeight('fixed', '1kg', null, p200, 1);
assert(r1kg.itemTotal === 200 && r1kg.weightInKg === 1.00, '1kg at Rs.200/kg should equal Rs.200');

// 2kg = Rs. 400
const r2kg = validateAndCalculateWeight('fixed', '2kg', null, p200, 1);
assert(r2kg.itemTotal === 400 && r2kg.weightInKg === 2.00, '2kg at Rs.200/kg should equal Rs.400');

// 5kg = Rs. 1,000
const r5kg = validateAndCalculateWeight('fixed', '5kg', null, p200, 1);
assert(r5kg.itemTotal === 1000 && r5kg.weightInKg === 5.00, '5kg at Rs.200/kg should equal Rs.1000');

// 10kg = Rs. 2,000
const r10kg = validateAndCalculateWeight('fixed', '10kg', null, p200, 1);
assert(r10kg.itemTotal === 2000 && r10kg.weightInKg === 10.00, '10kg at Rs.200/kg should equal Rs.2000');

// Quantity multiplier test: 500g x 2 at Rs. 180/kg = Rs. 180
const rQty = validateAndCalculateWeight('fixed', '500g', null, 180, 2);
assert(rQty.itemTotal === 180 && rQty.unitPrice === 90, '500g x 2 at Rs.180/kg should equal Rs.180 (unitPrice Rs.90)');

// Test 2: Custom weights > 10kg
// 15.5kg at Rs. 200/kg = Rs. 3,100
const r15_5 = validateAndCalculateWeight('custom', null, 15.5, p200, 1);
assert(r15_5.itemTotal === 3100 && r15_5.weightInKg === 15.5 && r15_5.weightDisplay === '15.5kg Custom', '15.5kg custom at Rs.200/kg should equal Rs.3100');

// 10.1kg custom = allowed
const r10_1 = validateAndCalculateWeight('custom', null, 10.1, p200, 1);
assert(r10_1.itemTotal === 2020 && r10_1.weightInKg === 10.1, '10.1kg custom is allowed (>10kg)');

// Test 3: Custom weight <= 10kg MUST BE REJECTED
try {
  validateAndCalculateWeight('custom', null, 10.0, p200, 1);
  assert(false, '10kg custom should have thrown an error');
} catch (e: any) {
  assert(e.message.includes('Custom weight is strictly for orders above 10kg'), '10.0kg custom is rejected');
}

try {
  validateAndCalculateWeight('custom', null, 5.0, p200, 1);
  assert(false, '5kg custom should have thrown an error');
} catch (e: any) {
  assert(e.message.includes('Custom weight is strictly for orders above 10kg'), '5.0kg custom is rejected');
}

try {
  validateAndCalculateWeight('custom', null, 0.5, p200, 1);
  assert(false, '0.5kg custom should have thrown an error');
} catch (e: any) {
  assert(e.message.includes('Custom weight is strictly for orders above 10kg'), '0.5kg custom is rejected');
}

// Test 4: Disallowed fixed weights MUST BE REJECTED
try {
  validateAndCalculateWeight('fixed', '300g', null, p200, 1);
  assert(false, '300g fixed should have thrown an error');
} catch (e: any) {
  assert(e.message.includes('Invalid fixed weight'), '300g is rejected as an invalid fixed option');
}

try {
  validateAndCalculateWeight('fixed', '750g', null, p200, 1);
  assert(false, '750g fixed should have thrown an error');
} catch (e: any) {
  assert(e.message.includes('Invalid fixed weight'), '750g is rejected as an invalid fixed option');
}

console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
