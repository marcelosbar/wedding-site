/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

vi.mock('../src/js/utils.js', () => {
  globalThis.__mockShowToast = globalThis.__mockShowToast || vi.fn();
  globalThis.__mockShowConfirm = globalThis.__mockShowConfirm || vi.fn().mockResolvedValue(true);
  return {
    escapeHTML: (str) => str,
    showToast: globalThis.__mockShowToast,
    showConfirm: globalThis.__mockShowConfirm
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
    <div id="cart-view">
      <h3 id="cart-title" tabindex="-1">Sua Contribuição</h3>
    </div>
    <div id="pix-view">
      <h3 id="pix-title" tabindex="-1">Pagamento via PIX</h3>
    </div>
    <div id="success-view">
      <h3 id="success-title" tabindex="-1">Muito Obrigado!</h3>
    </div>
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
    <span id="guest-name-error" class="field-error u-hidden">Error</span>
    <textarea id="guest-message"></textarea>
    <input type="checkbox" id="message-public" checked />
    <div id="message-char-count">0 / 500</div>
    <input id="pix-payload" value="" />
    <button id="copy-pix-payload-btn">Copiar</button>
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
  const mockShowToast = globalThis.__mockShowToast;
  const mockShowConfirm = globalThis.__mockShowConfirm;

  beforeEach(() => {
    setupDOM();
    const instances = createInstances();
    pix = instances.pix;
    cart = instances.cart;
    mockShowToast.mockClear();
    mockShowConfirm.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should alert if guest name is empty', async () => {
    const nameError = document.getElementById('guest-name-error');
    expect(nameError.classList.contains('u-hidden')).toBe(true);

    document.getElementById('guest-name').value = '';
    await pix.proceedToPix();

    expect(nameError.classList.contains('u-hidden')).toBe(false);
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
    document.getElementById('guest-name').value = 'João';
    cart.addToCart('Groom', 'Gift', 100);
    await pix.proceedToPix();
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao gerar QR Code');
  });

  it('should copy PIX payload to clipboard', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    const btn = document.getElementById('copy-pix-payload-btn');
    btn.textContent = 'Copiar';
    document.getElementById('pix-payload').value = 'test-payload';

    await pix.copyPixPayload();

    expect(writeTextMock).toHaveBeenCalledWith('test-payload');
    expect(btn.textContent).toBe('Copiado! ✓');
    expect(btn.classList.contains('btn-success')).toBe(true);

    // Revert after 2 seconds
    vi.advanceTimersByTime(2000);

    expect(btn.textContent).toBe('Copiar');
    expect(btn.classList.contains('btn-success')).toBe(false);
    vi.useRealTimers();
  });

  it('should handle clipboard copy error gracefully', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard blocked'));
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.getElementById('pix-payload').value = 'test-payload';
    await pix.copyPixPayload();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should reset cart, show success view, and clear form fields including message fields on confirmTransfer', async () => {
    document.getElementById('guest-name').value = 'Maria';
    document.getElementById('guest-message').value = 'Felicidades!';
    document.getElementById('message-public').checked = false;
    cart.addToCart('Bride', 'Gift', 200);

    await pix.confirmTransfer();

    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
    expect(document.getElementById('success-view').classList.contains('active')).toBe(true);
    expect(document.getElementById('cart-view').style.display).toBe('none');
    expect(document.getElementById('guest-name').value).toBe('');
    expect(document.getElementById('guest-message').value).toBe('');
    expect(document.getElementById('message-public').checked).toBe(true);
    expect(document.getElementById('message-char-count').textContent).toBe('0 / 500');
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

  it('should create separate transactions for Groom and Bride on confirmTransfer including message', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();

    document.getElementById('guest-name').value = 'Mixed Contributor';
    document.getElementById('guest-message').value = 'Parabéns!';
    document.getElementById('message-public').checked = true;

    cart.addToCart('Groom', 'Groom Gift 1', 100);
    cart.addToCart('Groom', 'Groom Gift 2', 150);
    cart.addToCart('Bride', 'Bride Gift 1', 200);

    await pix.confirmTransfer();

    expect(addDoc).toHaveBeenCalledTimes(2);

    const call1Args = addDoc.mock.calls[0][1];
    expect(call1Args.listChosen).toBe('Groom');
    expect(call1Args.totalAmount).toBe(250);
    expect(call1Args.guestName).toBe('Mixed Contributor');
    expect(call1Args.message).toBe('Parabéns!');
    expect(call1Args.isPublic).toBe(true);

    const call2Args = addDoc.mock.calls[1][1];
    expect(call2Args.listChosen).toBe('Bride');
    expect(call2Args.totalAmount).toBe(200);
    expect(call2Args.guestName).toBe('Mixed Contributor');
    expect(call2Args.message).toBe('Parabéns!');
    expect(call2Args.isPublic).toBe(true);
  });

  it('should NOT proceed on confirmTransfer if user cancels the confirmation dialog', async () => {
    mockShowConfirm.mockResolvedValueOnce(false);
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();

    document.getElementById('guest-name').value = 'Cancel User';
    cart.addToCart('Groom', 'Gift', 100);

    await pix.confirmTransfer();

    expect(mockShowConfirm).toHaveBeenCalledWith('Você está finalizando a sua contribuição. Tem certeza de que já realizou a transferência?');
    expect(addDoc).not.toHaveBeenCalled();
    expect(document.getElementById('success-view').classList.contains('active')).toBe(false);
    expect(cart.items.length).toBe(1); // Cart is not reset
  });
});
