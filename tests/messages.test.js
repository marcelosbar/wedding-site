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

import { onSnapshot } from '../src/js/firebase.js';

function createMockElements() {
  document.body.innerHTML = `
    <div id="messages-carousel-track">
      <p class="u-text-center u-text-muted">Carregando...</p>
    </div>
    <button id="carousel-prev"></button>
    <button id="carousel-next"></button>
    <div id="carousel-dots"></div>
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

  it('should fall back to mock messages if snapshot empty or error occurs', () => {
    carousel.init();

    const snapshotCallback = onSnapshot.mock.calls[0][1];
    snapshotCallback([]); // empty list

    expect(carousel.messages.length).toBe(3); // mock messages fallback
    expect(carousel.messages[0].guestName).toBe('Mariana e Thiago');

    // Test error callback
    const errorCallback = onSnapshot.mock.calls[0][2];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorCallback(new Error('Firebase Error'));
    expect(warnSpy).toHaveBeenCalled();
    expect(carousel.messages.length).toBe(3);
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
});
