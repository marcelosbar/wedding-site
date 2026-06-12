import { Cart } from './cart.js';
import { PixCheckout } from './pix.js';
import { Scoreboard } from './scoreboard.js';
import { MessagesCarousel } from './messages.js';
import { Countdown } from './countdown.js';
import { transactionsRef, onSnapshot, query } from './firebase.js';
import { showAlert } from './utils.js';


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
      countdownContainer: document.getElementById('countdown-timer'),
      countdownGrid: document.querySelector('.countdown-grid'),
      countdownDays: document.getElementById('countdown-days'),
      countdownHours: document.getElementById('countdown-hours'),
      countdownMinutes: document.getElementById('countdown-minutes'),
      countdownSeconds: document.getElementById('countdown-seconds'),
      countdownExpiredMsg: document.getElementById('countdown-expired-msg'),
    };

    // Initialize modules
    this.cart = new Cart(elements);
    this.scoreboard = new Scoreboard(elements);
    this.pix = new PixCheckout(this.cart, this.scoreboard, elements);
    this.messagesCarousel = new MessagesCarousel(elements);
    this.countdown = new Countdown('2026-08-30T15:00:00-03:00', {
      container: elements.countdownContainer,
      grid: elements.countdownGrid,
      days: elements.countdownDays,
      hours: elements.countdownHours,
      minutes: elements.countdownMinutes,
      seconds: elements.countdownSeconds,
      expiredMessage: elements.countdownExpiredMsg
    });

    this.scoreboard.initRealtimeScoreboard();
    this.messagesCarousel.init();
    this.countdown.init();
    this.initRealtimeSync();
    this.initEvents();
  }

  initRealtimeSync() {
    try {
      const q = query(transactionsRef);
      onSnapshot(q, (snapshot) => {
        if (this.scoreboard && typeof this.scoreboard.updateFromSnapshot === 'function') {
          this.scoreboard.updateFromSnapshot(snapshot);
        }
        if (this.messagesCarousel && typeof this.messagesCarousel.updateFromSnapshot === 'function') {
          this.messagesCarousel.updateFromSnapshot(snapshot);
        }
      }, (error) => {
        console.warn('Erro ao sincronizar dados em tempo real:', error);
      });
    } catch (e) {
      console.warn('Firebase não configurado ou offline para sincronização.', e);
    }
  }

  initEvents() {
    // 1. Hamburger menu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navLinks = document.querySelector('.nav-links');
    if (hamburgerBtn && navLinks) {
      hamburgerBtn.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        hamburgerBtn.classList.toggle('active');
      });

      // Fechar menu ao selecionar uma opção
      navLinks.querySelectorAll('a, button').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
          hamburgerBtn.classList.remove('active');
        });
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

        const rawValue = input.value.trim();
        const priceVal = Number.parseFloat(rawValue);
        const errorEl = parent ? parent.querySelector('.gift-custom-error') : null;

        const validation = this.validateCustomPrice(input, rawValue, priceVal);

        if (!validation.isValid) {
          if (priceVal > 5000) {
            showAlert('😱 Wow! A gente realmente não esperava tanta generosidade! Por favor, entre em contato diretamente com os noivos para combinar esse presente especial.');
            return;
          }

          if (errorEl) {
            errorEl.textContent = validation.message || 'Por favor, insira um valor inteiro válido entre R$ 1 e R$ 5.000.';
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

    // Real-time custom contribution validation on input
    document.querySelectorAll('.gift-custom-price-input').forEach(input => {
      // Prevent typing decimals, signs, exponents
      input.addEventListener('keydown', (e) => {
        if (['.', ',', '-', '+', 'e', 'E'].includes(e.key)) {
          e.preventDefault();
          const parent = input.closest('.gift-item');
          const errorEl = parent ? parent.querySelector('.gift-custom-error') : null;
          if (errorEl) {
            errorEl.textContent = 'Por favor, insira apenas números inteiros (sem centavos ou vírgula).';
            errorEl.classList.remove('u-hidden');
          }
        }
      });

      input.addEventListener('input', (e) => {
        const currentInput = e.target;
        const parent = currentInput.closest('.gift-item');
        const errorEl = parent ? parent.querySelector('.gift-custom-error') : null;
        if (!errorEl) return;

        const rawValue = currentInput.value.trim();
        const priceVal = Number.parseFloat(rawValue);

        // Sanitize pasted or otherwise inputted decimals/signs
        if (/[.,\-+eE]/.test(rawValue)) {
          currentInput.value = rawValue.replace(/[.,\-+eE]/g, '');
          if (errorEl) {
            errorEl.textContent = 'Por favor, insira apenas números inteiros (sem centavos ou vírgula).';
            errorEl.classList.remove('u-hidden');
          }
          return;
        }

        const validation = this.validateCustomPrice(currentInput, rawValue, priceVal);

        if (validation.isEmpty) {
          errorEl.classList.add('u-hidden');
          errorEl.textContent = '';
        } else if (!validation.isValid) {
          // Immediately show error if they exceeded max (5000)
          if (priceVal > 5000) {
            errorEl.textContent = validation.message;
            errorEl.classList.remove('u-hidden');
          } else {
            errorEl.classList.add('u-hidden');
          }
        } else {
          errorEl.classList.add('u-hidden');
          errorEl.textContent = '';
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

  validateCustomPrice(input, rawValue, priceVal) {
    const min = Number.parseInt(input.getAttribute('min') || '1', 10);
    const max = Number.parseInt(input.getAttribute('max') || '5000', 10);

    if (rawValue === '') {
      return { isValid: false, message: '', isEmpty: true };
    }

    if (!/^\d+$/.test(rawValue)) {
      return { isValid: false, message: 'Por favor, insira apenas números inteiros (sem centavos ou vírgula).' };
    }

    if (priceVal < min) {
      return { isValid: false, message: `Por favor, insira um valor a partir de R$ ${min}.` };
    }

    if (priceVal > max) {
      return { isValid: false, message: 'Wow! A gente fica lisonjeado, mas você digitou o valor certo? 😂' };
    }

    return { isValid: true, message: '' };
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
