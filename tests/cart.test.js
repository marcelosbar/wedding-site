/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cart } from '../src/js/cart.js';

function createMockElements() {
  document.body.innerHTML = `
    <div id="cart-overlay"></div>
    <span id="guest-name-error" class="field-error u-hidden">Error</span>
    <div id="cart-view">
      <h3 id="cart-title" tabindex="-1">Sua Contribuição</h3>
    </div>
    <div id="pix-view">
      <h3 id="pix-title" tabindex="-1">Pagamento via PIX</h3>
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
    <div class="cart-back-container u-hidden">
      <button id="cart-back-to-list-btn" class="u-hidden"></button>
    </div>
    <input id="guest-name" value="" />
    <textarea id="guest-message"></textarea>
    <input type="checkbox" id="message-public" checked />
    <div id="message-char-count">0 / 500</div>
    
    <div id="groom-gifts-modal" class="gifts-modal-overlay">
      <div class="gift-item" id="groom-item-1">
        <h4>Orelhinhas de Noivos</h4>
        <button class="add-to-cart-btn" data-item="Orelhinhas de Noivos" data-list="Groom" data-price="150">Adicionar</button>
      </div>
    </div>
    <div id="bride-gifts-modal" class="gifts-modal-overlay">
      <div class="gift-item" id="bride-item-1">
        <h4>Taça de Vinho Rosé</h4>
        <button class="add-to-cart-btn" data-item="Taça de Vinho Rosé" data-list="Bride" data-price="60">Adicionar</button>
      </div>
    </div>
  `;
  return {
    overlay: document.getElementById('cart-overlay'),
    cartView: document.getElementById('cart-view'),
    pixView: document.getElementById('pix-view'),
    successView: document.getElementById('success-view'),
    cartItemsContainer: document.getElementById('cart-items-container'),
    cartTotalValue: document.getElementById('cart-total-value'),
    floatingCartBtn: document.getElementById('floating-cart-btn'),
    floatingCartBadge: document.getElementById('floating-cart-badge'),
    navCartLink: document.getElementById('nav-cart-link'),
    navCartBadge: document.getElementById('nav-cart-badge'),
    backToListBtn: document.getElementById('cart-back-to-list-btn'),
  };
}

describe('Cart', () => {
  let cart;

  beforeEach(() => {
    localStorage.clear();
    cart = new Cart(createMockElements());
  });

  it('should initialize with empty items and no list', () => {
    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
  });

  it('should add an item and set the current list', () => {
    cart.addToCart('Groom', 'Test Gift', 100);
    expect(cart.items.length).toBe(1);
    expect(cart.currentList).toBe('Groom');
    expect(cart.items[0].name).toBe('Test Gift');
  });

  it('should allow mixing items from different lists', () => {
    cart.addToCart('Groom', 'Gift 1', 100);
    cart.addToCart('Bride', 'Gift 2', 200);
    expect(cart.items.length).toBe(2);
    expect(cart.currentList).toBe('mixed');
  });

  it('should remove an item and reset list when empty', () => {
    cart.addToCart('Groom', 'Gift', 100);
    cart.removeFromCart('Gift');
    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
  });

  it('should keep list when removing one of multiple items', () => {
    cart.addToCart('Groom', 'Gift A', 50);
    cart.addToCart('Groom', 'Gift B', 75);
    cart.removeFromCart('Gift A');
    expect(cart.items.length).toBe(1);
    expect(cart.currentList).toBe('Groom');
  });

  it('should render cart items grouped by list and calculate total', () => {
    cart.addToCart('Groom', 'Gift A', 50);
    cart.addToCart('Groom', 'Gift B', 75);
    cart.addToCart('Bride', 'Gift C', 100);
    cart.renderCart();
    // 2 headers (Groom and Bride) + 3 items = 5 children
    expect(document.getElementById('cart-items-container').children.length).toBe(5);
    expect(document.getElementById('cart-total-value').textContent).toBe('R$ 225.00');
  });

  it('should show back to list button dynamically based on previous modal id', () => {
    const container = cart.backToListBtn.closest('.cart-back-container');
    expect(cart.backToListBtn.classList.contains('u-hidden')).toBe(true);
    expect(container.classList.contains('u-hidden')).toBe(true);

    cart.openCart('groom-gifts-modal');
    expect(cart.backToListBtn.classList.contains('u-hidden')).toBe(false);
    expect(container.classList.contains('u-hidden')).toBe(false);
    expect(cart.backToListBtn.textContent).toBe('← Voltar para Lista do Noivo');

    cart.openCart('bride-gifts-modal');
    expect(cart.backToListBtn.classList.contains('u-hidden')).toBe(false);
    expect(container.classList.contains('u-hidden')).toBe(false);
    expect(cart.backToListBtn.textContent).toBe('← Voltar para Lista da Noiva');

    cart.openCart();
    expect(cart.backToListBtn.classList.contains('u-hidden')).toBe(true);
    expect(container.classList.contains('u-hidden')).toBe(true);
  });

  it('should add active class on openCart', () => {
    cart.openCart();
    expect(cart.overlay.classList.contains('active')).toBe(true);
    expect(cart.cartView.classList.contains('active')).toBe(true);
  });

  it('should remove active class on closeCart and hide guest name error', () => {
    const errorEl = document.getElementById('guest-name-error');
    errorEl.classList.remove('u-hidden');
    cart.openCart();
    cart.closeCart();
    expect(cart.overlay.classList.contains('active')).toBe(false);
    expect(errorEl.classList.contains('u-hidden')).toBe(true);
  });

  it('should reset inner views when openCart is called', () => {
    cart.successView.classList.add('active');
    cart.pixView.classList.add('active');
    cart.cartView.style.display = 'none';

    cart.openCart();

    expect(cart.cartView.style.display).toBe('block');
    expect(cart.cartView.classList.contains('active')).toBe(true);
    expect(cart.pixView.classList.contains('active')).toBe(false);
    expect(cart.successView.classList.contains('active')).toBe(false);
  });

  it('should calculate total with getTotal()', () => {
    cart.addToCart('Bride', 'A', 100);
    cart.addToCart('Bride', 'B', 250);
    expect(cart.getTotal()).toBe(350);
  });

  it('should reset items, list, and UI on reset()', () => {
    cart.addToCart('Groom', 'Gift', 100);
    cart.reset();
    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
    expect(document.getElementById('cart-items-container').children.length).toBe(0);
    expect(document.getElementById('cart-total-value').textContent).toBe('R$ 0.00');
  });

  it('should control floating button visibility and badges when rendering', () => {
    expect(cart.floatingCartBtn.classList.contains('visible')).toBe(false);
    expect(cart.navCartLink.style.display).toBe('none');

    cart.addToCart('Groom', 'Gift A', 50);
    cart.renderCart();

    expect(cart.floatingCartBtn.classList.contains('visible')).toBe(true);
    expect(cart.navCartLink.style.display).toBe('inline-block');
    expect(String(cart.floatingCartBadge.textContent)).toBe('1');
    expect(String(cart.navCartBadge.textContent)).toBe('1');

    cart.removeFromCart('Gift A');
    // removeFromCart triggers renderCart automatically
    expect(cart.floatingCartBtn.classList.contains('visible')).toBe(false);
    expect(cart.navCartLink.style.display).toBe('none');
  });

  it('should sync gift quantities controls correctly and not auto-open cart when adding items', () => {
    const itemEl = document.getElementById('groom-item-1');
    const wrapper = itemEl.querySelector('.gift-control-wrapper');
    expect(wrapper).not.toBeNull();

    const btnAdd = wrapper.querySelector('.add-to-cart-btn');
    const controls = wrapper.querySelector('.gift-qty-controls');
    const qtyVal = wrapper.querySelector('.gift-item-qty-val');

    // 1. Initial state: add-to-cart visible, controls hidden
    expect(btnAdd.classList.contains('u-hidden')).toBe(false);
    expect(controls.classList.contains('u-hidden')).toBe(true);

    // 2. Add one item (should NOT auto-open cart)
    cart.addToCart('Groom', 'Orelhinhas de Noivos', 150);
    expect(cart.items.length).toBe(1);
    expect(cart.overlay.classList.contains('active')).toBe(false); // didn't open cart!

    // Controls should now be visible and display 1
    expect(btnAdd.classList.contains('u-hidden')).toBe(true);
    expect(controls.classList.contains('u-hidden')).toBe(false);
    expect(qtyVal.textContent).toBe('1');

    // 3. Add same item again (quantity is 2)
    cart.addToCart('Groom', 'Orelhinhas de Noivos', 150);
    expect(qtyVal.textContent).toBe('2');

    // 4. Decrement quantity (using decrementCartItem)
    cart.decrementCartItem('Orelhinhas de Noivos');
    expect(qtyVal.textContent).toBe('1');

    // 5. Decrement again (reverts to Add to cart button)
    cart.decrementCartItem('Orelhinhas de Noivos');
    expect(btnAdd.classList.contains('u-hidden')).toBe(false);
    expect(controls.classList.contains('u-hidden')).toBe(true);
  });

  it('should group identical items and allow modifying quantity from the cart view', () => {
    cart.addToCart('Groom', 'Orelhinhas de Noivos', 150);
    cart.addToCart('Groom', 'Orelhinhas de Noivos', 150);
    cart.addToCart('Groom', 'Café da Manhã no Hotel Disney', 250);

    cart.renderCart();

    const container = document.getElementById('cart-items-container');
    // Group header ("Time Noivo") + 2 items = 3 children
    expect(container.children.length).toBe(3);

    // Header is children[0], Orelhinhas is children[1], Coffee is children[2]
    let firstRow = container.children[1];
    expect(firstRow.querySelector('.cart-item-name').textContent).toBe('Orelhinhas de Noivos');
    expect(firstRow.querySelector('.cart-qty-val').textContent).toBe('2');
    expect(firstRow.querySelector('.cart-item-price').textContent).toBe('R$ 300.00');

    // Test plus button inside the cart row
    const btnPlus = firstRow.querySelector('.cart-qty-btn.btn-plus');
    btnPlus.click();

    // Re-query after click because DOM is re-rendered
    firstRow = container.children[1];
    expect(firstRow.querySelector('.cart-qty-val').textContent).toBe('3');
    expect(firstRow.querySelector('.cart-item-price').textContent).toBe('R$ 450.00');

    // Test minus button inside the cart row
    const btnMinus = firstRow.querySelector('.cart-qty-btn.btn-minus');
    btnMinus.click();

    // Re-query after click because DOM is re-rendered
    firstRow = container.children[1];
    expect(firstRow.querySelector('.cart-qty-val').textContent).toBe('2');
    expect(firstRow.querySelector('.cart-item-price').textContent).toBe('R$ 300.00');

    // Test remove button inside the cart row
    const removeBtn = firstRow.querySelector('.cart-item-remove-btn');
    removeBtn.click();
    // Only Group header + coffee = 2 children remains
    expect(container.children.length).toBe(2); 
  });

  it('should update char count on guest-message input', () => {
    const messageEl = document.getElementById('guest-message');
    const counterEl = document.getElementById('message-char-count');
    
    // Simulate typing
    messageEl.value = 'Hello World';
    messageEl.dispatchEvent(new Event('input'));
    
    expect(counterEl.textContent).toBe('11 / 500');
  });

  it('should toggle modal footers visibility and modal-cart-count badges when items change', () => {
    const viewCartBtn = document.createElement('button');
    viewCartBtn.className = 'view-cart-modal-btn';
    const badge = document.createElement('span');
    badge.className = 'modal-cart-count';
    viewCartBtn.appendChild(badge);
    document.body.appendChild(viewCartBtn);

    const footer = document.createElement('div');
    footer.className = 'gifts-modal-footer u-hidden';
    document.body.appendChild(footer);

    cart.renderCart();
    expect(badge.textContent).toBe('0');
    expect(footer.classList.contains('u-hidden')).toBe(true);

    cart.addToCart('Groom', 'Gift', 100);
    expect(badge.textContent).toBe('1');
    expect(footer.classList.contains('u-hidden')).toBe(false);

    cart.removeFromCart('Gift');
    expect(badge.textContent).toBe('0');
    expect(footer.classList.contains('u-hidden')).toBe(true);

    viewCartBtn.remove();
    footer.remove();
  });

  it('should persist and load cart items to/from localStorage', () => {
    cart.addToCart('Groom', 'Persisted Gift', 120);
    
    const stored = JSON.parse(localStorage.getItem('wedding_cart'));
    expect(stored).toEqual([
      { name: 'Persisted Gift', price: 120, quantity: 1, list: 'Groom' }
    ]);
    
    const newCart = new Cart(createMockElements());
    expect(newCart.items).toEqual([
      { name: 'Persisted Gift', price: 120, quantity: 1, list: 'Groom' }
    ]);
  });

  it('should persist and restore guest name and message fields to/from localStorage', () => {
    const nameEl = document.getElementById('guest-name');
    const messageEl = document.getElementById('guest-message');
    
    nameEl.value = 'John Doe';
    nameEl.dispatchEvent(new Event('input'));
    
    messageEl.value = 'Felicidades!';
    messageEl.dispatchEvent(new Event('input'));
    
    expect(localStorage.getItem('wedding_guest_name')).toBe('John Doe');
    expect(localStorage.getItem('wedding_guest_message')).toBe('Felicidades!');
    
    const newCart = new Cart(createMockElements());
    const newNameEl = document.getElementById('guest-name');
    const newMessageEl = document.getElementById('guest-message');
    const newCountEl = document.getElementById('message-char-count');
    
    expect(newNameEl.value).toBe('John Doe');
    expect(newMessageEl.value).toBe('Felicidades!');
    expect(newCountEl.textContent).toBe('12 / 500');
    
    newCart.reset();
    expect(localStorage.getItem('wedding_guest_name')).toBeNull();
    expect(localStorage.getItem('wedding_guest_message')).toBeNull();
  });

  it('should cover cart edge cases, error handling, and back to list btn', () => {
    // 1. Back to list button click handling
    {
      const backBtn = document.getElementById('cart-back-to-list-btn');
      backBtn.dataset.targetModal = 'groom-gifts-modal';
      
      const closeSpy = vi.spyOn(cart, 'closeCart');
      backBtn.click();
      
      expect(closeSpy).toHaveBeenCalled();
      const targetModal = document.getElementById('groom-gifts-modal');
      expect(targetModal.classList.contains('active')).toBe(true);

      // Click when target modal doesn't exist
      backBtn.dataset.targetModal = 'non-existent';
      expect(() => backBtn.click()).not.toThrow();
    }

    // 2. localStorage throwing errors in load and save
    {
      const localGetSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Get Error');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const badCart = new Cart(createMockElements());
      expect(badCart.items).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();

      localGetSpy.mockRestore();

      const localSetSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Set Error');
      });
      
      cart.addToCart('Groom', 'Gift', 10);
      expect(errorSpy).toHaveBeenCalled();

      // Trigger form input events to hit the respective catch blocks
      const nameEl = document.getElementById('guest-name');
      const messageEl = document.getElementById('guest-message');
      const publicEl = document.getElementById('message-public');
      if (nameEl) {
        nameEl.value = 'John';
        nameEl.dispatchEvent(new Event('input'));
      }
      if (messageEl) {
        messageEl.value = 'Msg';
        messageEl.dispatchEvent(new Event('input'));
      }
      if (publicEl) {
        publicEl.checked = false;
        publicEl.dispatchEvent(new Event('change'));
      }

      localSetSpy.mockRestore();
      errorSpy.mockRestore();
    }

    // 3. Form persistence storedPublic is 'false' and change event on checkbox
    {
      localStorage.setItem('wedding_message_public', 'false');
      const anotherCart = new Cart(createMockElements());
      const publicEl = document.getElementById('message-public');
      expect(publicEl.checked).toBe(false);

      publicEl.checked = true;
      publicEl.dispatchEvent(new Event('change'));
      expect(localStorage.getItem('wedding_message_public')).toBe('true');
    }
  });
});
