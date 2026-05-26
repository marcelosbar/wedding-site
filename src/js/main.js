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
      floatingCartBtn: document.getElementById('floating-cart-btn'),
      floatingCartBadge: document.getElementById('floating-cart-badge'),
      navCartLink: document.getElementById('nav-cart-link'),
      navCartBadge: document.getElementById('nav-cart-badge'),
      groomPointsBarEl: document.getElementById('global-groom-points'),
      bridePointsBarEl: document.getElementById('global-bride-points'),
      groomFillEl: document.getElementById('global-groom-fill'),
      brideFillEl: document.getElementById('global-bride-fill'),
      dividerEl: document.getElementById('global-progress-divider'),
    };

    // Initialize modules
    this.cart = new Cart(elements);
    this.scoreboard = new Scoreboard(elements);
    this.pix = new PixCheckout(this.cart, this.scoreboard, elements);

    this.scoreboard.initRealtimeScoreboard();
    this.initEvents();
  }

  initEvents() {
    // 1. Hamburger menu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('open');
        hamburgerBtn.classList.toggle('active');
      });
    }

    // 2. Open cart button/links
    const navCartLink = document.getElementById('nav-cart-link');
    if (navCartLink) {
      navCartLink.addEventListener('click', () => this.openCart());
    }

    const floatingCartBtn = document.getElementById('floating-cart-btn');
    if (floatingCartBtn) {
      floatingCartBtn.addEventListener('click', () => this.openCart());
    }

    // 3. Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const list = e.currentTarget.dataset.list;
        const item = e.currentTarget.dataset.item;
        const price = Number.parseFloat(e.currentTarget.dataset.price);
        this.addToCart(list, item, price);
      });
    });

    // 4. Close cart buttons
    document.querySelectorAll('.close-cart-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeCart());
    });

    // 5. Checkout / PIX buttons
    const proceedToPixBtn = document.getElementById('proceed-to-pix-btn');
    if (proceedToPixBtn) {
      proceedToPixBtn.addEventListener('click', () => this.proceedToPix());
    }

    const copyPixPayloadBtn = document.getElementById('copy-pix-payload-btn');
    if (copyPixPayloadBtn) {
      copyPixPayloadBtn.addEventListener('click', () => this.copyPixPayload());
    }

    const confirmTransferBtn = document.getElementById('confirm-transfer-btn');
    if (confirmTransferBtn) {
      confirmTransferBtn.addEventListener('click', () => this.confirmTransfer());
    }

    const backToSiteBtn = document.getElementById('back-to-site-btn');
    if (backToSiteBtn) {
      backToSiteBtn.addEventListener('click', () => this.closeCart());
    }

    // 6. Gift list tabs
    document.querySelectorAll('.gifts-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const panelId = btn.getAttribute('aria-controls');
        document.querySelectorAll('.gifts-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.gifts-tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.classList.add('active');
        }
      });
    });
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

// Initialize App when DOM is loaded
try {
  if (globalThis.window !== undefined) {
    new WeddingApp();
    console.log('WeddingApp initialized successfully.');
  }
} catch (error) {
  console.error('Failed to initialize WeddingApp:', error);
}
