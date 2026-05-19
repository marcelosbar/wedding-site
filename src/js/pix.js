import QRCode from 'qrcode';
import { transactionsRef, addDoc } from './firebase.js';

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
  }

  async proceedToPix() {
    const guestName = document.getElementById('guest-name').value.trim();
    if (!guestName) {
      alert('Por favor, preencha o seu nome para sabermos quem está nos presenteando!');
      return;
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
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar QR Code');
    }
  }

  async copyPixPayload() {
    const input = document.getElementById('pix-payload');
    try {
      await navigator.clipboard.writeText(input.value);
      alert('Código PIX copiado!');
    } catch (err) {
      console.error('Falha ao copiar o código PIX', err);
    }
  }

  async confirmTransfer() {
    const guestName = document.getElementById('guest-name').value.trim();
    const total = this.cart.getTotal();
    const list = this.cart.currentList;

    const transactionData = {
      guestName,
      totalAmount: total,
      listChosen: list,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    try {
      await addDoc(transactionsRef, transactionData);
    } catch (e) {
      console.error('Firebase is not configured correctly yet or network error. Running local simulation.', e);
      this.scoreboard.simulateLocalScoreboard(list, total);
    }

    this.pixView.classList.remove('active');
    this.cartView.style.display = 'none';
    this.successView.classList.add('active');

    // Reset cart and form
    this.cart.reset();
    document.getElementById('guest-name').value = '';
  }
}
