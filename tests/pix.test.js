/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixCheckout, generatePixPayload } from '../src/js/pix.js';
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
  globalThis.__mockShowAlert = globalThis.__mockShowAlert || vi.fn().mockResolvedValue();
  return {
    escapeHTML: (str) => str,
    showToast: globalThis.__mockShowToast,
    showConfirm: globalThis.__mockShowConfirm,
    showAlert: globalThis.__mockShowAlert
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
    <div id="mbway-view">
      <h3 id="mbway-title" tabindex="-1">Pagamento via MB WAY</h3>
      <span id="mbway-original-total"></span>
      <span id="mbway-summary-rate"></span>
      <span id="mbway-eur-total"></span>
      <span id="mbway-points-total"></span>
      <div id="mbway-mixed-breakdown" class="u-hidden">
        <span id="mbway-groom-points"></span>
        <span id="mbway-bride-points"></span>
      </div>
      <button id="confirm-mbway-transfer-btn"></button>
      <button id="back-to-cart-from-mbway-btn"></button>
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
    <button id="confirm-transfer-btn">Já fiz a transferência!</button>
  `;
}

function createInstances() {
  const cartElements = {
    overlay: document.getElementById('cart-overlay'),
    cartView: document.getElementById('cart-view'),
    pixView: document.getElementById('pix-view'),
    mbwayView: document.getElementById('mbway-view'),
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
  const mockShowAlert = globalThis.__mockShowAlert;

  beforeEach(() => {
    localStorage.clear();
    setupDOM();
    const instances = createInstances();
    pix = instances.pix;
    cart = instances.cart;
    mockShowToast.mockClear();
    mockShowConfirm.mockReset().mockResolvedValue(true);
    mockShowAlert.mockReset().mockResolvedValue();
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

  it('should generate a valid PIX BR Code payload with dynamic amount and CRC16', () => {
    const pixKey = 'f51fb084-d1a3-41fc-b1ed-eb79b269aba2';
    const amount = 150.00;
    const payload = generatePixPayload(pixKey, amount);

    // Verify format and specific parts of the EMV payload
    expect(payload.startsWith('000201')).toBe(true);
    expect(payload.includes('26580014br.gov.bcb.pix0136f51fb084-d1a3-41fc-b1ed-eb79b269aba2')).toBe(true);
    expect(payload.includes('52040000')).toBe(true);
    expect(payload.includes('5303986')).toBe(true);
    expect(payload.includes('5406150.00')).toBe(true); // 6 characters: 150.00
    expect(payload.includes('5802BR')).toBe(true);
    expect(payload.includes('5916LORENA E MARCELO')).toBe(true);
    expect(payload.includes('6009SAO PAULO')).toBe(true);
    expect(payload.includes('62070503***')).toBe(true);
    expect(payload.includes('6304')).toBe(true);
    
    // Ensure the payload ends with a 4-character hex CRC checksum (uppercase)
    const crcPart = payload.slice(-4);
    expect(/^[0-9A-F]{4}$/.test(crcPart)).toBe(true);
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

    const btn = document.getElementById('confirm-transfer-btn');
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('is-loading')).toBe(false);

    await pix.confirmTransfer();

    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
    expect(document.getElementById('success-view').classList.contains('active')).toBe(true);
    expect(document.getElementById('cart-view').style.display).toBe('none');
    expect(document.getElementById('guest-name').value).toBe('');
    expect(document.getElementById('guest-message').value).toBe('');
    expect(document.getElementById('message-public').checked).toBe(true);
    expect(document.getElementById('message-char-count').textContent).toBe('0 / 500');

    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('is-loading')).toBe(false);
    expect(btn.textContent).toBe('Já fiz a transferência!');
  });

  it('should show alert and abort transition when Firebase write fails', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockRejectedValueOnce(new Error('Firebase offline'));
    document.getElementById('guest-name').value = 'Carlos';
    cart.addToCart('Groom', 'Gift', 300);
    
    await pix.confirmTransfer();
    
    expect(mockShowAlert).toHaveBeenCalledWith('Houve um problema de conexão ao salvar a sua contribuição. Por favor, tente confirmar novamente. Se o problema persistir, avise os noivos!');
    expect(document.getElementById('success-view').classList.contains('active')).toBe(false);
    expect(cart.items.length).toBe(1); // Cart remains intact
  });

  it('should prevent double submission on confirmTransfer and show loading state', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();
    
    let resolveAddDoc;
    const addDocPromise = new Promise((resolve) => {
      resolveAddDoc = resolve;
    });
    addDoc.mockReturnValueOnce(addDocPromise);

    document.getElementById('guest-name').value = 'Double Clicker';
    cart.addToCart('Bride', 'Gift', 200);

    const btn = document.getElementById('confirm-transfer-btn');

    const p1 = pix.confirmTransfer();
    
    // Allow the microtask queue to run so the code after await showConfirm executes
    await Promise.resolve();
    
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('is-loading')).toBe(true);
    expect(btn.textContent).toBe('Processando...');

    const p2 = pix.confirmTransfer();

    resolveAddDoc();
    await Promise.all([p1, p2]);

    expect(addDoc).toHaveBeenCalledTimes(1);
    
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('is-loading')).toBe(false);
    expect(btn.textContent).toBe('Já fiz a transferência!');
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
    expect(call1Args.items).toEqual([
      { name: 'Groom Gift 1', price: 100, quantity: 1 },
      { name: 'Groom Gift 2', price: 150, quantity: 1 }
    ]);
    expect(call1Args.groupId).toBeDefined();
    expect(call1Args.groupId).toMatch(/^group_/);

    const call2Args = addDoc.mock.calls[1][1];
    expect(call2Args.listChosen).toBe('Bride');
    expect(call2Args.totalAmount).toBe(200);
    expect(call2Args.guestName).toBe('Mixed Contributor');
    expect(call2Args.message).toBe('Parabéns!');
    expect(call2Args.isPublic).toBe(true);
    expect(call2Args.items).toEqual([
      { name: 'Bride Gift 1', price: 200, quantity: 1 }
    ]);
    expect(call2Args.groupId).toBe(call1Args.groupId);
  });

  it('should return early on confirmTransfer if cart total is 0', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();
    cart.reset();
    await pix.confirmTransfer();
    expect(addDoc).not.toHaveBeenCalled();
  });

  it('should handle missing DOM elements on confirmTransfer gracefully', async () => {
    const nameEl = document.getElementById('guest-name');
    const msgEl = document.getElementById('guest-message');
    const pubEl = document.getElementById('message-public');
    if (nameEl) nameEl.remove();
    if (msgEl) msgEl.remove();
    if (pubEl) pubEl.remove();

    cart.addToCart('Groom', 'Gift', 100);

    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();

    await pix.confirmTransfer();

    expect(addDoc).toHaveBeenCalled();
    const callArgs = addDoc.mock.calls[0][1];
    expect(callArgs.guestName).toBe('');
    expect(callArgs.message).toBe('');
    expect(callArgs.isPublic).toBe(true);
  });

  it('should proceed to PIX even if pix-title element is missing', async () => {
    const titleEl = document.getElementById('pix-title');
    if (titleEl) titleEl.remove();
    document.getElementById('guest-name').value = 'João';
    cart.addToCart('Groom', 'Gift', 100);
    await pix.proceedToPix();
    expect(document.getElementById('pix-view').classList.contains('active')).toBe(true);
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

  it('should trigger alert and abort transition on checkout database timeout', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockReturnValueOnce(new Promise(() => {}));
    
    vi.useFakeTimers();
    
    document.getElementById('guest-name').value = 'Hanging User';
    cart.addToCart('Groom', 'Gift', 100);
    
    const p = pix.confirmTransfer();
    
    await vi.advanceTimersByTimeAsync(4000);
    
    await p;
    
    expect(mockShowAlert).toHaveBeenCalledWith('Houve um problema de conexão ao salvar a sua contribuição. Por favor, tente confirmar novamente. Se o problema persistir, avise os noivos!');
    expect(document.getElementById('success-view').classList.contains('active')).toBe(false);
    expect(cart.items.length).toBe(1); // Cart remains intact
    
    vi.useRealTimers();
  });

  it('should alert if guest name is empty in proceedToMbWay', async () => {
    const nameError = document.getElementById('guest-name-error');
    expect(nameError.classList.contains('u-hidden')).toBe(true);

    document.getElementById('guest-name').value = '';
    pix.proceedToMbWay();

    expect(nameError.classList.contains('u-hidden')).toBe(false);
  });

  it('should switch to MB Way view and render default values', () => {
    document.getElementById('guest-name').value = 'Maria';
    cart.addToCart('Groom', 'Gift A', 100); // R$ 100
    pix.proceedToMbWay();

    expect(document.getElementById('mbway-view').classList.contains('active')).toBe(true);
    expect(document.getElementById('mbway-original-total').textContent).toBe('R$ 100,00');
    expect(document.getElementById('mbway-eur-total').textContent).toBe('€ 17,00'); // round(100 / 6) = 17
    expect(document.getElementById('mbway-points-total').textContent).toBe('102 pts'); // 17 * 6 = 102
  });


  it('should render mixed items points breakdown in MB Way view', () => {
    document.getElementById('guest-name').value = 'Ana';
    cart.addToCart('Groom', 'Gift Groom', 150); // R$ 150
    cart.addToCart('Bride', 'Gift Bride', 100); // R$ 100
    pix.proceedToMbWay();

    expect(document.getElementById('mbway-mixed-breakdown').classList.contains('u-hidden')).toBe(false);
    expect(document.getElementById('mbway-groom-points').textContent).toBe('150');
    expect(document.getElementById('mbway-bride-points').textContent).toBe('102');
  });

  it('should confirm MB Way transfer successfully and save correct fields', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();

    document.getElementById('guest-name').value = 'Manuel';
    document.getElementById('guest-message').value = 'Felicidades!';
    cart.addToCart('Groom', 'Gift', 150); // R$ 150 -> € 25 at rate 6.00 -> R$ 150

    await pix.confirmMbWayTransfer();

    expect(mockShowConfirm).toHaveBeenCalledWith('Você está finalizando a sua contribuição. Tem certeza de que já realizou a transferência via MB WAY?');
    expect(addDoc).toHaveBeenCalled();
    const callArgs = addDoc.mock.calls[0][1];
    expect(callArgs.guestName).toBe('Manuel');
    expect(callArgs.message).toBe('Felicidades!');
    expect(callArgs.paymentMethod).toBe('mbway');
    expect(callArgs.eurAmount).toBe(25);
    expect(callArgs.exchangeRate).toBe(6.00);
    expect(callArgs.totalAmount).toBe(150); // 25 * 6.00 = 150

    expect(document.getElementById('success-view').classList.contains('active')).toBe(true);
    expect(cart.items.length).toBe(0); // reset
  });

  it('should handle mixed items with correct proportional BRL/EUR splitting on confirmMbWayTransfer', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();

    document.getElementById('guest-name').value = 'Ana';
    cart.addToCart('Groom', 'Gift Groom', 150); // R$ 150
    cart.addToCart('Bride', 'Gift Bride', 100); // R$ 100
    // Total raw BRL: 250 -> € 42 at rate 6.00.
    // Proportional split: Groom gets round(42 * 150/250) = round(25.2) = 25 EUR.
    // Bride gets 42 - 25 = 17 EUR.
    // Groom adjusted BRL: 25 * 6 = 150 BRL.
    // Bride adjusted BRL: 17 * 6 = 102 BRL.

    await pix.confirmMbWayTransfer();

    expect(addDoc).toHaveBeenCalledTimes(2);

    const call1 = addDoc.mock.calls.find(call => call[1].listChosen === 'Groom')[1];
    const call2 = addDoc.mock.calls.find(call => call[1].listChosen === 'Bride')[1];

    expect(call1.eurAmount).toBe(25);
    expect(call1.totalAmount).toBe(150);
    expect(call1.paymentMethod).toBe('mbway');
    expect(call1.groupId).toBeDefined();
    expect(call1.groupId).toMatch(/^group_/);

    expect(call2.eurAmount).toBe(17);
    expect(call2.totalAmount).toBe(102);
    expect(call2.paymentMethod).toBe('mbway');
    expect(call2.groupId).toBe(call1.groupId);
  });

  it('should NOT proceed on confirmMbWayTransfer if user cancels', async () => {
    mockShowConfirm.mockResolvedValueOnce(false);
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockClear();

    document.getElementById('guest-name').value = 'Cancel MB Way';
    cart.addToCart('Groom', 'Gift', 150);

    await pix.confirmMbWayTransfer();

    expect(addDoc).not.toHaveBeenCalled();
    expect(document.getElementById('success-view').classList.contains('active')).toBe(false);
  });

  it('should alert on confirmMbWayTransfer timeout', async () => {
    const { addDoc } = await import('../src/js/firebase.js');
    addDoc.mockReturnValueOnce(new Promise(() => {}));

    vi.useFakeTimers();

    document.getElementById('guest-name').value = 'Timeout MB Way';
    cart.addToCart('Groom', 'Gift', 150);

    const p = pix.confirmMbWayTransfer();
    await vi.advanceTimersByTimeAsync(4000);
    await p;

    expect(mockShowAlert).toHaveBeenCalledWith('Houve um problema de conexão ao salvar a sua contribuição. Por favor, tente confirmar novamente. Se o problema persistir, avise os noivos!');
    expect(document.getElementById('success-view').classList.contains('active')).toBe(false);

    vi.useRealTimers();
  });
});
