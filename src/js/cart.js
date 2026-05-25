import { escapeHTML } from './utils.js';

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
    this.floatingCartBtn = elements.floatingCartBtn;
    this.floatingCartBadge = elements.floatingCartBadge;
    this.navCartLink = elements.navCartLink;
    this.navCartBadge = elements.navCartBadge;
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
    }
    this.renderCart();
  }

  renderCart() {
    this.cartItemsContainer.innerHTML = '';
    let total = 0;

    this.items.forEach(item => {
      total += item.price;
      const el = document.createElement('div');
      el.className = 'cart-item';

      const label = document.createElement('span');
      label.innerHTML = escapeHTML(item.name);

      const rightDiv = document.createElement('div');

      const priceSpan = document.createElement('span');
      priceSpan.style.cssText = 'margin-right: 1rem; font-weight: 500;';
      priceSpan.innerText = `R$ ${item.price.toFixed(2)}`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm';
      removeBtn.style.cssText = 'padding: 0.25rem 0.5rem; background: #ef4444; color: white;';
      removeBtn.innerText = 'X';
      removeBtn.addEventListener('click', () => this.removeFromCart(item.id));

      rightDiv.appendChild(priceSpan);
      rightDiv.appendChild(removeBtn);

      el.appendChild(label);
      el.appendChild(rightDiv);

      this.cartItemsContainer.appendChild(el);
    });

    if (this.cartTotalValue) {
      this.cartTotalValue.innerText = `R$ ${total.toFixed(2)}`;
    }

    const count = this.items.length;
    if (this.floatingCartBadge) this.floatingCartBadge.innerText = count;
    if (this.navCartBadge) this.navCartBadge.innerText = count;

    if (count > 0) {
      if (this.floatingCartBtn) this.floatingCartBtn.classList.add('visible');
      if (this.navCartLink) this.navCartLink.style.display = 'inline-block';
    } else {
      if (this.floatingCartBtn) this.floatingCartBtn.classList.remove('visible');
      if (this.navCartLink) this.navCartLink.style.display = 'none';
    }
  }

  openCart() {
    this.overlay.classList.add('active');
    this.cartView.style.display = 'block';
    this.cartView.classList.add('active');
    this.pixView.classList.remove('active');
    this.successView.classList.remove('active');
  }

  closeCart() {
    this.overlay.classList.remove('active');
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }

  reset() {
    this.items = [];
    this.currentList = null;
    this.renderCart();
  }
}
