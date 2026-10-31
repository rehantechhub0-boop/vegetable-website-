import React, { useState } from 'react';
import { ChefHat, X, Sparkles, ShoppingBag, Utensils, Wallet, Check, Clock, Users } from 'lucide-react';
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

export const SabziAIWidget: React.FC<SmartKitchenWidgetProps> = ({ onAddToCart, vegetables = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recipes' | 'budget'>('recipes');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(READYMADE_RECIPES[0]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetPack>(BUDGET_PACKS[0]);
  const [addedToast, setAddedToast] = useState<string | null>(null);

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
            <div className="kitchen-tabs-nav">
              <button
                type="button"
                className={`kitchen-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
                onClick={() => setActiveTab('recipes')}
              >
                <Utensils size={16} />
                <span>🍲 Aaj Kya Banayein?</span>
              </button>
              <button
                type="button"
                className={`kitchen-tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
                onClick={() => setActiveTab('budget')}
              >
                <Wallet size={16} />
                <span>💰 Mera Budget</span>
              </button>
            </div>

            {/* 3. FIXED HORIZONTAL CHIPS SELECTOR BAR */}
            <div className="kitchen-chips-bar">
              {activeTab === 'recipes'
                ? READYMADE_RECIPES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`kitchen-chip-pill ${selectedRecipe.id === r.id ? 'active' : ''}`}
                      onClick={() => setSelectedRecipe(r)}
                    >
                      {r.title}
                    </button>
                  ))
                : BUDGET_PACKS.map((b) => (
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
              ) : (
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

                  <p className="kitchen-sheet-desc">{selectedBudget.desc}</p>

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
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
