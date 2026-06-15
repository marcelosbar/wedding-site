/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessagesCarousel } from '../src/js/messages.js';

const mockOnSnapshot = vi.fn();
const mockGetDocs = vi.fn();
const mockQuery = vi.fn();

vi.mock('../src/js/firebase.js', () => {
  return {
    db: {},
    collection: vi.fn(),
    query: (...args) => mockQuery(...args),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    getDocs: (...args) => mockGetDocs(...args),
    onSnapshot: (...args) => mockOnSnapshot(...args),
  };
});

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
      <button id="carousel-load-more"></button>
    </section>
  `;
  return {
    trackEl: document.getElementById('messages-carousel-track'),
    prevBtn: document.getElementById('carousel-prev'),
    nextBtn: document.getElementById('carousel-next'),
    dotsEl: document.getElementById('carousel-dots'),
    loadMoreBtn: document.getElementById('carousel-load-more')
  };
}

describe('MessagesCarousel', () => {
  let elements;
  let carousel;

  beforeEach(() => {
    elements = createMockElements();
    carousel = new MessagesCarousel(elements);
    mockOnSnapshot.mockReset();
    mockGetDocs.mockReset();
    mockQuery.mockReset();
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

    carousel.updateFromSnapshot(mockDocs);

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

  it('should clear messages and hide section if snapshot is empty', () => {
    carousel.init();
    carousel.updateFromSnapshot([]);

    expect(carousel.messages.length).toBe(0);
    const section = document.getElementById('messages');
    expect(section.classList.contains('u-hidden')).toBe(true);
    expect(document.getElementById('competition').classList.contains('messages-hidden')).toBe(true);
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
    carousel.updateFromSnapshot([]);

    expect(carousel.messages.length).toBe(0);
    
    // The messages section should have class 'u-hidden'
    const section = document.getElementById('messages');
    expect(section.classList.contains('u-hidden')).toBe(true);
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

  describe('Pagination & Load More', () => {
    it('should show/hide loadMoreBtn based on isAllLoaded', () => {
      carousel.messages = [
        { id: '1', guestName: 'A', message: 'Msg A', timestamp: '2026-05-31T12:00:00Z' }
      ];
      
      // Case 1: isAllLoaded is false
      carousel.isAllLoaded = false;
      carousel.render();
      expect(elements.loadMoreBtn.classList.contains('u-hidden')).toBe(false);

      // Case 2: isAllLoaded is true
      carousel.isAllLoaded = true;
      carousel.render();
      expect(elements.loadMoreBtn.classList.contains('u-hidden')).toBe(true);
    });

    it('should reset currentIndex to 0 if it is out of bounds on render', () => {
      carousel.messages = [
        { id: '1', guestName: 'A', message: 'Msg A', timestamp: '2026-05-31T12:00:00Z' }
      ];
      carousel.currentIndex = 5; // Out of bounds
      carousel.render();
      expect(carousel.currentIndex).toBe(0);
    });

    it('should trigger loadMoreMessages and resetAutoplay when loadMoreBtn is clicked', () => {
      const loadMoreSpy = vi.spyOn(carousel, 'loadMoreMessages').mockImplementation(() => Promise.resolve());
      const resetSpy = vi.spyOn(carousel, 'resetAutoplay').mockImplementation(() => {});

      carousel.setupListeners();
      elements.loadMoreBtn.click();

      expect(loadMoreSpy).toHaveBeenCalled();
      expect(resetSpy).toHaveBeenCalled();

      loadMoreSpy.mockRestore();
      resetSpy.mockRestore();
    });

    it('should load more messages using cursor-based pagination', async () => {
      const mockDoc1 = { id: 'doc-1', data: () => ({ guestName: 'Jose', message: 'Hi', timestamp: '2026-05-31T12:00:00Z' }) };
      const mockDoc2 = { id: 'doc-2', data: () => ({ guestName: 'Maria', message: 'Hello', timestamp: '2026-05-31T12:01:00Z' }) };
      
      // Populate docs to simulate existing state
      carousel.realtimeDocs = [mockDoc1];
      carousel.paginatedDocs = [];
      carousel.isAllLoaded = false;
      carousel.isLoadingMore = false;

      // Mock getDocs to return a snapshot with 10 documents (not all loaded)
      const mockDocs = Array(10).fill(null).map((_, i) => ({
        id: `p-doc-${i}`,
        data: () => ({
          guestName: `Guest ${i}`,
          message: `Msg ${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString()
        })
      }));
      
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
        forEach: (cb) => mockDocs.forEach(cb)
      });

      await carousel.loadMoreMessages();

      expect(carousel.isLoadingMore).toBe(false);
      expect(mockGetDocs).toHaveBeenCalled();
      expect(carousel.isAllLoaded).toBe(false); // Since size was exactly 10
      expect(carousel.paginatedMessages.length).toBe(10);
      expect(carousel.paginatedDocs.length).toBe(10);
      
      // Next call with less than 10 docs should set isAllLoaded to true
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc2],
        forEach: (cb) => [mockDoc2].forEach(cb)
      });
      
      await carousel.loadMoreMessages();
      expect(carousel.isAllLoaded).toBe(true);
    });

    it('should handle errors in loadMoreMessages gracefully', async () => {
      const mockDoc1 = { id: 'doc-1', data: () => ({ guestName: 'Jose', message: 'Hi', timestamp: '2026-05-31T12:00:00Z' }) };
      carousel.realtimeDocs = [mockDoc1];
      
      mockGetDocs.mockRejectedValueOnce(new Error('Firebase error'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await carousel.loadMoreMessages();

      expect(carousel.isLoadingMore).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao carregar mais mensagens'), expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('should handle loadMessages snapshot updates', () => {
      carousel.init();
      expect(mockOnSnapshot).toHaveBeenCalled();

      const onSnapshotCallback = mockOnSnapshot.mock.calls[0][1];
      
      const mockSnapDocs = [
        { id: '1', data: () => ({ status: 'approved', isPublic: true, message: 'Message 1', guestName: 'User 1', timestamp: '2026-05-31T12:00:00Z' }) }
      ];
      
      onSnapshotCallback({
        docs: mockSnapDocs,
        forEach: (cb) => mockSnapDocs.forEach(cb)
      });

      expect(carousel.realtimeMessages.length).toBe(1);
      expect(carousel.realtimeMessages[0].guestName).toBe('User 1');
      expect(carousel.messages[0].guestName).toBe('User 1');
    });
  });
});
