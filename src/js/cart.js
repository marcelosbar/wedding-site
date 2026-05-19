/**
 * Cart module — handles adding, removing, rendering cart items and modal visibility.
 */
export class Cart {
  constructor(elements) {
    this.items = [];
    this.currentList = null; // 'Groom' or 'Bride'
    this.overlay = elements.overlay;
    this.cartView = elements.cartView;
    this.pixView = elements.pixView;
    this.successView = elements.successView;
    this.cartItemsContainer = elements.cartItemsContainer;
    this.cartTotalValue = elements.cartTotalValue;
  }

  addToCart(listName, itemName, price) {
    if (this.currentList && this.currentList !== listName) {
      alert('Você não pode misturar presentes do Noivo e da Noiva. Conclua a contribuição atual primeiro!');
      return;
    }

    this.currentList = listName;
    this.items.push({ id: Date.now(), name: itemName, price });

    this.renderCart();
    this.openCart();
  }

  removeFromCart(id) {
    this.items = this.items.filter(item => item.id !== id);
    if (this.items.length === 0) {
      this.currentList = null;
      this.closeCart();
    } else {
      this.renderCart();
    }
  }

  renderCart() {
    this.cartItemsContainer.innerHTML = '';
    let total = 0;

    this.items.forEach(item => {
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
    this.successView.classList.remove('active');
    this.cartView.style.display = 'block';
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }

  reset() {
    this.items = [];
    this.currentList = null;
  }
}
