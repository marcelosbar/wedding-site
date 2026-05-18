/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeddingApp } from './main.js';

// Mock Firebase functions because main.js imports firebase.js
vi.mock('./firebase.js', () => ({
  transactionsRef: {},
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn()
}));

// Mock qrcode
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn()
  }
}));

describe('WeddingApp Cart & Scoring Logic', () => {
  let app;

  beforeEach(() => {
    // Setup a minimal DOM for the constructor and methods
    document.body.innerHTML = `
      <div id="cart-overlay"></div>
      <div id="cart-view"></div>
      <div id="pix-view"></div>
      <div id="success-view"></div>
      <div id="cart-items-container"></div>
      <div id="cart-total-value"></div>
      
      <div id="groom-points">0 pts</div>
      <div id="groom-progress"></div>
      <div id="bride-points">0 pts</div>
      <div id="bride-progress"></div>
    `;

    // Instantiate app
    app = new WeddingApp();
  });

  it('should initialize with an empty cart', () => {
    expect(app.cart.length).toBe(0);
    expect(app.currentList).toBeNull();
  });

  it('should add an item to the cart and set the current list', () => {
    app.addToCart('Groom', 'Test Gift', 100);
    expect(app.cart.length).toBe(1);
    expect(app.currentList).toBe('Groom');
    expect(app.cart[0].name).toBe('Test Gift');
    expect(app.cart[0].price).toBe(100);
  });

  it('should prevent mixing items from Groom and Bride', () => {
    // Mock alert
    const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    
    app.addToCart('Groom', 'Test Gift 1', 100);
    app.addToCart('Bride', 'Test Gift 2', 200);

    // Cart should only have the first item
    expect(app.cart.length).toBe(1);
    expect(app.cart[0].name).toBe('Test Gift 1');
    expect(alertMock).toHaveBeenCalledWith('Você não pode misturar presentes do Noivo e da Noiva. Conclua a contribuição atual primeiro!');
    
    alertMock.mockRestore();
  });

  it('should remove an item from the cart', () => {
    app.addToCart('Groom', 'Test Gift 1', 100);
    const itemId = app.cart[0].id; // We need the generated ID
    app.removeFromCart(itemId);
    
    expect(app.cart.length).toBe(0);
    expect(app.currentList).toBeNull();
  });

  it('should update local scoreboard points correctly', () => {
    app.simulateLocalScoreboard('Groom', 150);
    expect(document.getElementById('groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('bride-points').innerText).toBe('0 pts');
    // Groom should be 100% since total is 150
    expect(document.getElementById('groom-progress').style.width).toBe('100%');
    expect(document.getElementById('bride-progress').style.width).toBe('0%');

    app.simulateLocalScoreboard('Bride', 50);
    expect(document.getElementById('groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('bride-points').innerText).toBe('50 pts');
    // Groom = 75%, Bride = 25% (total 200)
    expect(document.getElementById('groom-progress').style.width).toBe('75%');
    expect(document.getElementById('bride-progress').style.width).toBe('25%');
  });
});
