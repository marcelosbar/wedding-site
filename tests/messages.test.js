/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessagesCarousel } from '../src/js/messages.js';

// Mock the firebase imports BEFORE importing anything that might use them
vi.mock('../src/js/firebase.js', () => {
  globalThis.__mockOnSnapshot = globalThis.__mockOnSnapshot || vi.fn();
  globalThis.__mockQuery = globalThis.__mockQuery || vi.fn();
  return {
    transactionsRef: {},
    onSnapshot: globalThis.__mockOnSnapshot,
    query: globalThis.__mockQuery
  };
});

import { onSnapshot, query } from '../src/js/firebase.js';

function createMockElements() {
  document.body.innerHTML = `
    <section id="competition"></section>
    <section id="messages">
      <div id="messages-carousel-track">
        <p class="u-text-center u-text-muted">Carregando...</p>
      </div>
      <button id="carousel-prev"></button>
      <button id="carousel-next"></button>
      <div id="carousel-dots"></div>
    </section>
  `;
  return {
    trackEl: document.getElementById('messages-carousel-track'),
    prevBtn: document.getElementById('carousel-prev'),
    nextBtn: document.getElementById('carousel-next'),
    dotsEl: document.getElementById('carousel-dots')
  };
}

describe('MessagesCarousel', () => {
  let elements;
  let carousel;

  beforeEach(() => {
    elements = createMockElements();
    carousel = new MessagesCarousel(elements);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and attach listeners', () => {
    const setupSpy = vi.spyOn(carousel, 'setupListeners');
    const loadSpy = vi.spyOn(carousel, 'loadMessages');

    carousel.init();

    expect(setupSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should load, filter, sort and deduplicate messages from snapshot', () => {
    carousel.init();

    const snapshotCallback = onSnapshot.mock.calls[0][1];

    const mockDocs = [
      // 1. Valid groom item
      {
        data: () => ({
          status: 'approved',
          isPublic: true,
          message: 'Parabens casal!',
          guestName: 'Jose',
          timestamp: '2026-05-31T12:00:00.000Z'
        })
      },
      // 2. Split bride item (same guest, same message, slightly different timestamp within 5s) - should be deduplicated
      {
        data: () => ({
          status: 'approved',
          isPublic: true,
          message: 'Parabens casal!',
          guestName: 'Jose',
          timestamp: '2026-05-31T12:00:01.000Z'
        })
      },
      // 3. Status is not approved (pending) - should be ignored
      {
        data: () => ({
          status: 'pending',
          isPublic: true,
          message: 'Ignorar por favor',
          guestName: 'Maria',
          timestamp: '2026-05-31T12:05:00.000Z'
        })
      },
      // 4. Message is not public - should be ignored
      {
        data: () => ({
          status: 'approved',
          isPublic: false,
          message: 'Mensagem privada',
          guestName: 'Ana',
          timestamp: '2026-05-31T12:06:00.000Z'
        })
      },
      // 5. Message is empty - should be ignored
      {
        data: () => ({
          status: 'approved',
          isPublic: true,
          message: '   ',
          guestName: 'Carlos',
          timestamp: '2026-05-31T12:07:00.000Z'
        })
      },
      // 6. Valid other message (newer)
      {
        data: () => ({
          status: 'approved',
          isPublic: true,
          message: 'Outra mensagem bacana!',
          guestName: 'Fernanda',
          timestamp: '2026-05-31T12:10:00.000Z'
        })
      }
    ];

    snapshotCallback(mockDocs);

    // Jose (12:00:00) and Fernanda (12:10:00) are valid and unique.
    // Order should be newest first: Fernanda, then Jose.
    expect(carousel.messages.length).toBe(2);
    expect(carousel.messages[0].guestName).toBe('Fernanda');
    expect(carousel.messages[1].guestName).toBe('Jose');
    expect(document.getElementById('competition').classList.contains('messages-hidden')).toBe(false);

    // Verify DOM rendering
    const slides = elements.trackEl.querySelectorAll('.carousel-slide');
    expect(slides.length).toBe(2);
    expect(slides[0].querySelector('.message-text').textContent).toBe('Outra mensagem bacana!');
    expect(slides[0].querySelector('.message-author').textContent).toBe('Fernanda');
    expect(slides[0].classList.contains('active')).toBe(true);

    expect(slides[1].querySelector('.message-text').textContent).toBe('Parabens casal!');
    expect(slides[1].classList.contains('active')).toBe(false);

    // Verify dots rendering
    const dots = elements.dotsEl.querySelectorAll('.carousel-dot');
    expect(dots.length).toBe(2);
    expect(dots[0].classList.contains('active')).toBe(true);
  });

  it('should clear messages and hide section if snapshot is empty or error occurs', () => {
    carousel.init();

    const snapshotCallback = onSnapshot.mock.calls[0][1];
    snapshotCallback([]); // empty list

    expect(carousel.messages.length).toBe(0);
    const section = document.getElementById('messages');
    expect(section.classList.contains('u-hidden')).toBe(true);
    expect(document.getElementById('competition').classList.contains('messages-hidden')).toBe(true);

    // Test error callback
    const errorCallback = onSnapshot.mock.calls[0][2];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorCallback(new Error('Firebase Error'));
    expect(warnSpy).toHaveBeenCalled();
    expect(carousel.messages.length).toBe(0);
    expect(section.classList.contains('u-hidden')).toBe(true);
    expect(document.getElementById('competition').classList.contains('messages-hidden')).toBe(true);
    warnSpy.mockRestore();
  });

  it('should navigate through slides correctly using next and prev buttons', () => {
    carousel.setupListeners();
    carousel.messages = [
      { guestName: 'A', message: 'Msg A', timestamp: '2026-05-31T12:00:00Z' },
      { guestName: 'B', message: 'Msg B', timestamp: '2026-05-31T12:01:00Z' },
      { guestName: 'C', message: 'Msg C', timestamp: '2026-05-31T12:02:00Z' }
    ];
    carousel.render();

    // Init state: slide 0 active
    expect(carousel.currentIndex).toBe(0);

    // Click next
    elements.nextBtn.click();
    expect(carousel.currentIndex).toBe(1);

    const slides = elements.trackEl.querySelectorAll('.carousel-slide');
    const dots = elements.dotsEl.querySelectorAll('.carousel-dot');
    expect(slides[1].classList.contains('active')).toBe(true);
    expect(dots[1].classList.contains('active')).toBe(true);

    // Click next again
    elements.nextBtn.click();
    expect(carousel.currentIndex).toBe(2);

    // Click next again -> should wrap to 0
    elements.nextBtn.click();
    expect(carousel.currentIndex).toBe(0);

    // Click prev -> should wrap to 2
    elements.prevBtn.click();
    expect(carousel.currentIndex).toBe(2);

    // Click dot 1
    dots[1].click();
    expect(carousel.currentIndex).toBe(1);
  });

  it('should manage autoplay timer and reset it when user interacts', () => {
    vi.useFakeTimers();
    carousel.setupListeners();
    
    carousel.messages = [
      { guestName: 'A', message: 'Msg A', timestamp: '2026-05-31T12:00:00Z' },
      { guestName: 'B', message: 'Msg B', timestamp: '2026-05-31T12:01:00Z' }
    ];
    carousel.render();

    expect(carousel.currentIndex).toBe(0);

    // Advance time by 6 seconds
    vi.advanceTimersByTime(6000);
    expect(carousel.currentIndex).toBe(1);

    // Advance time again by 6 seconds
    vi.advanceTimersByTime(6000);
    expect(carousel.currentIndex).toBe(0);

    // User interaction (e.g. click dot/button) should reset the timer
    const resetSpy = vi.spyOn(carousel, 'resetAutoplay');
    elements.nextBtn.click();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('should assign correct font size classes based on message length', () => {
    carousel.messages = [
      { guestName: 'Short', message: 'Hello!', timestamp: '2026-05-31T12:00:00Z' },
      { guestName: 'Medium', message: 'A'.repeat(150), timestamp: '2026-05-31T12:01:00Z' },
      { guestName: 'Long', message: 'B'.repeat(300), timestamp: '2026-05-31T12:02:00Z' }
    ];
    carousel.render();

    const slides = elements.trackEl.querySelectorAll('.carousel-slide');
    expect(slides[0].querySelector('.message-text').classList.contains('length-short')).toBe(true);
    expect(slides[1].querySelector('.message-text').classList.contains('length-medium')).toBe(true);
    expect(slides[2].querySelector('.message-text').classList.contains('length-long')).toBe(true);
  });

  it('should hide the messages section if no approved messages exist', () => {
    carousel.init();

    const snapshotCallback = onSnapshot.mock.calls[0][1];
    snapshotCallback([]); // empty list

    expect(carousel.messages.length).toBe(0);
    
    // The messages section should have class 'u-hidden'
    const section = document.getElementById('messages');
    expect(section.classList.contains('u-hidden')).toBe(true);
  });

  it('should handle synchronous database errors during initialization', () => {
    query.mockImplementationOnce(() => {
      throw new Error('Sync Query Error');
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    carousel.init();

    expect(carousel.messages.length).toBe(0);
    const section = document.getElementById('messages');
    expect(section.classList.contains('u-hidden')).toBe(true);
    expect(document.getElementById('competition').classList.contains('messages-hidden')).toBe(true);

    warnSpy.mockRestore();
  });

  it('should render correctly and disable controls if there is only 1 message', () => {
    carousel.messages = [
      { guestName: 'Single', message: 'One message', timestamp: '2026-05-31T12:00:00Z' }
    ];
    carousel.render();

    expect(carousel.currentIndex).toBe(0);
    const slides = elements.trackEl.querySelectorAll('.carousel-slide');
    expect(slides.length).toBe(1);

    expect(elements.prevBtn.style.display).toBe('none');
    expect(elements.nextBtn.style.display).toBe('none');
    const dots = elements.dotsEl.querySelectorAll('.carousel-dot');
    expect(dots.length).toBe(0);
  });

  it('should handle edge cases and missing elements gracefully', () => {
    // 1. Missing elements
    const emptyCarousel = new MessagesCarousel();
    expect(() => emptyCarousel.init()).not.toThrow();
    expect(() => emptyCarousel.render()).not.toThrow();
    expect(() => emptyCarousel.setupListeners()).not.toThrow();

    // 2. goToSlide, prevSlide, nextSlide, startAutoplay with <= 1 messages
    const singleCarousel = new MessagesCarousel(elements);
    singleCarousel.messages = [{ guestName: 'A', message: 'Msg', timestamp: '2026-05-31T12:00:00Z' }];
    expect(() => singleCarousel.prevSlide()).not.toThrow();
    expect(() => singleCarousel.nextSlide()).not.toThrow();
    expect(() => singleCarousel.goToSlide(0)).not.toThrow();
    expect(() => singleCarousel.goToSlide(1)).not.toThrow();
    expect(() => singleCarousel.goToSlide(-1)).not.toThrow();
    expect(() => singleCarousel.startAutoplay()).not.toThrow();

    // 3. Carousel with multiple messages but invalid index in goToSlide
    carousel.messages = [
      { guestName: 'A', message: 'Msg A', timestamp: '2026-05-31T12:00:00Z' },
      { guestName: 'B', message: 'Msg B', timestamp: '2026-05-31T12:01:00Z' }
    ];
    carousel.render();
    carousel.goToSlide(-1);
    expect(carousel.currentIndex).toBe(0);
    carousel.goToSlide(2);
    expect(carousel.currentIndex).toBe(0);

    // 4. Missing optional DOM nodes like competition or messages section
    const msgSec = document.getElementById('messages');
    const compSec = document.getElementById('competition');
    if (msgSec) msgSec.remove();
    if (compSec) compSec.remove();
    carousel.messages = [];
    expect(() => carousel.render()).not.toThrow();
  });
});
