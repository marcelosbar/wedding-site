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
});
