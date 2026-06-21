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
    this.exchangeRate = 6;
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

    this._updateMbWaySummaryDOM(rawTotal, eurTotal, adjustedBrlTotal);

    const groomItems = this.cart.items.filter(item => item.list === 'Groom');
    const brideItems = this.cart.items.filter(item => item.list === 'Bride');
    const breakdownEl = document.getElementById('mbway-mixed-breakdown');

    if (groomItems.length > 0 && brideItems.length > 0) {
      this._updateMbWayBreakdownDOM(eurTotal, groomItems, brideItems, breakdownEl);
    } else {
      if (breakdownEl) {
        breakdownEl.classList.add('u-hidden');
      }

      // Update B.3 team info fallback text
      const teamInfoB3 = document.getElementById('mbway-text-team-info-b3');
      if (teamInfoB3) {
        if (groomItems.length > 0) {
          teamInfoB3.innerHTML = 'para o <strong>Time Noivo</strong> (Disney Paris)';
        } else if (brideItems.length > 0) {
          teamInfoB3.innerHTML = 'para o <strong>Time Noiva</strong> (Côte d\'Azur)';
        } else {
          teamInfoB3.innerHTML = 'para o placar';
        }
      }
    }
  }

  _updateMbWaySummaryDOM(rawTotal, eurTotal, adjustedBrlTotal) {
    const formattedBrl = `R$ ${rawTotal.toFixed(2).replace('.', ',')}`;
    const formattedEur = `€ ${eurTotal.toFixed(2).replace('.', ',')}`;
    const formattedPoints = `${adjustedBrlTotal} pts`;
    const formattedPointsPlus = `+${adjustedBrlTotal} pts`;
    const formattedRate = `R$ ${this.exchangeRate.toFixed(2).replace('.', ',')}`;

    // Helper function to safely set element text
    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    // Update B.3 and Legacy IDs (so tests pass)
    setText('mbway-original-total', formattedBrl);
    setText('mbway-summary-rate', formattedRate);
    setText('mbway-eur-total', formattedEur);
    setText('mbway-eur-instruction-total', formattedEur);
    setText('mbway-eur-checkout-total', formattedEur);
    setText('mbway-points-total', formattedPoints);
    setText('mbway-footnote-original', formattedBrl);
    setText('mbway-footnote-points', formattedPointsPlus);
  }

  _updateMbWayBreakdownDOM(eurTotal, groomItems, brideItems, breakdownEl) {
    if (breakdownEl) {
      breakdownEl.classList.remove('u-hidden');
    }

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

    // Update B.3 and Legacy IDs (so tests pass)
    const groomPointsEl = document.getElementById('mbway-groom-points');
    const bridePointsEl = document.getElementById('mbway-bride-points');
    if (groomPointsEl) {
      groomPointsEl.textContent = groomPoints;
    }
    if (bridePointsEl) {
      bridePointsEl.textContent = bridePoints;
    }

    // Update B.3 team info text
    const teamInfoB3 = document.getElementById('mbway-text-team-info-b3');
    if (teamInfoB3) {
      teamInfoB3.innerHTML = `(sendo <strong>${groomPoints} pts</strong> para o Time Noivo e <strong>${bridePoints} pts</strong> para o Time Noiva)`;
    }
  }

  async _executeTransferCheckout(confirmMessage, confirmBtnId, getPromisesFn) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const confirmBtn = document.getElementById(confirmBtnId);

    try {
      const confirmed = await showConfirm(confirmMessage);
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

      const promises = getPromisesFn(guestName, message, isPublic, total);

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

  async confirmMbWayTransfer() {
    return this._executeTransferCheckout(
      'Você está finalizando a sua contribuição. Tem certeza de que já realizou a transferência via MB WAY?',
      'confirm-mbway-transfer-btn',
      (guestName, message, isPublic, total) => {
        const eurTotal = Math.max(1, Math.round(total / this.exchangeRate));
        return this._createTransactionPromises(
          guestName,
          message,
          isPublic,
          'mbway',
          this.exchangeRate,
          eurTotal
        );
      }
    );
  }

  _createTransactionPromises(guestName, message, isPublic, paymentMethod = 'pix', exchangeRate = null, eurAmount = null) {
    const groomItems = this.cart.items.filter(item => item.list === 'Groom');
    const brideItems = this.cart.items.filter(item => item.list === 'Bride');
    const promises = [];
    
    let groupId = null;
    if (groomItems.length > 0 && brideItems.length > 0) {
      const array = new Uint32Array(1);
      globalThis.crypto.getRandomValues(array);
      groupId = 'group_' + Date.now().toString(36) + '_' + array[0].toString(36);
    }

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
      const split = this._calculateMbWaySplit(eurAmount, groomItems, brideItems, groomBrl, brideBrl);
      groomEur = split.groomEur;
      brideEur = split.brideEur;
      
      groomBrl = groomEur === null ? 0 : Math.round(groomEur * exchangeRate);
      brideBrl = brideEur === null ? 0 : Math.round(brideEur * exchangeRate);
    }

    const buildTransactionPayload = (listChosen, totalAmount, items, eurVal) => {
      const data = {
        guestName,
        totalAmount,
        listChosen,
        status: 'pending',
        timestamp: new Date().toISOString(),
        message,
        isPublic,
        items: items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        paymentMethod
      };
      if (paymentMethod === 'mbway') {
        data.eurAmount = eurVal;
        data.exchangeRate = exchangeRate;
      }
      if (groupId) {
        data.groupId = groupId;
      }
      return data;
    };

    if (groomItems.length > 0) {
      promises.push(addDoc(transactionsRef, buildTransactionPayload('Groom', groomBrl, groomItems, groomEur)));
    }

    if (brideItems.length > 0) {
      promises.push(addDoc(transactionsRef, buildTransactionPayload('Bride', brideBrl, brideItems, brideEur)));
    }

    return promises;
  }

  _calculateMbWaySplit(eurAmount, groomItems, brideItems, groomBrl, brideBrl) {
    let groomEur = null;
    let brideEur = null;

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

    return { groomEur, brideEur };
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
    return this._executeTransferCheckout(
      'Você está finalizando a sua contribuição. Tem certeza de que já realizou a transferência?',
      'confirm-transfer-btn',
      (guestName, message, isPublic) => {
        return this._createTransactionPromises(guestName, message, isPublic, 'pix');
      }
    );
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

