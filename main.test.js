/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeddingApp } from './main.js';

// Mock Firebase functions because main.js imports firebase.js
vi.mock('./firebase.js', () => ({
  transactionsRef: {},
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn()
}));

// Mock qrcode
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn()
  }
}));

// Helper: creates a minimal DOM for all tests
function setupDOM() {
  document.body.innerHTML = `
    <div id="cart-overlay"></div>
    <div id="cart-view"></div>
    <div id="pix-view"></div>
    <div id="success-view"></div>
    <div id="cart-items-container"></div>
    <div id="cart-total-value"></div>
    <div id="groom-points">0 pts</div>
    <div id="groom-progress"></div>
    <div id="bride-points">0 pts</div>
    <div id="bride-progress"></div>
    <input id="guest-name" value="" />
    <input id="pix-payload" value="" />
    <canvas id="pix-qr-code"></canvas>
  `;
}

describe('WeddingApp Cart & Scoring Logic', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should initialize with an empty cart', () => {
    expect(app.cart.length).toBe(0);
    expect(app.currentList).toBeNull();
  });

  it('should add an item to the cart and set the current list', () => {
    app.addToCart('Groom', 'Test Gift', 100);
    expect(app.cart.length).toBe(1);
    expect(app.currentList).toBe('Groom');
    expect(app.cart[0].name).toBe('Test Gift');
    expect(app.cart[0].price).toBe(100);
  });

  it('should prevent mixing items from Groom and Bride', () => {
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    
    app.addToCart('Groom', 'Test Gift 1', 100);
    app.addToCart('Bride', 'Test Gift 2', 200);

    expect(app.cart.length).toBe(1);
    expect(app.cart[0].name).toBe('Test Gift 1');
    expect(alertMock).toHaveBeenCalledWith('Você não pode misturar presentes do Noivo e da Noiva. Conclua a contribuição atual primeiro!');
    
    alertMock.mockRestore();
  });

  it('should remove an item from the cart', () => {
    app.addToCart('Groom', 'Test Gift 1', 100);
    const itemId = app.cart[0].id;
    app.removeFromCart(itemId);
    
    expect(app.cart.length).toBe(0);
    expect(app.currentList).toBeNull();
  });

  it('should update local scoreboard points correctly', () => {
    app.simulateLocalScoreboard('Groom', 150);
    expect(document.getElementById('groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('bride-points').innerText).toBe('0 pts');
    expect(document.getElementById('groom-progress').style.width).toBe('100%');
    expect(document.getElementById('bride-progress').style.width).toBe('0%');

    app.simulateLocalScoreboard('Bride', 50);
    expect(document.getElementById('groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('bride-points').innerText).toBe('50 pts');
    expect(document.getElementById('groom-progress').style.width).toBe('75%');
    expect(document.getElementById('bride-progress').style.width).toBe('25%');
  });
});

describe('WeddingApp renderCart', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should render cart items and calculate total', () => {
    app.addToCart('Groom', 'Gift A', 50);
    app.addToCart('Groom', 'Gift B', 75);

    app.renderCart();

    const container = document.getElementById('cart-items-container');
    expect(container.children.length).toBe(2);
    expect(document.getElementById('cart-total-value').innerText).toBe('R$ 125.00');
  });

  it('should render empty container when cart is empty', () => {
    app.renderCart();

    const container = document.getElementById('cart-items-container');
    expect(container.children.length).toBe(0);
    expect(document.getElementById('cart-total-value').innerText).toBe('R$ 0.00');
  });
});

describe('WeddingApp openCart & closeCart', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should add active class to overlay and cart view on openCart', () => {
    app.openCart();

    expect(app.overlay.classList.contains('active')).toBe(true);
    expect(app.cartView.classList.contains('active')).toBe(true);
    expect(app.pixView.classList.contains('active')).toBe(false);
    expect(app.successView.classList.contains('active')).toBe(false);
  });

  it('should remove active class from overlay on closeCart', () => {
    app.openCart();
    app.closeCart();

    expect(app.overlay.classList.contains('active')).toBe(false);
  });
});

describe('WeddingApp removeFromCart edge cases', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should keep remaining items and list when removing one of multiple items', () => {
    app.addToCart('Groom', 'Gift A', 50);
    app.addToCart('Groom', 'Gift B', 75);
    const firstId = app.cart[0].id;

    app.removeFromCart(firstId);

    expect(app.cart.length).toBe(1);
    expect(app.cart[0].name).toBe('Gift B');
    expect(app.currentList).toBe('Groom');
  });
});

describe('WeddingApp PIX Logic', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should alert if guest name is empty on proceedToPix', async () => {
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    document.getElementById('guest-name').value = '';

    await app.proceedToPix();

    expect(alertMock).toHaveBeenCalledWith('Por favor, preencha o seu nome para sabermos quem está nos presenteando!');
    alertMock.mockRestore();
  });

  it('should generate QR code and switch to PIX view when guest name is filled', async () => {
    const QRCode = (await import('qrcode')).default;
    document.getElementById('guest-name').value = 'João';
    app.addToCart('Groom', 'Gift', 100);

    await app.proceedToPix();

    expect(QRCode.toCanvas).toHaveBeenCalled();
    expect(app.pixView.classList.contains('active')).toBe(true);
    expect(document.getElementById('pix-payload').value).toContain('100.00');
  });

  it('should handle QR code generation error gracefully', async () => {
    const QRCode = (await import('qrcode')).default;
    QRCode.toCanvas.mockRejectedValueOnce(new Error('QR Error'));
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    document.getElementById('guest-name').value = 'João';
    app.addToCart('Groom', 'Gift', 100);

    await app.proceedToPix();

    expect(alertMock).toHaveBeenCalledWith('Erro ao gerar QR Code');
    alertMock.mockRestore();
  });

  it('should copy PIX payload to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    document.getElementById('pix-payload').value = 'test-payload';

    await app.copyPixPayload();

    expect(writeTextMock).toHaveBeenCalledWith('test-payload');
    expect(alertMock).toHaveBeenCalledWith('Código PIX copiado!');
    alertMock.mockRestore();
  });
});

describe('WeddingApp confirmTransfer', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should reset cart after confirming transfer and show success view', async () => {
    document.getElementById('guest-name').value = 'Maria';
    app.addToCart('Bride', 'Gift', 200);

    await app.confirmTransfer();

    expect(app.cart.length).toBe(0);
    expect(app.currentList).toBeNull();
    expect(document.getElementById('guest-name').value).toBe('');
    expect(app.successView.classList.contains('active')).toBe(true);
    expect(app.pixView.classList.contains('active')).toBe(false);
  });

  it('should fall back to local simulation when Firebase fails', async () => {
    const { addDoc } = await import('./firebase.js');
    addDoc.mockRejectedValueOnce(new Error('Firebase offline'));
    const simulateSpy = vi.spyOn(app, 'simulateLocalScoreboard');

    document.getElementById('guest-name').value = 'Carlos';
    app.addToCart('Groom', 'Gift', 300);

    await app.confirmTransfer();

    expect(simulateSpy).toHaveBeenCalledWith('Groom', 300);
    simulateSpy.mockRestore();
  });
});

describe('WeddingApp updateScoreboardUI', () => {
  let app;

  beforeEach(() => {
    setupDOM();
    app = new WeddingApp();
  });

  it('should display 0% for both when total is zero', () => {
    app.updateScoreboardUI(0, 0);

    expect(document.getElementById('groom-points').innerText).toBe('0 pts');
    expect(document.getElementById('bride-points').innerText).toBe('0 pts');
    expect(document.getElementById('groom-progress').style.width).toBe('0%');
    expect(document.getElementById('bride-progress').style.width).toBe('0%');
  });

  it('should display correct percentages for equal scores', () => {
    app.updateScoreboardUI(100, 100);

    expect(document.getElementById('groom-progress').style.width).toBe('50%');
    expect(document.getElementById('bride-progress').style.width).toBe('50%');
  });

  it('should display 100% for one side when the other is zero', () => {
    app.updateScoreboardUI(0, 500);

    expect(document.getElementById('groom-progress').style.width).toBe('0%');
    expect(document.getElementById('bride-progress').style.width).toBe('100%');
  });
});
