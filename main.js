import QRCode from 'qrcode';
import { transactionsRef, addDoc, onSnapshot, query } from './firebase.js';

export class WeddingApp {
  constructor() {
    this.cart = [];
    this.currentList = null; // 'Groom' or 'Bride'
    
    // UI Elements
    this.overlay = document.getElementById('cart-overlay');
    this.cartView = document.getElementById('cart-view');
    this.pixView = document.getElementById('pix-view');
    this.successView = document.getElementById('success-view');
    this.cartItemsContainer = document.getElementById('cart-items-container');
    this.cartTotalValue = document.getElementById('cart-total-value');
    
    this.groomPointsEl = document.getElementById('groom-points');
    this.groomProgressEl = document.getElementById('groom-progress');
    this.bridePointsEl = document.getElementById('bride-points');
    this.brideProgressEl = document.getElementById('bride-progress');
    
    this.initRealtimeScoreboard();
  }

  // --- CART LOGIC ---
  addToCart(listName, itemName, price) {
    // Prevent mixing lists
    if (this.currentList && this.currentList !== listName) {
      alert(`Você não pode misturar presentes do Noivo e da Noiva. Conclua a contribuição atual primeiro!`);
      return;
    }
    
    this.currentList = listName;
    this.cart.push({ id: Date.now(), name: itemName, price: price });
    
    this.renderCart();
    this.openCart();
  }

  removeFromCart(id) {
    this.cart = this.cart.filter(item => item.id !== id);
    if (this.cart.length === 0) {
      this.currentList = null;
      this.closeCart();
    } else {
      this.renderCart();
    }
  }

  renderCart() {
    this.cartItemsContainer.innerHTML = '';
    let total = 0;
    
    this.cart.forEach(item => {
      total += item.price;
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <span>${item.name}</span>
        <div>
          <span style="margin-right: 1rem; font-weight: 500;">R$ ${item.price.toFixed(2)}</span>
          <button class="btn btn-sm" style="padding: 0.25rem 0.5rem; background: #ef4444; color: white;" onclick="app.removeFromCart(${item.id})">X</button>
        </div>
      `;
      this.cartItemsContainer.appendChild(el);
    });
    
    this.cartTotalValue.innerText = `R$ ${total.toFixed(2)}`;
  }

  openCart() {
    this.overlay.classList.add('active');
    this.cartView.classList.add('active');
    this.pixView.classList.remove('active');
    this.successView.classList.remove('active');
  }

  closeCart() {
    this.overlay.classList.remove('active');
    // We don't clear the cart here so they can resume, unless they completed it
  }

  // --- PIX LOGIC ---
  async proceedToPix() {
    const guestName = document.getElementById('guest-name').value.trim();
    if (!guestName) {
      alert("Por favor, preencha o seu nome para sabermos quem está nos presenteando!");
      return;
    }

    const total = this.cart.reduce((sum, item) => sum + item.price, 0);
    
    // In a real app, you construct a valid BR Code (PIX Payload) here based on your Pix Key
    // For demonstration, we use a mock payload
    const pixKey = "celular_ou_cpf"; // Insira a sua chave PIX real aqui
    const mockPayload = `00020126360014br.gov.bcb.pix0114${pixKey}5204000053039865405${total.toFixed(2)}5802BR5915LORENA E MARCELO6009SAO PAULO62070503***6304ABCD`;
    
    document.getElementById('pix-payload').value = mockPayload;

    try {
      const canvas = document.getElementById('pix-qr-code');
      await QRCode.toCanvas(canvas, mockPayload, { width: 250, margin: 2 });
      
      this.cartView.style.display = 'none';
      this.pixView.classList.add('active');
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar QR Code");
    }
  }

  async copyPixPayload() {
    const input = document.getElementById('pix-payload');
    try {
      await navigator.clipboard.writeText(input.value);
      alert("Código PIX copiado!");
    } catch (err) {
      console.error('Falha ao copiar o código PIX', err);
    }
  }

  // --- FIREBASE / COMPLETION LOGIC ---
  async confirmTransfer() {
    const guestName = document.getElementById('guest-name').value.trim();
    const total = this.cart.reduce((sum, item) => sum + item.price, 0);
    const list = this.currentList;

    const transactionData = {
      guestName,
      totalAmount: total,
      listChosen: list,
      status: 'pending', // Wait for admin approval
      timestamp: new Date().toISOString()
    };

    try {
      // Add to Firebase (this will fail if Firebase config is invalid)
      await addDoc(transactionsRef, transactionData);
    } catch (e) {
      console.error("Firebase is not configured correctly yet or network error. Running local simulation.", e);
      // Fallback for local simulation
      this.simulateLocalScoreboard(list, total);
    }

    this.pixView.classList.remove('active');
    this.successView.classList.add('active');
    
    // Reset cart
    this.cart = [];
    this.currentList = null;
    document.getElementById('guest-name').value = '';
    
    // Ensure display blocks are reset for next open
    setTimeout(() => {
      this.cartView.style.display = 'block';
    }, 500);
  }

  // Listen to transactions and update points automatically
  initRealtimeScoreboard() {
    let groomScore = 0;
    let brideScore = 0;

    try {
      const q = query(transactionsRef);
      onSnapshot(q, (snapshot) => {
        groomScore = 0;
        brideScore = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          // Even pending ones count immediately for the excitement effect!
          // Admin can reject later which removes it
          if (data.status !== 'rejected') {
            if (data.listChosen === 'Groom') groomScore += data.totalAmount;
            if (data.listChosen === 'Bride') brideScore += data.totalAmount;
          }
        });

        this.updateScoreboardUI(groomScore, brideScore);
      }, (err) => {
        console.log("Waiting for proper Firebase Config to enable real-time sync.");
      });
    } catch (e) {
      console.warn("Firebase not configured correctly for realtime sync.", e);
    }
  }

  simulateLocalScoreboard(list, amount) {
    let groomPts = Number.parseInt(this.groomPointsEl.innerText, 10) || 0;
    let bridePts = Number.parseInt(this.bridePointsEl.innerText, 10) || 0;

    if (list === 'Groom') groomPts += amount;
    if (list === 'Bride') bridePts += amount;

    this.updateScoreboardUI(groomPts, bridePts);
  }

  updateScoreboardUI(groomPts, bridePts) {
    this.groomPointsEl.innerText = `${groomPts} pts`;
    this.bridePointsEl.innerText = `${bridePts} pts`;

    const total = groomPts + bridePts;
    const groomPercent = total > 0 ? (groomPts / total) * 100 : 0;
    const bridePercent = total > 0 ? (bridePts / total) * 100 : 0;

    this.groomProgressEl.style.width = `${groomPercent}%`;
    this.brideProgressEl.style.width = `${bridePercent}%`;
  }
}

// Initialize App and expose to window for HTML inline onClick access
try {
  if (globalThis.window !== undefined) {
    globalThis.window.app = new WeddingApp();
    console.log("WeddingApp initialized and attached to window.app successfully.");
  }
} catch (error) {
  console.error("Failed to initialize WeddingApp:", error);
}
