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
    this.successView = elements.successView;
    this.isProcessing = false;
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

    // In a real app, you construct a valid BR Code (PIX Payload) here based on your Pix Key
    const pixKey = 'celular_ou_cpf'; // Insira a sua chave PIX real aqui
    const mockPayload = `00020126360014br.gov.bcb.pix0114${pixKey}5204000053039865405${total.toFixed(2)}5802BR5915LORENA E MARCELO6009SAO PAULO62070503***6304ABCD`;

    document.getElementById('pix-payload').value = mockPayload;

    try {
      const canvas = document.getElementById('pix-qr-code');
      await QRCode.toCanvas(canvas, mockPayload, { width: 250, margin: 2 });

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

      const groomItems = this.cart.items.filter(item => item.list === 'Groom');
      const brideItems = this.cart.items.filter(item => item.list === 'Bride');

      const promises = [];

      if (groomItems.length > 0) {
        const groomTotal = groomItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        promises.push(addDoc(transactionsRef, {
          guestName,
          totalAmount: groomTotal,
          listChosen: 'Groom',
          status: 'pending',
          timestamp: new Date().toISOString(),
          message,
          isPublic,
          items: groomItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }));
      }


      if (brideItems.length > 0) {
        const brideTotal = brideItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        promises.push(addDoc(transactionsRef, {
          guestName,
          totalAmount: brideTotal,
          listChosen: 'Bride',
          status: 'pending',
          timestamp: new Date().toISOString(),
          message,
          isPublic,
          items: brideItems.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }));
      }


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

      this.pixView.classList.remove('active');
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
