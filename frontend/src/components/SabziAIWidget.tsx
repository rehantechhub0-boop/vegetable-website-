import React, { useState } from 'react';
import { ChefHat, X, Sparkles, ShoppingBag, Utensils, Wallet, Check, Clock, Users, Calendar } from 'lucide-react';
import { CartEntry, VegetableItem } from './VegetableCard';

interface SmartKitchenWidgetProps {
  onAddToCart?: (entry: CartEntry) => void;
  vegetables?: VegetableItem[];
}

interface Recipe {
  id: string;
  title: string;
  badge: string;
  time: string;
  serves: string;
  desc: string;
  ingredients: Array<{ name: string; weight: string; price: number }>;
  instructions: string;
}

interface BudgetPack {
  id: string;
  title: string;
  budgetLabel: string;
  totalPrice: number;
  items: Array<{ name: string; weight: string; price: number }>;
  desc: string;
}

const READYMADE_RECIPES: Recipe[] = [
  {
    id: 'aloo-palak',
    title: 'Dhabba Style Aloo Palak',
    badge: 'Most Popular Desi Handi',
    time: '25 mins',
    serves: '4-5 Persons',
    desc: 'Taaza palak ko halka sa blanch karke desi masalon aur fried aloo ke sath dam par pakayein. Boiled rice aur roti dono ke sath lajawab!',
    ingredients: [
      { name: 'Palak (Farm Fresh Spinach)', weight: '1kg', price: 85 },
      { name: 'Aloo (Farm Fresh Potatoes)', weight: '1kg', price: 95 },
      { name: 'Tamatar (Red Tomatoes)', weight: '500g', price: 80 },
    ],
    instructions: '1. Palak ko dho kar 3 minute ubaalein aur paste bana lein. 2. Aloo ko golden fry karein. 3. Pyaz tamatar ka masala bhon kar palak aur aloo shamil karein aur 10 min dam dein.',
  },
  {
    id: 'mix-sabzi',
    title: 'Desi Shahi Mix Sabzi Handi',
    badge: 'Kids & Family Favorite',
    time: '30 mins',
    serves: '5-6 Persons',
    desc: 'Gajar, Matar, Aloo aur Shimla Mirch ka classic Pakistani combination jo har ghar me shauq se khaya jata hai.',
    ingredients: [
      { name: 'Aloo (Farm Fresh Potatoes)', weight: '1kg', price: 95 },
      { name: 'Phool Gobi (Cauliflower)', weight: '1kg', price: 190 },
      { name: 'Tamatar (Red Tomatoes)', weight: '500g', price: 80 },
    ],
    instructions: 'Sabziyon ko chakor tukron me kaat kar pyaz, zeera aur tamatar ke masale me halki aanch par paka kar akhir me garam masala aur taaza dhaniya chhirkein.',
  },
  {
    id: 'bhindi-masala',
    title: 'Crispy Chatpatti Bhindi',
    badge: 'Special Mandi Pick',
    time: '20 mins',
    serves: '3-4 Persons',
    desc: 'Tender fresh bhindi bina chipchipahat ke, pyaz aur amchur masale ke sath crispy fry.',
    ingredients: [
      { name: 'Bhindi (Tender Lady Finger)', weight: '1kg', price: 240 },
      { name: 'Pyaz (Red Onions)', weight: '500g', price: 110 },
      { name: 'Tamatar (Red Tomatoes)', weight: '250g', price: 40 },
    ],
    instructions: 'Bhindi dho kar sookhi kaatein. Oil me halka sa fry karein, phir pyaz aur tamatar masale me mix karke dam par crispy banayein.',
  },
  {
    id: 'detox-salad',
    title: 'Fresh Weight-Loss Salad',
    badge: 'Healthy & Slimming',
    time: '10 mins',
    serves: '2-3 Persons',
    desc: 'Crunchy kheera, chukandar aur tamatar lemon dressing ke sath — digestion aur energy ke liye behtareen.',
    ingredients: [
      { name: 'Kheera (Crisp Cucumber)', weight: '1kg', price: 90 },
      { name: 'Tamatar (Red Tomatoes)', weight: '500g', price: 80 },
    ],
    instructions: 'Barik slices kaat kar leemo ka ras, halka sa kala namak aur kali mirch daal kar serve karein.',
  },
];

const BUDGET_PACKS: BudgetPack[] = [
  {
    id: 'pack-250',
    title: 'Daily Kitchen Essentials',
    budgetLabel: 'Rs. 250 Budget',
    totalPrice: 240,
    desc: 'Rozana ghar ki bunyadi zaroorat: 1kg Aloo + 500g Tamatar + 500g Pyaz.',
    items: [
      { name: 'Aloo (Farm Fresh Potatoes)', weight: '1kg', price: 95 },
      { name: 'Tamatar (Red Tomatoes)', weight: '500g', price: 80 },
      { name: 'Pyaz (Red Onions)', weight: '500g', price: 65 },
    ],
  },
  {
    id: 'pack-450',
    title: 'Subah & Shaam Handi Pack',
    budgetLabel: 'Rs. 450 Budget',
    totalPrice: 420,
    desc: 'Subah aur shaam do waqt ka lajawab salan banane ke liye perfect fresh package.',
    items: [
      { name: 'Aloo (Farm Fresh Potatoes)', weight: '2kg', price: 190 },
      { name: 'Palak (Farm Fresh Spinach)', weight: '1kg', price: 85 },
      { name: 'Tamatar (Red Tomatoes)', weight: '1kg', price: 145 },
    ],
  },
  {
    id: 'pack-750',
    title: 'Family Feast Weekly Pack',
    budgetLabel: 'Rs. 750 Budget',
    totalPrice: 720,
    desc: '4-6 afraad ke ghar ke liye 4 din ki mukammal taaza sabziyan wholesale bachat par.',
    items: [
      { name: 'Aloo (Farm Fresh Potatoes)', weight: '3kg', price: 285 },
      { name: 'Phool Gobi (Cauliflower)', weight: '1kg', price: 190 },
      { name: 'Tamatar (Red Tomatoes)', weight: '1kg', price: 145 },
      { name: 'Palak (Farm Fresh Spinach)', weight: '1kg', price: 85 },
      { name: 'Dhaniya & Hari Mirch Gaddi', weight: 'Bundle', price: 15 },
    ],
  },
];

interface DayPlan {
  day: number;
  dishName: string;
  category: string;
  sabziSummary: string;
  estimatedDailyCost: number;
}

const MONTHLY_30_DAYS: Record<number, DayPlan[]> = {
  1: [
    { day: 1, dishName: 'Dhabba Aloo Palak Handi', category: 'Desi Classic', sabziSummary: '1kg Palak + 1kg Aloo + 500g Tamatar', estimatedDailyCost: 260 },
    { day: 2, dishName: 'Chatpatti Bhindi Masala', category: 'Crispy Fry', sabziSummary: '1kg Bhindi + 500g Pyaz + 250g Tamatar', estimatedDailyCost: 310 },
    { day: 3, dishName: 'Daal Mash with Tamatar Fry', category: 'Healthy Daal', sabziSummary: '500g Tamatar + Hari Mirch + Dhaniya Gaddi', estimatedDailyCost: 150 },
    { day: 4, dishName: 'Phool Gobi & Matar Salan', category: 'Family Special', sabziSummary: '1kg Phool Gobi + 500g Matar + 500g Aloo', estimatedDailyCost: 340 },
    { day: 5, dishName: 'Desi Shahi Mix Sabzi Handi', category: 'Kids Favorite', sabziSummary: 'Gajar + Matar + Aloo + Shimla Mirch', estimatedDailyCost: 290 },
    { day: 6, dishName: 'Desi Tori & Chana Daal', category: 'Light & Fresh', sabziSummary: '1kg Desi Tori + 250g Tamatar + Pyaz', estimatedDailyCost: 220 },
    { day: 7, dishName: 'Sunday Aloo Shimla Mirch Roast', category: 'Weekend Special', sabziSummary: '1kg Shimla Mirch + 1kg Aloo + Salad', estimatedDailyCost: 320 },
  ],
  2: [
    { day: 8, dishName: 'Smoked Baingan Bharta', category: 'Village Taste', sabziSummary: '1kg Baingan + 500g Tamatar + Pyaz', estimatedDailyCost: 210 },
    { day: 9, dishName: 'Karelay Pyaz Masala', category: 'Sugar & Health Care', sabziSummary: '1kg Karelay + 750g Pyaz + Leemo', estimatedDailyCost: 280 },
    { day: 10, dishName: 'Punjabi Kadhi Pakora Handi', category: 'Desi Comfort', sabziSummary: 'Palak + Pyaz + Aloo (For Crispy Pakoras)', estimatedDailyCost: 190 },
    { day: 11, dishName: 'Matar Pulao with Crunchy Salad', category: 'Rice Feast', sabziSummary: '1kg Matar + 500g Kheera + Tamatar', estimatedDailyCost: 310 },
    { day: 12, dishName: 'Arvi Masala Dum Gravy', category: 'Classic Handi', sabziSummary: '1kg Arvi + 500g Tamatar + Ajwain', estimatedDailyCost: 270 },
    { day: 13, dishName: 'Lauki (Ghia Kaddu) Daal Handi', category: 'Sunnah Food', sabziSummary: '1kg Gol Kaddu + Tamatar + Hari Mirch', estimatedDailyCost: 180 },
    { day: 14, dishName: 'Sunday Dhaba Style Aloo Gobi', category: 'Weekend Special', sabziSummary: '1kg Gobi + 1kg Aloo + Adrak Gaddi', estimatedDailyCost: 290 },
  ],
  3: [
    { day: 15, dishName: 'Methi Aloo Desi Bhujia', category: 'Aromatic Winter/Fresh', sabziSummary: '1kg Taaza Methi + 1kg Aloo + Garlic', estimatedDailyCost: 240 },
    { day: 16, dishName: 'Tinda Desi Masala Handi', category: 'Traditional', sabziSummary: '1kg Desi Teenda + 500g Pyaz + Tamatar', estimatedDailyCost: 220 },
    { day: 17, dishName: 'Palak Aloo Bhujia & Roti', category: 'Iron Rich', sabziSummary: '1kg Palak + 1kg Aloo + Leemo', estimatedDailyCost: 230 },
    { day: 18, dishName: 'Shalgam & Aloo Salan', category: 'Sweet & Savory', sabziSummary: '1kg Shalgam + 500g Aloo + Gur/Tamatar', estimatedDailyCost: 190 },
    { day: 19, dishName: 'Moong Daal Tadka & Zeera Rice', category: 'Light Dinner', sabziSummary: 'Tamatar + Hari Mirch + Fresh Dhaniya', estimatedDailyCost: 140 },
    { day: 20, dishName: 'Bhindi Do Pyaza Handi', category: 'Restaurant Style', sabziSummary: '1kg Bhindi + 1kg Pyaz + Spices', estimatedDailyCost: 320 },
    { day: 21, dishName: 'Sunday Vegetable Biryani Feast', category: 'Weekend Special', sabziSummary: 'Aloo + Matar + Gajar + Salad Kheera', estimatedDailyCost: 380 },
  ],
  4: [
    { day: 22, dishName: 'Sarson Ka Saag & Makkhan', category: 'Punjab Heritage', sabziSummary: '2kg Saag + 1kg Bathu/Palak + Hari Mirch', estimatedDailyCost: 290 },
    { day: 23, dishName: 'Aloo Shimla Mirch Gravy', category: 'Quick Everyday', sabziSummary: '1kg Aloo + 500g Shimla Mirch + Tamatar', estimatedDailyCost: 240 },
    { day: 24, dishName: 'Daal Palak Super Bowl', category: 'Protein & Iron', sabziSummary: '1kg Palak + Tamatar + Ginger', estimatedDailyCost: 180 },
    { day: 25, dishName: 'Gobi Gosht / Gobi Aloo Masala', category: 'Royal Handi', sabziSummary: '1kg Gobi + 500g Tamatar + Adrak', estimatedDailyCost: 260 },
    { day: 26, dishName: 'Lauki (Kashmiri Kaddu) Salan', category: 'Digestive Comfort', sabziSummary: '1kg Lauki + Pyaz + Tamatar', estimatedDailyCost: 170 },
    { day: 27, dishName: 'Baingan Aloo Bhujia', category: 'Quick Cooking', sabziSummary: '1kg Baingan + 1kg Aloo + Kalonji', estimatedDailyCost: 210 },
    { day: 28, dishName: 'Karela Pyaz Chatpatta', category: 'Health Booster', sabziSummary: '1kg Karelay + 750g Pyaz', estimatedDailyCost: 270 },
    { day: 29, dishName: 'Crispy Bhindi Fry & Lemon', category: 'Family Favorite', sabziSummary: '1kg Bhindi + Tamatar + Green Chillies', estimatedDailyCost: 280 },
    { day: 30, dishName: 'Month-End Grand Mix Sabzi Dastarkhwan', category: 'Grand Celebration', sabziSummary: 'Mixed Produce Harvest Basket (3kg Assorted)', estimatedDailyCost: 350 },
  ],
};

export const SabziAIWidget: React.FC<SmartKitchenWidgetProps> = ({ onAddToCart, vegetables = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'budget' | 'plan30'>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(READYMADE_RECIPES[0]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetPack>(BUDGET_PACKS[0]);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Custom Budget & Family Size State
  const [customDailyBudget, setCustomDailyBudget] = useState<string>('320');
  const [familyMembers, setFamilyMembers] = useState<number>(4);
  const [activePlanWeek, setActivePlanWeek] = useState<number>(1);

  const handleAddItems = (items: Array<{ name: string; weight: string; price: number }>) => {
    let count = 0;
    items.forEach((it) => {
      // Find matching vegetable in store or mock
      const matched = vegetables.find((v) =>
        it.name.toLowerCase().includes(v.name.toLowerCase().split(' ')[0]) ||
        v.name.toLowerCase().includes(it.name.toLowerCase().split(' ')[0])
      );

      const fakeVeg: VegetableItem = matched || {
        id: `widget-${it.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: it.name,
        slug: it.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: 'Selected via Kitchen & Budget Assistant',
        pricePerKg: it.price,
        isAvailable: true,
        isFeatured: false,
        isOffer: false,
        images: [{ url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=75', isPrimary: true }],
      };

      const kg = it.weight.includes('250g') ? 0.25 : it.weight.includes('500g') ? 0.5 : it.weight.includes('2kg') ? 2.0 : it.weight.includes('3kg') ? 3.0 : 1.0;

      onAddToCart?.({
        id: `${fakeVeg.id}-${it.weight}`,
        vegetable: fakeVeg,
        weightDisplay: it.weight,
        weightInKg: kg,
        unitPrice: it.price,
        quantity: 1,
        itemTotal: it.price,
      });
      count++;
    });

    setAddedToast(`${count} fresh items added to cart!`);
    setTimeout(() => setAddedToast(null), 2500);
  };

  return (
    <>
      {/* ── FLOATING LAUNCHER BUTTON (hidden when modal is open) ── */}
      {!isOpen && (
        <button
          type="button"
          id="sabzi-ai-launcher-btn"
          className="sabzi-ai-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Open Kitchen & Budget Assistant"
        >
          <span className="sabzi-ai-pulse-ring" />
          <span className="sabzi-ai-badge-chip">
            <Sparkles size={13} />
            <span>Aaj Kya Pakaon?</span>
          </span>
          <ChefHat size={22} className="sabzi-ai-icon" />
        </button>
      )}

      {/* ── ROCK-SOLID ASSISTANT MODAL WITH STICKY ACTION FOOTER ── */}
      {isOpen && (
        <div
          className="kitchen-modal-backdrop"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="kitchen-assistant-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. FIXED HEADER */}
            <div className="kitchen-modal-header">
              <div className="kitchen-header-left">
                <div className="kitchen-avatar-wrap">
                  <ChefHat size={22} />
                </div>
                <div>
                  <h3 className="kitchen-modal-title">Desi Kitchen & Budget Assistant</h3>
                  <p className="kitchen-modal-subtitle">
                    <span className="kitchen-live-dot" /> Muzaffargarh Fresh Suggestions
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="kitchen-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close Assistant"
              >
                <X size={20} />
              </button>
            </div>

            {/* Toast Alert */}
            {addedToast && (
              <div className="kitchen-toast-alert animate-fade-in">
                <Check size={16} />
                <span>{addedToast}</span>
              </div>
            )}

            {/* 2. FIXED TABS SWITCHER */}
            <div className="kitchen-tabs-nav" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <button
                type="button"
                className={`kitchen-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
                onClick={() => setActiveTab('recipes')}
              >
                <Utensils size={15} />
                <span>Aaj Kya Banayein?</span>
              </button>
              <button
                type="button"
                className={`kitchen-tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
                onClick={() => setActiveTab('budget')}
              >
                <Wallet size={15} />
                <span>Mera Budget</span>
              </button>
              <button
                type="button"
                className={`kitchen-tab-btn ${activeTab === 'plan30' ? 'active' : ''}`}
                onClick={() => setActiveTab('plan30')}
              >
                <Calendar size={15} />
                <span>30-Day Plan</span>
              </button>
            </div>

            {/* 3. SUB CONTROLS & CHIPS */}
            {activeTab === 'recipes' && (
              <div className="kitchen-chips-bar">
                {READYMADE_RECIPES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`kitchen-chip-pill ${selectedRecipe.id === r.id ? 'active' : ''}`}
                    onClick={() => setSelectedRecipe(r)}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'budget' && (
              <div style={{ padding: '10px 16px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#059669" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>Ghar ke Afraad:</span>
                    <select
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(Number(e.target.value))}
                      style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.78rem', backgroundColor: '#fff', fontWeight: 600, outline: 'none' }}
                    >
                      <option value={2}>2 Afraad (Chota Ghar)</option>
                      <option value={4}>4 Afraad (Medium)</option>
                      <option value={6}>6 Afraad (Bara Ghar)</option>
                      <option value={8}>8+ Afraad (Joint Family)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>Rozana Budget: Rs.</span>
                    <input
                      type="number"
                      value={customDailyBudget}
                      onChange={(e) => setCustomDailyBudget(e.target.value)}
                      placeholder="e.g. 350"
                      style={{ width: '70px', padding: '3px 6px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.8rem', fontWeight: 700, outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="kitchen-chips-bar" style={{ padding: 0 }}>
                  {BUDGET_PACKS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`kitchen-chip-pill ${selectedBudget.id === b.id ? 'active' : ''}`}
                      onClick={() => setSelectedBudget(b)}
                    >
                      {b.budgetLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'plan30' && (
              <div style={{ padding: '10px 16px', backgroundColor: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#059669" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>Family Size:</span>
                    <select
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(Number(e.target.value))}
                      style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '0.78rem', backgroundColor: '#fff', fontWeight: 600, outline: 'none' }}
                    >
                      <option value={2}>2 Afraad</option>
                      <option value={4}>4 Afraad</option>
                      <option value={6}>6 Afraad</option>
                      <option value={8}>8+ Afraad</option>
                    </select>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 700 }}>
                    Monthly Estimated: <strong style={{ color: '#059669', fontSize: '0.9rem' }}>Rs. {(parseFloat(customDailyBudget) || 300) * 30}</strong>
                  </div>
                </div>

                {/* 4 Weeks Selector */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3, 4].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setActivePlanWeek(w)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: '6px',
                        border: activePlanWeek === w ? '2px solid #059669' : '1px solid #cbd5e1',
                        backgroundColor: activePlanWeek === w ? '#059669' : '#ffffff',
                        color: activePlanWeek === w ? '#ffffff' : '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {w === 1 ? 'Hafta 1 (1-7)' : w === 2 ? 'Hafta 2 (8-14)' : w === 3 ? 'Hafta 3 (15-21)' : 'Hafta 4 (22-30)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SCROLLABLE CONTENT BODY */}
            <div className="kitchen-scroll-body">
              {activeTab === 'recipes' ? (
                <div className="kitchen-recipe-sheet">
                  {/* Recipe Header */}
                  <div className="kitchen-sheet-head">
                    <div>
                      <span className="kitchen-sheet-badge">{selectedRecipe.badge}</span>
                      <h4 className="kitchen-sheet-title">{selectedRecipe.title}</h4>
                    </div>
                    <div className="kitchen-sheet-meta">
                      <span><Clock size={13} /> {selectedRecipe.time}</span>
                      <span><Users size={13} /> {selectedRecipe.serves}</span>
                    </div>
                  </div>

                  <p className="kitchen-sheet-desc">{selectedRecipe.desc}</p>

                  {/* Required Ingredients */}
                  <div className="kitchen-sheet-ingredients">
                    <span className="ingredients-box-label">Zaroori Taaza Sabziyan:</span>
                    <div className="ingredients-box-list">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="ingredient-item-row">
                          <span className="ing-item-name">🥬 {ing.name}</span>
                          <span className="ing-item-weight">{ing.weight}</span>
                          <span className="ing-item-price">Rs. {ing.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chef Tip */}
                  <div className="kitchen-sheet-tip">
                    <strong>Desi Tip:</strong> {selectedRecipe.instructions}
                  </div>
                </div>
              ) : activeTab === 'budget' ? (
                <div className="kitchen-recipe-sheet">
                  {/* Budget Header */}
                  <div className="kitchen-sheet-head">
                    <div>
                      <span className="kitchen-sheet-badge budget-deal-badge">
                        Verified Mandi Deal
                      </span>
                      <h4 className="kitchen-sheet-title">{selectedBudget.title}</h4>
                    </div>
                    <div className="budget-price-callout">
                      <span className="price-callout-label">Sirf</span>
                      <strong className="price-callout-val">Rs. {selectedBudget.totalPrice}</strong>
                    </div>
                  </div>

                  <p className="kitchen-sheet-desc">{selectedBudget.desc} ({familyMembers} afraad ke mutabiq)</p>

                  {/* Items in Budget */}
                  <div className="kitchen-sheet-ingredients">
                    <span className="ingredients-box-label">Is Budget Me Yeh Milega:</span>
                    <div className="ingredients-box-list">
                      {selectedBudget.items.map((it, i) => (
                        <div key={i} className="ingredient-item-row">
                          <span className="ing-item-name">📦 {it.name}</span>
                          <span className="ing-item-weight">{it.weight}</span>
                          <span className="ing-item-price">Rs. {it.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── 30-DAY MONTHLY PLAN VIEW ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                        🗓️ 30 Din Ka Smart Kitchen Schedule (Hafta {activePlanWeek})
                      </span>
                      <p style={{ fontSize: '0.72rem', color: '#b45309', margin: '2px 0 0 0' }}>
                        Rozana taza desi sabzi recipe schedule for {familyMembers} afraad
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', backgroundColor: '#ffffff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #86efac' }}>
                      Avg: Rs. {customDailyBudget}/day
                    </span>
                  </div>

                  {MONTHLY_30_DAYS[activePlanWeek]?.map((dayPlan) => (
                    <div
                      key={dayPlan.day}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#059669', color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: '9999px' }}>
                            Day {dayPlan.day}
                          </span>
                          <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{dayPlan.dishName}</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                          Rs. {dayPlan.estimatedDailyCost}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                        <span>🥬 {dayPlan.sabziSummary}</span>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 600 }}>
                          {dayPlan.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. STICKY ACTION FOOTER (ALWAYS VISIBLE AT BOTTOM) */}
            <div className="kitchen-sticky-footer">
              {activeTab === 'recipes' ? (
                <button
                  type="button"
                  className="kitchen-footer-action-btn"
                  onClick={() => handleAddItems(selectedRecipe.ingredients)}
                >
                  <ShoppingBag size={18} />
                  <span>
                    Add All Ingredients to Cart (Rs.{' '}
                    {selectedRecipe.ingredients.reduce((a, b) => a + b.price, 0)})
                  </span>
                </button>
              ) : activeTab === 'budget' ? (
                <button
                  type="button"
                  className="kitchen-footer-action-btn"
                  onClick={() => handleAddItems(selectedBudget.items)}
                >
                  <ShoppingBag size={18} />
                  <span>
                    Add this Budget Basket to Cart (Rs. {selectedBudget.totalPrice})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="kitchen-footer-action-btn"
                  onClick={() => {
                    const weekItems = [
                      { name: 'Aloo (Farm Fresh Potatoes)', weight: `${familyMembers >= 6 ? '3kg' : '2kg'}`, price: familyMembers >= 6 ? 285 : 190 },
                      { name: 'Tamatar (Red Tomatoes)', weight: '1kg', price: 145 },
                      { name: 'Pyaz (Red Onions)', weight: '1kg', price: 130 },
                      { name: 'Palak (Farm Fresh Spinach)', weight: '1kg', price: 85 },
                      { name: 'Dhaniya & Hari Mirch Gaddi', weight: 'Bundle', price: 20 },
                    ];
                    handleAddItems(weekItems);
                  }}
                >
                  <ShoppingBag size={18} />
                  <span>
                    Add Hafta {activePlanWeek} Fresh Basket to Cart (Rs. {familyMembers >= 6 ? '670' : '570'})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
