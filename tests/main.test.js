/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';

// 1. Declare prefixed Vitest mock variables outside the mock factory so we have shared call tracking
const mockCartAddToCart = vi.fn();
const mockCartRemoveFromCart = vi.fn();
const mockCartOpenCart = vi.fn();
const mockCartCloseCart = vi.fn();

vi.mock('../src/js/cart.js', () => ({
  Cart: vi.fn().mockImplementation(function() {
    return {
      addToCart: mockCartAddToCart,
      removeFromCart: mockCartRemoveFromCart,
      openCart: mockCartOpenCart,
      closeCart: mockCartCloseCart
    };
  })
}));

const mockPixProceed = vi.fn();
const mockPixCopy = vi.fn();
const mockPixConfirm = vi.fn();

vi.mock('../src/js/pix.js', () => ({
  PixCheckout: vi.fn().mockImplementation(function() {
    return {
      proceedToPix: mockPixProceed,
      copyPixPayload: mockPixCopy,
      confirmTransfer: mockPixConfirm
    };
  })
}));

const mockScoreboardInit = vi.fn();
const mockScoreboardSimulate = vi.fn();
const mockScoreboardUpdate = vi.fn();

vi.mock('../src/js/scoreboard.js', () => ({
  Scoreboard: vi.fn().mockImplementation(function() {
    return {
      initRealtimeScoreboard: mockScoreboardInit,
      simulateLocalScoreboard: mockScoreboardSimulate,
      updateScoreboardUI: mockScoreboardUpdate
    };
  })
}));

function setupDOM() {
  document.body.innerHTML = `
    <div id="cart-overlay"></div>
    <div id="cart-view"></div>
    <div id="pix-view"></div>
    <div id="success-view"></div>
    <div id="cart-items-container"></div>
    <div id="cart-total-value"></div>
    <button id="floating-cart-btn"></button>
    <span id="floating-cart-badge"></span>
    <button id="nav-cart-link" style="display: none;"></button>
    <span id="nav-cart-badge"></span>
    <div id="global-groom-points"></div>
    <div id="global-bride-points"></div>
    <div id="global-groom-fill"></div>
    <div id="global-bride-fill"></div>
    <div id="global-progress-divider"></div>
    <button id="hamburger-btn"></button>
    <div class="nav-links"></div>
    <button class="add-to-cart-btn" data-list="Groom" data-item="Gift" data-price="100"></button>
    <button class="close-cart-btn"></button>
    <button id="proceed-to-pix-btn"></button>
    <button id="copy-pix-payload-btn"></button>
    <button id="confirm-transfer-btn"></button>
    <button id="back-to-site-btn"></button>
    <button class="gifts-modal-btn" data-modal="groom-gifts-modal">Ver Presentes</button>
    <button class="gifts-modal-btn" data-modal="bride-gifts-modal">Ver Presentes</button>
    <div id="groom-gifts-modal" class="gifts-modal-overlay" aria-hidden="true">
      <button class="gifts-modal-close">x</button>
    </div>
    <div id="bride-gifts-modal" class="gifts-modal-overlay" aria-hidden="true">
      <button class="gifts-modal-close">x</button>
    </div>
  `;
}

// Mock console errors/logs
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('WeddingApp Orchestrator', () => {
  let app;
  let WeddingApp;

  beforeAll(async () => {
    // Clear ESM cache to guarantee a fresh evaluation of main.js with our active mocks
    vi.resetModules();
    const mod = await import('../src/js/main.js');
    WeddingApp = mod.WeddingApp;
  });

  beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
    app = new WeddingApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize successfully and attach to window.app', () => {
    expect(app).toBeDefined();
    expect(app.cart).toBeDefined();
    expect(app.scoreboard).toBeDefined();
    expect(app.pix).toBeDefined();
    expect(mockScoreboardInit).toHaveBeenCalled();
  });

  it('should delegate Cart methods', () => {
    app.addToCart('Groom', 'Gift', 100);
    expect(mockCartAddToCart).toHaveBeenCalledWith('Groom', 'Gift', 100);

    app.removeFromCart('123');
    expect(mockCartRemoveFromCart).toHaveBeenCalledWith('123');

    app.openCart();
    expect(mockCartOpenCart).toHaveBeenCalled();

    app.closeCart();
    expect(mockCartCloseCart).toHaveBeenCalled();
  });

  it('should delegate Pix methods', () => {
    app.proceedToPix();
    expect(mockPixProceed).toHaveBeenCalled();

    app.copyPixPayload();
    expect(mockPixCopy).toHaveBeenCalled();

    app.confirmTransfer();
    expect(mockPixConfirm).toHaveBeenCalled();
  });

  it('should delegate Scoreboard methods', () => {
    app.simulateLocalScoreboard('Groom', 100);
    expect(mockScoreboardSimulate).toHaveBeenCalledWith('Groom', 100);

    app.updateScoreboardUI(150, 50);
    expect(mockScoreboardUpdate).toHaveBeenCalledWith(150, 50);
  });

  it('should handle all UI event listener clicks', () => {
    // 1. Hamburger menu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navLinks = document.querySelector('.nav-links');
    hamburgerBtn.click();
    expect(navLinks.classList.contains('open')).toBe(true);
    expect(hamburgerBtn.classList.contains('active')).toBe(true);

    // 2. Open cart button/links
    document.getElementById('nav-cart-link').click();
    expect(mockCartOpenCart).toHaveBeenCalled();
    mockCartOpenCart.mockClear();

    document.getElementById('floating-cart-btn').click();
    expect(mockCartOpenCart).toHaveBeenCalled();

    // 3. Add to cart buttons
    document.querySelector('.add-to-cart-btn').click();
    expect(mockCartAddToCart).toHaveBeenCalledWith('Groom', 'Gift', 100);

    // 4. Close cart buttons
    document.querySelector('.close-cart-btn').click();
    expect(mockCartCloseCart).toHaveBeenCalled();
    mockCartCloseCart.mockClear();

    // 5. Checkout / PIX buttons
    document.getElementById('proceed-to-pix-btn').click();
    expect(mockPixProceed).toHaveBeenCalled();

    document.getElementById('copy-pix-payload-btn').click();
    expect(mockPixCopy).toHaveBeenCalled();

    document.getElementById('confirm-transfer-btn').click();
    expect(mockPixConfirm).toHaveBeenCalled();

    document.getElementById('back-to-site-btn').click();
    expect(mockCartCloseCart).toHaveBeenCalled();
  });

  it('should open the gifts modal when the open button is clicked', () => {
    const btn = document.querySelector('[data-modal="groom-gifts-modal"]');
    const overlay = document.getElementById('groom-gifts-modal');

    expect(overlay.classList.contains('active')).toBe(false);
    btn.click();
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
  });

  it('should close the gifts modal when the X button is clicked', () => {
    const openBtn = document.querySelector('[data-modal="groom-gifts-modal"]');
    const overlay = document.getElementById('groom-gifts-modal');
    const closeBtn = overlay.querySelector('.gifts-modal-close');

    openBtn.click();
    expect(overlay.classList.contains('active')).toBe(true);
    closeBtn.click();
    expect(overlay.classList.contains('active')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });

  it('should close the gifts modal when clicking the backdrop', () => {
    const openBtn = document.querySelector('[data-modal="groom-gifts-modal"]');
    const overlay = document.getElementById('groom-gifts-modal');

    openBtn.click();
    expect(overlay.classList.contains('active')).toBe(true);
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // click on overlay itself (e.target === overlay)
    const event = new MouseEvent('click', { bubbles: false });
    Object.defineProperty(event, 'target', { value: overlay });
    overlay.dispatchEvent(event);
    expect(overlay.classList.contains('active')).toBe(false);
  });

  it('should open the bride gifts modal independently', () => {
    const btn = document.querySelector('[data-modal="bride-gifts-modal"]');
    const overlay = document.getElementById('bride-gifts-modal');

    btn.click();
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.getAttribute('aria-hidden')).toBe('false');
  });


  it('should close all active gifts modals when openCart is called', () => {
    // Open both modals
    document.getElementById('groom-gifts-modal').classList.add('active');
    document.getElementById('bride-gifts-modal').classList.add('active');

    app.openCart();

    expect(document.getElementById('groom-gifts-modal').classList.contains('active')).toBe(false);
    expect(document.getElementById('bride-gifts-modal').classList.contains('active')).toBe(false);
    expect(mockCartOpenCart).toHaveBeenCalled();
  });

  it('closeGiftsModals should set aria-hidden=true on closed overlays', () => {
    const overlay = document.getElementById('groom-gifts-modal');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');

    app.closeGiftsModals();

    expect(overlay.classList.contains('active')).toBe(false);
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
  });
});
