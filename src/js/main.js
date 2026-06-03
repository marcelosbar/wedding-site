import { Cart } from './cart.js';
import { PixCheckout } from './pix.js';
import { Scoreboard } from './scoreboard.js';
import { MessagesCarousel } from './messages.js';


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
      backToListBtn: document.getElementById('cart-back-to-list-btn'),
      trackEl: document.getElementById('messages-carousel-track'),
      prevBtn: document.getElementById('carousel-prev'),
      nextBtn: document.getElementById('carousel-next'),
      dotsEl: document.getElementById('carousel-dots'),
    };

    // Initialize modules
    this.cart = new Cart(elements);
    this.scoreboard = new Scoreboard(elements);
    this.pix = new PixCheckout(this.cart, this.scoreboard, elements);
    this.messagesCarousel = new MessagesCarousel(elements);

    this.scoreboard.initRealtimeScoreboard();
    this.messagesCarousel.init();
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
        const currentBtn = e.currentTarget;
        const list = currentBtn.dataset.list;
        const item = currentBtn.dataset.item;
        const price = Number.parseFloat(currentBtn.dataset.price);
        this.addToCart(list, item, price);
      });
    });

    // 3.5. Add custom contribution to cart
    document.querySelectorAll('.add-custom-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const currentBtn = e.currentTarget;
        const list = currentBtn.dataset.list;
        const parent = currentBtn.closest('.gift-item');
        const input = parent ? parent.querySelector('.gift-custom-price-input') : null;
        if (!input) return;

        const priceVal = Number.parseFloat(input.value);
        const errorEl = parent ? parent.querySelector('.gift-custom-error') : null;

        if (Number.isNaN(priceVal) || priceVal <= 0) {
          if (errorEl) {
            errorEl.classList.remove('u-hidden');
          }
          return;
        }

        if (errorEl) {
          errorEl.classList.add('u-hidden');
        }

        // Add to cart with price in the name to keep it distinct
        const formattedPrice = priceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const itemName = `Contribuição Livre (R$ ${formattedPrice})`;
        
        this.addToCart(list, itemName, priceVal);
        
        // Reset input
        input.value = '';
      });
    });

    // Clear custom contribution error on input
    document.querySelectorAll('.gift-custom-price-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const parent = e.target.closest('.gift-item');
        const errorEl = parent ? parent.querySelector('.gift-custom-error') : null;
        if (errorEl) {
          errorEl.classList.add('u-hidden');
        }
      });
    });

    // Clear guest name error on input
    const guestNameInput = document.getElementById('guest-name');
    if (guestNameInput) {
      guestNameInput.addEventListener('input', () => {
        const nameError = document.getElementById('guest-name-error');
        if (nameError) {
          nameError.classList.add('u-hidden');
        }
      });
    }

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

    // 6. Gifts modal — open
    document.querySelectorAll('.gifts-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        const overlay = document.getElementById(modalId);
        if (overlay) {
          overlay.classList.add('active');
          overlay.setAttribute('aria-hidden', 'false');
        }
      });
    });

    // 7. Gifts modal — close (X button and backdrop click)
    document.querySelectorAll('.gifts-modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
        }
      });
      const closeBtn = overlay.querySelector('.gifts-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
        });
      }
    });

    // 8. View cart button inside gifts modal
    document.querySelectorAll('.view-cart-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openCart());
    });
  }

  // --- Delegate Cart methods ---
  addToCart(listName, itemName, price) { this.cart.addToCart(listName, itemName, price); }
  removeFromCart(id) { this.cart.removeFromCart(id); }

  /** Close any open gifts modal overlay before opening the cart (fix #2: no double backdrops). */
  closeGiftsModals() {
    document.querySelectorAll('.gifts-modal-overlay.active').forEach(overlay => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    });
  }

  openCart() {
    const activeModal = document.querySelector('.gifts-modal-overlay.active');
    const previousModalId = activeModal ? activeModal.id : null;
    this.closeGiftsModals();
    this.cart.openCart(previousModalId);
  }

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
