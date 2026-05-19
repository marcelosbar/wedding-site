import { Cart } from './cart.js';
import { PixCheckout } from './pix.js';
import { Scoreboard } from './scoreboard.js';

/**
 * WeddingApp — Orchestrator that composes Cart, PixCheckout, and Scoreboard modules.
 */
export class WeddingApp {
  constructor() {
    // Shared UI element references
    const elements = {
      overlay: document.getElementById('cart-overlay'),
      cartView: document.getElementById('cart-view'),
      pixView: document.getElementById('pix-view'),
      successView: document.getElementById('success-view'),
      cartItemsContainer: document.getElementById('cart-items-container'),
      cartTotalValue: document.getElementById('cart-total-value'),
      groomPointsEl: document.getElementById('groom-points'),
      groomProgressEl: document.getElementById('groom-progress'),
      bridePointsEl: document.getElementById('bride-points'),
      brideProgressEl: document.getElementById('bride-progress'),
    };

    // Initialize modules
    this.cart = new Cart(elements);
    this.scoreboard = new Scoreboard(elements);
    this.pix = new PixCheckout(this.cart, this.scoreboard, elements);

    this.scoreboard.initRealtimeScoreboard();
  }

  // --- Delegate Cart methods ---
  addToCart(listName, itemName, price) { this.cart.addToCart(listName, itemName, price); }
  removeFromCart(id) { this.cart.removeFromCart(id); }
  openCart() { this.cart.openCart(); }
  closeCart() { this.cart.closeCart(); }

  // --- Delegate PIX methods ---
  proceedToPix() { return this.pix.proceedToPix(); }
  copyPixPayload() { return this.pix.copyPixPayload(); }
  confirmTransfer() { return this.pix.confirmTransfer(); }

  // --- Delegate Scoreboard methods ---
  simulateLocalScoreboard(list, amount) { this.scoreboard.simulateLocalScoreboard(list, amount); }
  updateScoreboardUI(groomPts, bridePts) { this.scoreboard.updateScoreboardUI(groomPts, bridePts); }
}

// Initialize App and expose to window for HTML inline onClick access
try {
  if (globalThis.window !== undefined) {
    globalThis.window.app = new WeddingApp();
    console.log('WeddingApp initialized and attached to window.app successfully.');
  }
} catch (error) {
  console.error('Failed to initialize WeddingApp:', error);
}
