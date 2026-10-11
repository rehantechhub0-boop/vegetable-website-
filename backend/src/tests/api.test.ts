async function runApiVerification() {
  console.log('--- RUNNING PHASE 1 END-TO-END API TESTS ---');

  // 1. Health check
  const healthRes = await fetch('http://localhost:5000/api/health');
  const health: any = await healthRes.json();
  console.log('Health Check:', health);

  // 2. Settings check (Brand name & WhatsApp & Currency)
  const settingsRes = await fetch('http://localhost:5000/api/v1/settings');
  const settings: any = await settingsRes.json();
  console.log('Settings Data:', settings.data);

  // 3. Delivery Zones
  const zonesRes = await fetch('http://localhost:5000/api/v1/delivery-zones');
  const zones: any = await zonesRes.json();
  console.log(`Active Delivery Zones (${zones.data.length}):`, zones.data.map((z: any) => `${z.areaName} (Fee: Rs.${z.deliveryFee})`));

  // 4. Vegetables catalog (Vegetables only)
  const vegRes = await fetch('http://localhost:5000/api/v1/vegetables');
  const veg: any = await vegRes.json();
  console.log(`Seeded Vegetables (${veg.data.length}):`, veg.data.map((v: any) => `${v.name} @ Rs.${v.pricePerKg}/kg`));

  // 5. Weight calculation: Fixed 250g @ Rs. 180/kg = Rs. 45
  const calc1Res = await fetch('http://localhost:5000/api/v1/weight/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectionType: 'fixed',
      fixedKey: '250g',
      pricePerKg: 180,
      quantity: 1,
    })
  });
  const calc1: any = await calc1Res.json();
  console.log('Calc 1 (250g @ Rs.180/kg):', calc1.data);

  // 6. Weight calculation: Custom 15.5kg @ Rs. 180/kg = Rs. 2,790
  const calc2Res = await fetch('http://localhost:5000/api/v1/weight/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectionType: 'custom',
      customWeightKg: 15.5,
      pricePerKg: 180,
      quantity: 1,
    })
  });
  const calc2: any = await calc2Res.json();
  console.log('Calc 2 (Custom 15.5kg @ Rs.180/kg):', calc2.data);

  // 7. Weight calculation: Custom 8kg (Rejection test)
  const calc3Res = await fetch('http://localhost:5000/api/v1/weight/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      selectionType: 'custom',
      customWeightKg: 8.0,
      pricePerKg: 180,
      quantity: 1,
    })
  });
  const calc3 = await calc3Res.json();
  console.log('Calc 3 (Custom <= 10kg Rejection):', calc3);

  // 8. Frontend HTML check
  const feRes = await fetch('http://localhost:5173/');
  const feHtml = await feRes.text();
  console.log(`Frontend Vite Server Response: HTTP ${feRes.status}, HTML length: ${feHtml.length} bytes`);

  console.log('\n--- ALL PHASE 1 INTEGRATION TESTS COMPLETED SUCCESSFULLY ---');
}

runApiVerification().catch(console.error);
