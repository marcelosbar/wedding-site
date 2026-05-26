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
    <div id="groom-card">
      <button class="gifts-toggle-btn" data-target="groom-gifts-list" data-count="10">
        <span class="gifts-toggle-text">Ver Presentes (10)</span>
        <span class="gifts-toggle-icon">&#9660;</span>
      </button>
      <div class="gifts-list gifts-list-collapsible" id="groom-gifts-list"></div>
    </div>
    <div id="bride-card">
      <button class="gifts-toggle-btn" data-target="bride-gifts-list" data-count="6">
        <span class="gifts-toggle-text">Ver Presentes (6)</span>
        <span class="gifts-toggle-icon">&#9660;</span>
      </button>
      <div class="gifts-list gifts-list-collapsible" id="bride-gifts-list"></div>
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

  it('should open the gift list when toggle button is clicked', () => {
    const btn = document.querySelector('[data-target="groom-gifts-list"]');
    const list = document.getElementById('groom-gifts-list');
    const textEl = btn.querySelector('.gifts-toggle-text');

    expect(list.classList.contains('open')).toBe(false);
    btn.click();
    expect(list.classList.contains('open')).toBe(true);
    expect(btn.classList.contains('open')).toBe(true);
    expect(textEl.textContent).toBe('Ocultar Presentes');
  });

  it('should close the gift list when toggle button is clicked again', () => {
    const btn = document.querySelector('[data-target="groom-gifts-list"]');
    const list = document.getElementById('groom-gifts-list');
    const textEl = btn.querySelector('.gifts-toggle-text');

    btn.click(); // open
    btn.click(); // close
    expect(list.classList.contains('open')).toBe(false);
    expect(btn.classList.contains('open')).toBe(false);
    expect(textEl.textContent).toBe('Ver Presentes (10)');
  });

  it('should toggle bride gift list independently', () => {
    const btn = document.querySelector('[data-target="bride-gifts-list"]');
    const list = document.getElementById('bride-gifts-list');
    const textEl = btn.querySelector('.gifts-toggle-text');

    btn.click();
    expect(list.classList.contains('open')).toBe(true);
    expect(textEl.textContent).toBe('Ocultar Presentes');

    btn.click();
    expect(list.classList.contains('open')).toBe(false);
    expect(textEl.textContent).toBe('Ver Presentes (6)');
  });
});
