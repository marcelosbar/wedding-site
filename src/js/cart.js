import { escapeHTML } from './utils.js';

/**
 * Cart module — handles adding, removing, rendering cart items and modal visibility.
 */
export class Cart {
  constructor(elements) {
    this.items = []; // stores { name: itemName, price: unitPrice, quantity: q }
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

    this._initGiftControls();
    this.renderCart();
  }

  _initGiftControls() {
    if (typeof document === 'undefined') return;

    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      const parent = btn.parentNode;
      if (!parent) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'gift-control-wrapper';

      parent.insertBefore(wrapper, btn);
      wrapper.appendChild(btn);

      const listName = btn.dataset.list;
      const itemName = btn.dataset.item;
      const price = btn.dataset.price;
      const themeClass = btn.classList.contains('btn-primary') ? 'btn-primary' : 'btn-secondary';

      const controls = document.createElement('div');
      controls.className = 'gift-qty-controls u-hidden';

      const btnMinus = document.createElement('button');
      btnMinus.className = `btn btn-sm gift-item-qty-btn btn-minus ${themeClass}`;
      btnMinus.innerHTML = '&minus;';
      btnMinus.dataset.item = itemName;
      btnMinus.addEventListener('click', () => this.decrementCartItem(itemName));

      const qtyVal = document.createElement('span');
      qtyVal.className = 'gift-item-qty-val';
      qtyVal.textContent = '0';

      const btnPlus = document.createElement('button');
      btnPlus.className = `btn btn-sm gift-item-qty-btn btn-plus ${themeClass}`;
      btnPlus.innerHTML = '&plus;';
      btnPlus.dataset.item = itemName;
      btnPlus.dataset.list = listName;
      btnPlus.dataset.price = price;
      btnPlus.addEventListener('click', () => this.addToCart(listName, itemName, Number.parseFloat(price)));

      controls.appendChild(btnMinus);
      controls.appendChild(qtyVal);
      controls.appendChild(btnPlus);

      wrapper.appendChild(controls);
    });
  }

  addToCart(listName, itemName, price) {
    if (this.currentList && this.currentList !== listName) {
      alert('Você não pode misturar presentes do Noivo e da Noiva. Conclua a contribuição atual primeiro!');
      return;
    }

    this.currentList = listName;
    const existing = this.items.find(item => item.name === itemName);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({ name: itemName, price, quantity: 1 });
    }

    this.renderCart();
  }

  decrementCartItem(itemName) {
    const existing = this.items.find(item => item.name === itemName);
    if (existing) {
      existing.quantity -= 1;
      if (existing.quantity <= 0) {
        this.items = this.items.filter(item => item.name !== itemName);
      }
    }

    if (this.items.length === 0) {
      this.currentList = null;
      this.closeCart();
    }

    this.renderCart();
  }

  removeFromCart(itemName) {
    this.items = this.items.filter(item => item.name !== itemName);
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
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      const el = document.createElement('div');
      el.className = 'cart-item';

      // 1. Quantity controls
      const qtyDiv = document.createElement('div');
      qtyDiv.className = 'cart-item-qty-controls';

      const btnMinus = document.createElement('button');
      btnMinus.className = 'cart-qty-btn btn-minus';
      btnMinus.innerHTML = '&minus;';
      btnMinus.addEventListener('click', () => this.decrementCartItem(item.name));

      const qtyVal = document.createElement('span');
      qtyVal.className = 'cart-qty-val';
      qtyVal.textContent = item.quantity;

      const btnPlus = document.createElement('button');
      btnPlus.className = 'cart-qty-btn btn-plus';
      btnPlus.innerHTML = '&plus;';
      btnPlus.addEventListener('click', () => this.addToCart(this.currentList, item.name, item.price));

      qtyDiv.appendChild(btnMinus);
      qtyDiv.appendChild(qtyVal);
      qtyDiv.appendChild(btnPlus);

      // 2. Name
      const nameSpan = document.createElement('span');
      nameSpan.className = 'cart-item-name';
      nameSpan.innerHTML = escapeHTML(item.name);

      // 3. Right side (price + remove)
      const rightDiv = document.createElement('div');
      rightDiv.className = 'cart-item-right';

      const priceSpan = document.createElement('span');
      priceSpan.className = 'cart-item-price';
      priceSpan.textContent = `R$ ${itemTotal.toFixed(2)}`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'cart-item-remove-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => this.removeFromCart(item.name));

      rightDiv.appendChild(priceSpan);
      rightDiv.appendChild(removeBtn);

      el.appendChild(qtyDiv);
      el.appendChild(nameSpan);
      el.appendChild(rightDiv);

      this.cartItemsContainer.appendChild(el);
    });

    if (this.cartTotalValue) {
      this.cartTotalValue.textContent = `R$ ${total.toFixed(2)}`;
    }

    const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
    if (this.floatingCartBadge) this.floatingCartBadge.textContent = count;
    if (this.navCartBadge) this.navCartBadge.textContent = count;

    if (count > 0) {
      if (this.floatingCartBtn) this.floatingCartBtn.classList.add('visible');
      if (this.navCartLink) this.navCartLink.style.display = 'inline-block';
    } else {
      if (this.floatingCartBtn) this.floatingCartBtn.classList.remove('visible');
      if (this.navCartLink) this.navCartLink.style.display = 'none';
    }

    this._syncGiftQuantities();
  }

  _syncGiftQuantities() {
    if (typeof document === 'undefined') return;

    const counts = {};
    this.items.forEach(item => {
      counts[item.name] = item.quantity;
    });

    document.querySelectorAll('.gift-control-wrapper').forEach(wrapper => {
      const btnAdd = wrapper.querySelector('.add-to-cart-btn');
      const controls = wrapper.querySelector('.gift-qty-controls');
      const qtyVal = wrapper.querySelector('.gift-item-qty-val');
      if (!btnAdd || !controls || !qtyVal) return;

      const itemName = btnAdd.dataset.item;
      const count = counts[itemName] || 0;

      if (count > 0) {
        btnAdd.classList.add('u-hidden');
        controls.classList.remove('u-hidden');
        qtyVal.textContent = count;
      } else {
        btnAdd.classList.remove('u-hidden');
        controls.classList.add('u-hidden');
      }
    });
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
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  reset() {
    this.items = [];
    this.currentList = null;
    this.renderCart();
  }
}
