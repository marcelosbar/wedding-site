/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Cart } from '../src/js/cart.js';

function createMockElements() {
  document.body.innerHTML = `
    <div id="cart-overlay"></div>
    <div id="cart-view"></div>
    <div id="pix-view"></div>
    <div id="success-view"></div>
    <div id="cart-items-container"></div>
    <div id="cart-total-value"></div>
    <button id="floating-cart-btn"></button>
    <span id="floating-cart-badge"></span>
    <button id="nav-cart-link" style="display: none;"></button>
    <span id="nav-cart-badge"></span>
    
    <div id="groom-gifts-modal">
      <div class="gift-item" id="groom-item-1">
        <h4>Orelhinhas de Noivos</h4>
        <button class="add-to-cart-btn" data-item="Orelhinhas de Noivos" data-list="Groom" data-price="80">Adicionar</button>
      </div>
    </div>
    <div id="bride-gifts-modal">
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
  };
}

describe('Cart', () => {
  let cart;

  beforeEach(() => {
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

  it('should prevent mixing items from different lists', () => {
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    cart.addToCart('Groom', 'Gift 1', 100);
    cart.addToCart('Bride', 'Gift 2', 200);
    expect(cart.items.length).toBe(1);
    expect(alertMock).toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('should remove an item and reset list when empty', () => {
    cart.addToCart('Groom', 'Gift', 100);
    const id = cart.items[0].id;
    cart.removeFromCart(id);
    expect(cart.items.length).toBe(0);
    expect(cart.currentList).toBeNull();
  });

  it('should keep list when removing one of multiple items', () => {
    cart.addToCart('Groom', 'Gift A', 50);
    cart.addToCart('Groom', 'Gift B', 75);
    cart.removeFromCart(cart.items[0].id);
    expect(cart.items.length).toBe(1);
    expect(cart.currentList).toBe('Groom');
  });

  it('should render cart items and calculate total', () => {
    cart.addToCart('Groom', 'Gift A', 50);
    cart.addToCart('Groom', 'Gift B', 75);
    cart.renderCart();
    expect(document.getElementById('cart-items-container').children.length).toBe(2);
    expect(document.getElementById('cart-total-value').innerText).toBe('R$ 125.00');
  });

  it('should add active class on openCart', () => {
    cart.openCart();
    expect(cart.overlay.classList.contains('active')).toBe(true);
    expect(cart.cartView.classList.contains('active')).toBe(true);
  });

  it('should remove active class on closeCart', () => {
    cart.openCart();
    cart.closeCart();
    expect(cart.overlay.classList.contains('active')).toBe(false);
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
    expect(document.getElementById('cart-total-value').innerText).toBe('R$ 0.00');
  });

  it('should control floating button visibility and badges when rendering', () => {
    expect(cart.floatingCartBtn.classList.contains('visible')).toBe(false);
    expect(cart.navCartLink.style.display).toBe('none');

    cart.addToCart('Groom', 'Gift A', 50);
    cart.renderCart();

    expect(cart.floatingCartBtn.classList.contains('visible')).toBe(true);
    expect(cart.navCartLink.style.display).toBe('inline-block');
    expect(String(cart.floatingCartBadge.innerText)).toBe('1');
    expect(String(cart.navCartBadge.innerText)).toBe('1');

    cart.removeFromCart(cart.items[0].id);
    // removeFromCart triggers renderCart automatically
    expect(cart.floatingCartBtn.classList.contains('visible')).toBe(false);
    expect(cart.navCartLink.style.display).toBe('none');
  });

  it('should sync gift quantities badges correctly and not auto-open cart when adding items', () => {
    // 1. Initial state: no badge
    const itemEl = document.getElementById('groom-item-1');
    expect(itemEl.querySelector('.gift-qty-badge')).toBeNull();

    // 2. Add one item (should NOT auto-open cart)
    cart.addToCart('Groom', 'Orelhinhas de Noivos', 80);
    expect(cart.items.length).toBe(1);
    expect(cart.overlay.classList.contains('active')).toBe(false); // verification that it didn't open the cart!

    // Badge should exist and show "1 no carrinho"
    let badge = itemEl.querySelector('.gift-qty-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('1 no carrinho');

    // 3. Add same item again (quantity is 2)
    cart.addToCart('Groom', 'Orelhinhas de Noivos', 80);
    badge = itemEl.querySelector('.gift-qty-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('2 no carrinho');

    // 4. Remove one item
    cart.removeFromCart(cart.items[0].id);
    badge = itemEl.querySelector('.gift-qty-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('1 no carrinho');

    // 5. Remove the last item
    cart.removeFromCart(cart.items[0].id);
    expect(itemEl.querySelector('.gift-qty-badge')).toBeNull();
  });
});
