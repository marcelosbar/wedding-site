import { escapeHTML } from './utils.js';

/**
 * Cart module — handles adding, removing, rendering cart items and modal visibility.
 */
export class Cart {
  constructor(elements) {
    this.items = this._loadCart(); // Load items from localStorage
    this.overlay = elements.overlay;
    this.cartView = elements.cartView;
    this.pixView = elements.pixView;
    this.mbwayView = elements.mbwayView;
    this.successView = elements.successView;
    this.cartItemsContainer = elements.cartItemsContainer;
    this.cartTotalValue = elements.cartTotalValue;
    this.floatingCartBtn = elements.floatingCartBtn;
    this.floatingCartBadge = elements.floatingCartBadge;
    this.navCartLink = elements.navCartLink;
    this.navCartBadge = elements.navCartBadge;
    this.backToListBtn = elements.backToListBtn;

    this._initGiftControls();
    this._initBackToListBtn();
    this._initMessageCounter();
    this._initFormPersistence();
    this.renderCart();
  }

  _loadCart() {
    if (globalThis.window !== undefined && globalThis.localStorage) {
      try {
        const data = localStorage.getItem('wedding_cart');
        return data ? JSON.parse(data) : [];
      } catch (e) {
        console.error('Failed to load cart from localStorage', e);
      }
    }
    return [];
  }

  _saveCart() {
    if (globalThis.window !== undefined && globalThis.localStorage) {
      try {
        localStorage.setItem('wedding_cart', JSON.stringify(this.items));
      } catch (e) {
        console.error('Failed to save cart to localStorage', e);
      }
    }
  }

  get currentList() {
    if (this.items.length === 0) return null;
    const lists = [...new Set(this.items.map(item => item.list))];
    if (lists.length === 1) return lists[0];
    return 'mixed';
  }

  set currentList(val) {
    // Dynamic getter takes precedence, setter is no-op to maintain backwards compatibility
  }

  _initGiftControls() {
    if (typeof document === 'undefined') return;

    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      const parent = btn.parentNode;
      if (!parent) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'gift-control-wrapper';

      btn.before(wrapper);
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
      btnMinus.addEventListener('click', () => this.decrementCartItem(itemName, listName));

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

  _initBackToListBtn() {
    if (this.backToListBtn) {
      this.backToListBtn.addEventListener('click', () => {
        const targetModalId = this.backToListBtn.dataset.targetModal;
        if (targetModalId) {
          this.closeCart();
          const overlay = document.getElementById(targetModalId);
          if (overlay) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
          }
        }
      });
    }
  }

  _initMessageCounter() {
    if (typeof document === 'undefined') return;
    const messageEl = document.getElementById('guest-message');
    const counterEl = document.getElementById('message-char-count');
    if (messageEl && counterEl) {
      messageEl.addEventListener('input', () => {
        const count = messageEl.value.length;
        counterEl.textContent = `${count} / 500`;
      });
    }
  }

  _initFormPersistence() {
    if (typeof document === 'undefined') return;
    
    const nameEl = document.getElementById('guest-name');
    const messageEl = document.getElementById('guest-message');
    const publicEl = document.getElementById('message-public');
    const counterEl = document.getElementById('message-char-count');
    
    // Restore values from localStorage
    try {
      if (nameEl) nameEl.value = localStorage.getItem('wedding_guest_name') || '';
      if (messageEl) {
        messageEl.value = localStorage.getItem('wedding_guest_message') || '';
        if (counterEl) {
          counterEl.textContent = `${messageEl.value.length} / 500`;
        }
      }
      if (publicEl) {
        const storedPublic = localStorage.getItem('wedding_message_public');
        if (storedPublic !== null) {
          publicEl.checked = storedPublic === 'true';
        }
      }
    } catch (e) {
      console.error('Failed to restore form values from localStorage', e);
    }
    
    // Listen for inputs to save values
    if (nameEl) {
      nameEl.addEventListener('input', () => {
        try {
          localStorage.setItem('wedding_guest_name', nameEl.value);
        } catch (e) {
          console.error('Failed to save guest name to localStorage', e);
        }
      });
    }
    if (messageEl) {
      messageEl.addEventListener('input', () => {
        try {
          localStorage.setItem('wedding_guest_message', messageEl.value);
        } catch (e) {
          console.error('Failed to save guest message to localStorage', e);
        }
      });
    }
    if (publicEl) {
      publicEl.addEventListener('change', () => {
        try {
          localStorage.setItem('wedding_message_public', String(publicEl.checked));
        } catch (e) {
          console.error('Failed to save message public setting to localStorage', e);
        }
      });
    }
  }

  addToCart(listName, itemName, price) {
    const existing = this.items.find(item => item.name === itemName && item.list === listName);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({ name: itemName, price, quantity: 1, list: listName });
    }

    this.renderCart();
  }

  decrementCartItem(itemName, listName) {
    const existing = this.items.find(item => item.name === itemName && (!listName || item.list === listName));
    if (existing) {
      existing.quantity -= 1;
      if (existing.quantity <= 0) {
        this.items = this.items.filter(item => !(item.name === itemName && (!listName || item.list === listName)));
      }
    }

    if (this.items.length === 0) {
      this.closeCart();
    }

    this.renderCart();
  }

  removeFromCart(itemName, listName) {
    this.items = this.items.filter(item => !(item.name === itemName && (!listName || item.list === listName)));
    if (this.items.length === 0) {
      this.closeCart();
    }
    this.renderCart();
  }

  renderCart() {
    this.cartItemsContainer.innerHTML = '';
    let total = 0;

    const groups = {
      Groom: this.items.filter(item => item.list === 'Groom'),
      Bride: this.items.filter(item => item.list === 'Bride')
    };

    Object.entries(groups).forEach(([listName, listItems]) => {
      if (listItems.length === 0) return;

      const header = document.createElement('div');
      header.className = `cart-group-header ${listName.toLowerCase()}`;
      header.textContent = listName === 'Groom' ? 'Time Noivo: Disney Paris' : "Time Noiva: Côte d'Azur";
      this.cartItemsContainer.appendChild(header);

      listItems.forEach(item => {
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
        btnMinus.addEventListener('click', () => this.decrementCartItem(item.name, item.list));

        const qtyVal = document.createElement('span');
        qtyVal.className = 'cart-qty-val';
        qtyVal.textContent = item.quantity;

        const btnPlus = document.createElement('button');
        btnPlus.className = 'cart-qty-btn btn-plus';
        btnPlus.innerHTML = '&plus;';
        btnPlus.addEventListener('click', () => this.addToCart(item.list, item.name, item.price));

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
        removeBtn.addEventListener('click', () => this.removeFromCart(item.name, item.list));

        rightDiv.appendChild(priceSpan);
        rightDiv.appendChild(removeBtn);

        el.appendChild(qtyDiv);
        el.appendChild(nameSpan);
        el.appendChild(rightDiv);

        this.cartItemsContainer.appendChild(el);
      });
    });

    if (this.cartTotalValue) {
      this.cartTotalValue.textContent = `R$ ${total.toFixed(2)}`;
    }

    const count = this.items.reduce((sum, item) => sum + item.quantity, 0);
    if (this.floatingCartBadge) this.floatingCartBadge.textContent = count;
    if (this.navCartBadge) this.navCartBadge.textContent = count;

    if (typeof document !== 'undefined') {
      document.querySelectorAll('.view-cart-modal-btn .modal-cart-count').forEach(badge => {
        badge.textContent = count;
      });

      document.querySelectorAll('.gifts-modal-footer').forEach(footer => {
        if (count > 0) {
          footer.classList.remove('u-hidden');
        } else {
          footer.classList.add('u-hidden');
        }
      });
    }

    if (count > 0) {
      if (this.floatingCartBtn) this.floatingCartBtn.classList.add('visible');
      if (this.navCartLink) this.navCartLink.style.display = 'inline-block';
    } else {
      if (this.floatingCartBtn) this.floatingCartBtn.classList.remove('visible');
      if (this.navCartLink) this.navCartLink.style.display = 'none';
    }

    this._syncGiftQuantities();
    this._saveCart();
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

  /** @private Configures the back-to-list button based on which modal was previously open. */
  _configureBackButton(previousModalId) {
    if (!this.backToListBtn) return;

    const container = this.backToListBtn.closest('.cart-back-container');
    this.backToListBtn.classList.remove('groom', 'bride');

    const config = {
      'groom-gifts-modal': { label: '← Voltar para Lista do Noivo', modifier: 'groom' },
      'bride-gifts-modal': { label: '← Voltar para Lista da Noiva', modifier: 'bride' },
    };
    const match = config[previousModalId];

    if (match) {
      this.backToListBtn.textContent = match.label;
      this.backToListBtn.dataset.targetModal = previousModalId;
      this.backToListBtn.classList.add(match.modifier);
      this.backToListBtn.classList.remove('u-hidden');
      if (container) container.classList.remove('u-hidden');
    } else {
      this.backToListBtn.classList.add('u-hidden');
      if (container) container.classList.add('u-hidden');
      delete this.backToListBtn.dataset.targetModal;
    }
  }

  openCart(previousModalId = null) {
    this.overlay.classList.add('active');
    this.cartView.style.display = 'block';
    this.cartView.classList.add('active');
    this.pixView.classList.remove('active');
    if (this.mbwayView) this.mbwayView.classList.remove('active');
    this.successView.classList.remove('active');

    this._configureBackButton(previousModalId);

    if (typeof document !== 'undefined') {
      const cartTitle = document.getElementById('cart-title');
      if (cartTitle) {
        cartTitle.focus();
      }
    }
  }

  closeCart() {
    this.overlay.classList.remove('active');
    if (typeof document !== 'undefined') {
      const nameError = document.getElementById('guest-name-error');
      if (nameError) {
        nameError.classList.add('u-hidden');
      }
    }
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  reset() {
    this.items = [];
    this.currentList = null;
    if (globalThis.window !== undefined && globalThis.localStorage) {
      localStorage.removeItem('wedding_guest_name');
      localStorage.removeItem('wedding_guest_message');
      localStorage.removeItem('wedding_message_public');
    }
    this.renderCart();
  }
}
