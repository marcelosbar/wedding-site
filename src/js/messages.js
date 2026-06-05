import { transactionsRef, onSnapshot, query } from './firebase.js';

/**
 * MessagesCarousel module — handles fetching, deduplication, and display of guest messages in a premium carousel.
 */
export class MessagesCarousel {
  constructor(elements = {}) {
    this.trackEl = elements.trackEl || document.getElementById('messages-carousel-track');
    this.prevBtn = elements.prevBtn || document.getElementById('carousel-prev');
    this.nextBtn = elements.nextBtn || document.getElementById('carousel-next');
    this.dotsEl = elements.dotsEl || document.getElementById('carousel-dots');
    
    this.messages = [];
    this.currentIndex = 0;
    this.autoplayTimer = null;
    this.autoplayInterval = 6000; // 6 seconds
  }

  /**
   * Initializes the carousel by setting up event listeners and initiating data loading.
   */
  init() {
    if (!this.trackEl) return;

    this.setupListeners();
    this.loadMessages();
  }

  /**
   * Subscribes to transaction collection snapshots.
   */
  loadMessages() {
    try {
      const q = query(transactionsRef);
      onSnapshot(q, (snapshot) => {
        const rawMessages = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Select only approved, public transactions with non-empty messages
          if (
            data.status === 'approved' &&
            data.isPublic === true &&
            data.message &&
            data.message.trim() !== ''
          ) {
            rawMessages.push({
              guestName: data.guestName,
              message: data.message,
              timestamp: data.timestamp
            });
          }
        });

        // Deduplicate cart splits
        this.messages = this.deduplicateMessages(rawMessages);
        
        // Sort by timestamp (newest first)
        this.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        this.render();
      }, (error) => {
        console.warn('Firebase error fetching messages.', error);
        this.messages = [];
        this.render();
      });
    } catch (e) {
      console.warn('Firebase not configured.', e);
      this.messages = [];
      this.render();
    }
  }

  /**
   * Deduplicates messages that were split across multiple lists (Groom/Bride)
   * in the same checkout session (matching guest name, message content, and close timestamps).
   */
  deduplicateMessages(rawMessages) {
    const unique = [];
    for (const tx of rawMessages) {
      const isDuplicate = unique.some(u => 
        u.guestName === tx.guestName &&
        u.message === tx.message &&
        Math.abs(new Date(u.timestamp) - new Date(tx.timestamp)) < 5000 // within 5 seconds
      );
      if (!isDuplicate) {
        unique.push(tx);
      }
    }
    return unique;
  }

  /**
   * Dynamic rendering of slides and dots in the carousel container.
   */
  render() {
    if (!this.trackEl) return;

    const messagesSection = document.getElementById('messages');
    const competitionSection = document.getElementById('competition');

    if (this.messages.length === 0) {
      if (messagesSection) {
        messagesSection.classList.add('u-hidden');
      }
      if (competitionSection) {
        competitionSection.classList.add('messages-hidden');
      }
      this.trackEl.innerHTML = '';
      this.stopAutoplay();
      return;
    }

    if (messagesSection) {
      messagesSection.classList.remove('u-hidden');
    }
    if (competitionSection) {
      competitionSection.classList.remove('messages-hidden');
    }

    this.trackEl.innerHTML = '';
    if (this.dotsEl) this.dotsEl.innerHTML = '';

    const showControls = this.messages.length > 1;
    if (this.prevBtn) this.prevBtn.style.display = showControls ? 'flex' : 'none';
    if (this.nextBtn) this.nextBtn.style.display = showControls ? 'flex' : 'none';

    this.messages.forEach((msg, idx) => {
      // Create slide elements
      const slide = document.createElement('div');
      slide.className = `carousel-slide${idx === 0 ? ' active' : ''}`;
      
      const textEl = document.createElement('p');
      const msgLen = msg.message.length;
      let lengthClass = 'length-short';
      if (msgLen > 280) {
        lengthClass = 'length-long';
      } else if (msgLen > 120) {
        lengthClass = 'length-medium';
      }
      textEl.className = `message-text ${lengthClass}`;
      textEl.textContent = msg.message;
      
      const authorEl = document.createElement('p');
      authorEl.className = 'message-author';
      authorEl.textContent = msg.guestName;

      slide.appendChild(textEl);
      slide.appendChild(authorEl);
      this.trackEl.appendChild(slide);

      // Create dots
      if (this.dotsEl && showControls) {
        const dot = document.createElement('button');
        dot.className = `carousel-dot${idx === 0 ? ' active' : ''}`;
        dot.setAttribute('aria-label', `Ir para slide ${idx + 1}`);
        dot.addEventListener('click', () => {
          this.goToSlide(idx);
          this.resetAutoplay();
        });
        this.dotsEl.appendChild(dot);
      }
    });

    this.currentIndex = 0;
    
    if (showControls) {
      this.startAutoplay();
    } else {
      this.stopAutoplay();
    }
  }

  /**
   * Event listeners for the control arrows.
   */
  setupListeners() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.prevSlide();
        this.resetAutoplay();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.nextSlide();
        this.resetAutoplay();
      });
    }
  }

  prevSlide() {
    if (this.messages.length <= 1) return;
    const nextIdx = (this.currentIndex - 1 + this.messages.length) % this.messages.length;
    this.goToSlide(nextIdx);
  }

  nextSlide() {
    if (this.messages.length <= 1) return;
    const nextIdx = (this.currentIndex + 1) % this.messages.length;
    this.goToSlide(nextIdx);
  }

  goToSlide(index) {
    if (this.messages.length <= 1 || index < 0 || index >= this.messages.length) return;

    const slides = this.trackEl.querySelectorAll('.carousel-slide');
    const dots = this.dotsEl ? this.dotsEl.querySelectorAll('.carousel-dot') : [];

    if (slides[this.currentIndex]) {
      slides[this.currentIndex].classList.remove('active');
    }
    if (dots[this.currentIndex]) {
      dots[this.currentIndex].classList.remove('active');
    }

    this.currentIndex = index;

    if (slides[this.currentIndex]) {
      slides[this.currentIndex].classList.add('active');
    }
    if (dots[this.currentIndex]) {
      dots[this.currentIndex].classList.add('active');
    }
  }

  startAutoplay() {
    this.stopAutoplay();
    if (this.messages.length <= 1) return;
    this.autoplayTimer = setInterval(() => {
      this.nextSlide();
    }, this.autoplayInterval);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  resetAutoplay() {
    this.stopAutoplay();
    this.startAutoplay();
  }
}
