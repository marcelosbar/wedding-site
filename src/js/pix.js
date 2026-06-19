import QRCode from 'qrcode';
import { transactionsRef, addDoc } from './firebase.js';
import { showToast, showConfirm, showAlert } from './utils.js';

/**
 * PIX Checkout module — handles QR code generation, payload copy, and transfer confirmation.
 */
export class PixCheckout {
  constructor(cart, scoreboard, elements) {
    this.cart = cart;
    this.scoreboard = scoreboard;
    this.cartView = elements.cartView;
    this.pixView = elements.pixView;
    this.mbwayView = elements.mbwayView || document.getElementById('mbway-view');
    this.successView = elements.successView;
    this.isProcessing = false;
    this.exchangeRate = 6.00;
  }

  async proceedToPix() {
    const guestName = document.getElementById('guest-name').value.trim();
    const nameError = document.getElementById('guest-name-error');
    if (!guestName) {
      if (nameError) {
        nameError.classList.remove('u-hidden');
      }
      return;
    }

    if (nameError) {
      nameError.classList.add('u-hidden');
    }

    const total = this.cart.getTotal();

    // Construct a valid BR Code (PIX Payload) based on the Pix Key
    const pixKey = 'f51fb084-d1a3-41fc-b1ed-eb79b269aba2';
    const payload = generatePixPayload(pixKey, total);

    document.getElementById('pix-payload').value = payload;

    try {
      const canvas = document.getElementById('pix-qr-code');
      await QRCode.toCanvas(canvas, payload, { width: 250, margin: 2 });

      this.cartView.style.display = 'none';
      this.pixView.classList.add('active');
      const pixTitle = document.getElementById('pix-title');
      if (pixTitle) {
        pixTitle.focus();
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar QR Code');
    }
  }

  async copyPixPayload() {
    const input = document.getElementById('pix-payload');
    const btn = document.getElementById('copy-pix-payload-btn');
    try {
      await navigator.clipboard.writeText(input.value);
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Copiado! ✓';
        btn.classList.add('btn-success');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('btn-success');
        }, 2000);
      }
    } catch (err) {
      console.error('Falha ao copiar o código PIX', err);
    }
  }

  proceedToMbWay() {
    const guestName = document.getElementById('guest-name').value.trim();
    const nameError = document.getElementById('guest-name-error');
    if (!guestName) {
      if (nameError) {
        nameError.classList.remove('u-hidden');
      }
      return;
    }

    if (nameError) {
      nameError.classList.add('u-hidden');
    }

    this.updateMbWayValues();

    if (this.cartView) this.cartView.style.display = 'none';
    if (this.mbwayView) {
      this.mbwayView.classList.add('active');
      const mbwayTitle = document.getElementById('mbway-title');
      if (mbwayTitle) {
        mbwayTitle.focus();
      }
    }
  }

  updateMbWayValues() {
    const rawTotal = this.cart.getTotal();
    const eurTotal = Math.max(1, Math.round(rawTotal / this.exchangeRate));
    const adjustedBrlTotal = Math.round(eurTotal * this.exchangeRate);

    const displayOriginal = document.getElementById('mbway-original-total');
    if (displayOriginal) {
      displayOriginal.textContent = `R$ ${rawTotal.toFixed(2).replace('.', ',')}`;
    }

    const displaySummaryRate = document.getElementById('mbway-summary-rate');
    if (displaySummaryRate) {
      displaySummaryRate.textContent = `R$ ${this.exchangeRate.toFixed(2).replace('.', ',')}`;
    }

    const displayEur = document.getElementById('mbway-eur-total');
    if (displayEur) {
      displayEur.textContent = `€ ${eurTotal.toFixed(2).replace('.', ',')}`;
    }

    const displayPoints = document.getElementById('mbway-points-total');
    if (displayPoints) {
      displayPoints.textContent = `${adjustedBrlTotal} pts`;
    }

    // Handle mixed items breakdown display
    const groomItems = this.cart.items.filter(item => item.list === 'Groom');
    const brideItems = this.cart.items.filter(item => item.list === 'Bride');
    const breakdownEl = document.getElementById('mbway-mixed-breakdown');

    if (groomItems.length > 0 && brideItems.length > 0) {
      if (breakdownEl) breakdownEl.classList.remove('u-hidden');
      
      const groomRawBrl = groomItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const brideRawBrl = brideItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const rawTotalVal = groomRawBrl + brideRawBrl;
      
      let groomEur = Math.round(eurTotal * (groomRawBrl / rawTotalVal));
      if (groomEur === 0 && eurTotal >= 2) {
        groomEur = 1;
      } else if (groomEur === eurTotal && eurTotal >= 2) {
        groomEur = eurTotal - 1;
      }
      const brideEur = eurTotal - groomEur;
      
      const groomPoints = Math.round(groomEur * this.exchangeRate);
      const bridePoints = Math.round(brideEur * this.exchangeRate);
      
      const groomPointsEl = document.getElementById('mbway-groom-points');
      const bridePointsEl = document.getElementById('mbway-bride-points');
      if (groomPointsEl) groomPointsEl.textContent = groomPoints;
      if (bridePointsEl) bridePointsEl.textContent = bridePoints;
    } else {
      if (breakdownEl) breakdownEl.classList.add('u-hidden');
    }
  }

  async confirmMbWayTransfer() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const confirmBtn = document.getElementById('confirm-mbway-transfer-btn');

    try {
      const confirmed = await showConfirm('Você está finalizando a sua contribuição. Tem certeza de que já realizou a transferência via MB WAY?');
      if (!confirmed) {
        return;
      }

      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('is-loading');
        confirmBtn.textContent = 'Processando...';
      }
      const guestName = document.getElementById('guest-name') ? document.getElementById('guest-name').value.trim() : '';
      const messageEl = document.getElementById('guest-message');
      const message = messageEl ? messageEl.value.trim() : '';
      const publicEl = document.getElementById('message-public');
      const isPublic = publicEl ? publicEl.checked : true;

      const rawTotal = this.cart.getTotal();
      if (rawTotal <= 0) return;

      const eurTotal = Math.max(1, Math.round(rawTotal / this.exchangeRate));

      const promises = this._createTransactionPromises(
        guestName,
        message,
        isPublic,
        'mbway',
        this.exchangeRate,
        eurTotal
      );

      try {
        await Promise.race([
          Promise.all(promises),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Timeout')), 4000))
        ]);
      } catch (e) {
        console.error('Firebase save error:', e);
        await showAlert('Houve um problema de conexão ao salvar a sua contribuição. Por favor, tente confirmar novamente. Se o problema persistir, avise os noivos!');
        return;
      }

      this._resetFormAndUI();
    } finally {
      this.isProcessing = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('is-loading');
        confirmBtn.textContent = 'Já fiz a transferência!';
      }
    }
  }

  _createTransactionPromises(guestName, message, isPublic, paymentMethod = 'pix', exchangeRate = null, eurAmount = null) {
    const groomItems = this.cart.items.filter(item => item.list === 'Groom');
    const brideItems = this.cart.items.filter(item => item.list === 'Bride');
    const promises = [];
    const groupId = (groomItems.length > 0 && brideItems.length > 0)
      ? 'group_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
      : null;

    let groomEur = null;
    let brideEur = null;
    let groomBrl = 0;
    let brideBrl = 0;

    if (groomItems.length > 0) {
      groomBrl = groomItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    if (brideItems.length > 0) {
      brideBrl = brideItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    if (paymentMethod === 'mbway' && eurAmount !== null && exchangeRate !== null) {
      if (groomItems.length > 0 && brideItems.length > 0) {
        const rawTotal = groomBrl + brideBrl;
        groomEur = Math.round(eurAmount * (groomBrl / rawTotal));
        if (groomEur === 0 && eurAmount >= 2) {
          groomEur = 1;
        } else if (groomEur === eurAmount && eurAmount >= 2) {
          groomEur = eurAmount - 1;
        }
        brideEur = eurAmount - groomEur;
      } else if (groomItems.length > 0) {
        groomEur = eurAmount;
      } else if (brideItems.length > 0) {
        brideEur = eurAmount;
      }
      
      groomBrl = groomEur !== null ? Math.round(groomEur * exchangeRate) : 0;
      brideBrl = brideEur !== null ? Math.round(brideEur * exchangeRate) : 0;
    }

    if (groomItems.length > 0) {
      const groomData = {
        guestName,
        totalAmount: groomBrl,
        listChosen: 'Groom',
        status: 'pending',
        timestamp: new Date().toISOString(),
        message,
        isPublic,
        items: groomItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        paymentMethod
      };
      if (paymentMethod === 'mbway') {
        groomData.eurAmount = groomEur;
        groomData.exchangeRate = exchangeRate;
      }
      if (groupId) {
        groomData.groupId = groupId;
      }
      promises.push(addDoc(transactionsRef, groomData));
    }

    if (brideItems.length > 0) {
      const brideData = {
        guestName,
        totalAmount: brideBrl,
        listChosen: 'Bride',
        status: 'pending',
        timestamp: new Date().toISOString(),
        message,
        isPublic,
        items: brideItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        paymentMethod
      };
      if (paymentMethod === 'mbway') {
        brideData.eurAmount = brideEur;
        brideData.exchangeRate = exchangeRate;
      }
      if (groupId) {
        brideData.groupId = groupId;
      }
      promises.push(addDoc(transactionsRef, brideData));
    }

    return promises;
  }

  _resetFormAndUI() {
    this.pixView.classList.remove('active');
    if (this.mbwayView) this.mbwayView.classList.remove('active');
    this.cartView.style.display = 'none';
    this.successView.classList.add('active');
    const successTitle = document.getElementById('success-title');
    if (successTitle) {
      successTitle.focus();
    }

    // Reset cart and form
    this.cart.reset();
    if (document.getElementById('guest-name')) document.getElementById('guest-name').value = '';
    if (document.getElementById('guest-message')) document.getElementById('guest-message').value = '';
    if (document.getElementById('message-public')) document.getElementById('message-public').checked = true;
    if (document.getElementById('message-char-count')) document.getElementById('message-char-count').textContent = '0 / 500';
  }

  async confirmTransfer() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const confirmBtn = document.getElementById('confirm-transfer-btn');

    try {
      const confirmed = await showConfirm('Você está finalizando a sua contribuição. Tem certeza de que já realizou a transferência?');
      if (!confirmed) {
        return;
      }

      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('is-loading');
        confirmBtn.textContent = 'Processando...';
      }
      const guestName = document.getElementById('guest-name') ? document.getElementById('guest-name').value.trim() : '';
      const messageEl = document.getElementById('guest-message');
      const message = messageEl ? messageEl.value.trim() : '';
      const publicEl = document.getElementById('message-public');
      const isPublic = publicEl ? publicEl.checked : true;

      const total = this.cart.getTotal();

      if (total <= 0) return;

      const promises = this._createTransactionPromises(guestName, message, isPublic, 'pix');

      try {
        // Wait for database write or timeout after 4 seconds (forces error if offline/unreachable)
        await Promise.race([
          Promise.all(promises),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase Timeout')), 4000))
        ]);
      } catch (e) {
        console.error('Firebase save error:', e);
        await showAlert('Houve um problema de conexão ao salvar a sua contribuição. Por favor, tente confirmar novamente. Se o problema persistir, avise os noivos!');
        return;
      }

      this._resetFormAndUI();
    } finally {
      this.isProcessing = false;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('is-loading');
        confirmBtn.textContent = 'Já fiz a transferência!';
      }
    }
  }
}

/**
 * Calculates the CRC16 CCITT-FALSE checksum for the given string.
 * @param {string} str - The string to calculate the checksum for.
 * @returns {string} The 4-character hex checksum (uppercase).
 */
function calculateCRC16(str) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i);
    crc ^= (code << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) === 0) {
        crc = crc << 1;
      } else {
        crc = (crc << 1) ^ polynomial;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates a valid PIX BR Code (payload).
 * @param {string} pixKey - The PIX key (e.g. UUID, CPF, phone).
 * @param {number} amount - The transaction amount.
 * @param {string} merchantName - The name of the merchant.
 * @param {string} merchantCity - The city of the merchant.
 * @returns {string} The complete PIX payload with a valid CRC16.
 */
export function generatePixPayload(pixKey, amount, merchantName = 'LORENA E MARCELO', merchantCity = 'SAO PAULO') {
  const formatField = (id, value) => {
    const valStr = String(value);
    return id.toString().padStart(2, '0') + valStr.length.toString().padStart(2, '0') + valStr;
  };

  const gui = formatField(0, 'br.gov.bcb.pix');
  const key = formatField(1, pixKey);
  const merchantAccountInfo = formatField(26, gui + key);

  const payloadFormatIndicator = formatField(0, '01');
  const merchantCategoryCode = formatField(52, '0000');
  const transactionCurrency = formatField(53, '986');
  const transactionAmount = formatField(54, amount.toFixed(2));
  const countryCode = formatField(58, 'BR');
  const nameField = formatField(59, merchantName);
  const cityField = formatField(60, merchantCity);
  const referenceLabel = formatField(5, '***');
  const additionalData = formatField(62, referenceLabel);

  const partialPayload = 
    payloadFormatIndicator +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    nameField +
    cityField +
    additionalData +
    '6304';

  const crc = calculateCRC16(partialPayload);
  return partialPayload + crc;
}

