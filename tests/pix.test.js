/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PixCheckout } from '../src/js/pix.js';
import { Cart } from '../src/js/cart.js';
import { Scoreboard } from '../src/js/scoreboard.js';

vi.mock('../src/js/firebase.js', () => {
  globalThis.__mockOnSnapshot = globalThis.__mockOnSnapshot || vi.fn();
  globalThis.__mockQuery = globalThis.__mockQuery || vi.fn();
  return {
    transactionsRef: {},
    addDoc: vi.fn(),
    onSnapshot: globalThis.__mockOnSnapshot,
    query: globalThis.__mockQuery
  };
});

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn()
  }
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
    <div id="global-groom-points">0 pts</div>
    <div id="global-bride-points">0 pts</div>
    <div id="global-groom-fill" style="width: 50%"></div>
    <div id="global-bride-fill" style="width: 50%"></div>
    <div id="global-progress-divider" style="left: 50%"></div>
    <input id="guest-name" value="" />
    <input id="pix-payload" value="" />
    <canvas id="pix-qr-code"></canvas>
  `;
}

function createInstances() {
  const cartElements = {
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
  };
  const scoreboardElements = {
    groomPointsBarEl: document.getElementById('global-groom-points'),
    bridePointsBarEl: document.getElementById('global-bride-points'),
    groomFillEl: document.getElementById('global-groom-fill'),
    brideFillEl: document.getElementById('global-bride-fill'),
    dividerEl: document.getElementById('global-progress-divider'),
  };
  const cart = new Cart(cartElements);
  const scoreboard = new Scoreboard(scoreboardElements);
  const pix = new PixCheckout(cart, scoreboard, cartElements);
  return { cart, scoreboard, pix };
}

describe('PixCheckout', () => {
  let pix, cart;

  beforeEach(() => {
    setupDOM();
    const instances = createInstances();
    pix = instances.pix;
    cart = instances.cart;
  });

  it('should alert if guest name is empty', async () => {
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    document.getElementById('guest-name').value = '';
    await pix.proceedToPix();
    expect(alertMock).toHaveBeenCalledWith('Por favor, preencha o seu nome para sabermos quem está nos presenteando!');
    alertMock.mockRestore();
  });

  it('should generate QR code and switch to PIX view', async () => {
    const QRCode = (await import('qrcode')).default;
    document.getElementById('guest-name').value = 'João';
    cart.addToCart('Groom', 'Gift', 100);
    await pix.proceedToPix();
    expect(QRCode.toCanvas).toHaveBeenCalled();
    expect(document.getElementById('pix-view').classList.contains('active')).toBe(true);
  });

  it('should handle QR code error gracefully', async () => {
    const QRCode = (await import('qrcode')).default;
    QRCode.toCanvas.mockRejectedValueOnce(new Error('QR Error'));
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    document.getElementById('guest-name').value = 'João';
    cart.addToCart('Groom', 'Gift', 100);
    await pix.proceedToPix();
    expect(alertMock).toHaveBeenCalledWith('Erro ao gerar QR Code');
    alertMock.mockRestore();
  });

  it('should copy PIX payload to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    document.getElementById('pix-payload').value = 'test-payload';
    await pix.copyPixPayload();
    expect(writeTextMock).toHaveBeenCalledWith('test-payload');
    expect(alertMock).toHaveBeenCalledWith('Código PIX copiado!');
    alertMock.mockRestore();
  });

  it('should reset cart and show success view on confirmTransfer', async () => {
    document.getElementById('guest-name').value = 'Maria';
    cart.addToCart('Bride', 'Gift', 200);
    await pix.confirmTransfer();
    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
    expect(document.getElementById('success-view').classList.contains('active')).toBe(true);
    expect(document.getElementById('cart-view').style.display).toBe('none');
  });

  it('should fall back to local simulation when Firebase fails', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockRejectedValueOnce(new Error('Firebase offline'));
    document.getElementById('guest-name').value = 'Carlos';
    cart.addToCart('Groom', 'Gift', 300);
    const simulateSpy = vi.spyOn(pix.scoreboard, 'simulateLocalScoreboard');
    await pix.confirmTransfer();
    expect(simulateSpy).toHaveBeenCalledWith('Groom', 300);
    simulateSpy.mockRestore();
  });

  it('should prevent double submission on confirmTransfer', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();
    document.getElementById('guest-name').value = 'Double Clicker';
    cart.addToCart('Bride', 'Gift', 200);

    const p1 = pix.confirmTransfer();
    const p2 = pix.confirmTransfer();
    await Promise.all([p1, p2]);

    expect(addDoc).toHaveBeenCalledTimes(1);
  });
});
