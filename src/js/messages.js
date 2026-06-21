import { db, collection, query, orderBy, limit, startAfter, getDocs, onSnapshot } from './firebase.js';

/**
 * MessagesCarousel module — handles fetching, pagination, and display of guest messages in a premium carousel.
 */
export class MessagesCarousel {
  constructor(elements = {}) {
    this.trackEl = elements.trackEl || document.getElementById('messages-carousel-track');
    this.prevBtn = elements.prevBtn || document.getElementById('carousel-prev');
    this.nextBtn = elements.nextBtn || document.getElementById('carousel-next');
    this.dotsEl = elements.dotsEl || document.getElementById('carousel-dots');
    this.loadMoreBtn = elements.loadMoreBtn || document.getElementById('carousel-load-more');
    
    this.messages = [];
    this.realtimeMessages = [];
    this.paginatedMessages = [];
    
    this.realtimeDocs = [];
    this.paginatedDocs = [];
    
    this.currentIndex = 0;
    this.autoplayTimer = null;
    this.autoplayInterval = 6000; // fallback minimum (ms)
    this.isPaused = false;
    this.progressBarEl = null;
    this._currentSlideDuration = 6000;
    this._slideStartTime = 0;
    this._remainingTime = 0;
    this.isAllLoaded = false;
    this.isLoadingMore = false;
  }

  /**
   * Initializes the carousel by setting up event listeners and initiating data loading.
   */
  init() {
    if (!this.trackEl) return;

    this._initProgressBar();
    this.setupListeners();
    this.loadMessages();
    this.startRealtimeListener();
  }

  /**
   * Stub for testing/compatibility.
   */
  loadMessages() {
    console.log('Messages list ready to receive updates.');
  }

  /**
   * Starts listening to the latest 10 public messages in real time.
   */
  startRealtimeListener() {
    try {
      const q = query(
        collection(db, "publicMessages"),
        orderBy("timestamp", "desc"),
        limit(10)
      );

      onSnapshot(q, (snapshot) => {
        this.realtimeMessages = [];
        this.realtimeDocs = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          this.realtimeMessages.push({
            id: doc.id || (data.guestName + "_" + data.timestamp),
            guestName: data.guestName,
            message: data.message,
            timestamp: data.timestamp
          });
          this.realtimeDocs.push(doc);
        });

        // Se retornou menos que 10 documentos na consulta inicial e não carregou paginação anterior,
        // significa que todas as mensagens já foram carregadas.
        if (snapshot.docs.length < 10 && this.paginatedMessages.length === 0) {
          this.isAllLoaded = true;
        } else if (snapshot.docs.length === 10 && this.paginatedMessages.length === 0) {
          this.isAllLoaded = false;
        }

        this.combineAndDeduplicate();
        this.render();
      }, (error) => {
        console.warn('Erro ao sincronizar mensagens públicas:', error);
      });
    } catch (e) {
      console.warn('Firebase não configurado ou offline para carregar mensagens.', e);
    }
  }

  /**
   * Loads the next page of 10 messages from Firestore using cursor-based pagination.
   */
  async loadMoreMessages() {
    if (this.isLoadingMore || this.isAllLoaded) return;

    const cursor = this.paginatedDocs.length > 0
      ? this.paginatedDocs.at(-1)
      : this.realtimeDocs.at(-1);

    if (!cursor) return;

    this.isLoadingMore = true;
    if (this.loadMoreBtn) {
      this.loadMoreBtn.disabled = true;
      this.loadMoreBtn.textContent = 'Carregando...';
    }

    try {
      const q = query(
        collection(db, "publicMessages"),
        orderBy("timestamp", "desc"),
        startAfter(cursor),
        limit(10)
      );

      const snap = await getDocs(q);
      
      if (snap.empty || snap.docs.length < 10) {
        this.isAllLoaded = true;
      }

      snap.forEach((doc) => {
        const data = doc.data();
        this.paginatedMessages.push({
          id: doc.id,
          guestName: data.guestName,
          message: data.message,
          timestamp: data.timestamp
        });
        this.paginatedDocs.push(doc);
      });

      this.combineAndDeduplicate();
      
      // Armazenar índice do slide atual para restaurá-lo após re-renderizar
      const currentMsgId = this.messages[this.currentIndex]?.id;
      
      this.render();
      
      // Restaurar o slide ativo ou ir para o primeiro
      if (currentMsgId) {
        const newIdx = this.messages.findIndex(m => m.id === currentMsgId);
        if (newIdx !== -1) {
          this.goToSlide(newIdx);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mais mensagens:', error);
    } finally {
      this.isLoadingMore = false;
      if (this.loadMoreBtn) {
        this.loadMoreBtn.disabled = false;
        this.loadMoreBtn.textContent = 'Ver mais mensagens';
      }
    }
  }

  combineAndDeduplicate() {
    const allMap = new Map();
    this.realtimeMessages.forEach(m => allMap.set(m.id, m));
    this.paginatedMessages.forEach(m => allMap.set(m.id, m));
    
    const combined = Array.from(allMap.values());
    
    // Sort by timestamp desc first to ensure newer messages are kept or order is consistent
    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const unique = [];
    for (const tx of combined) {
      const isDuplicate = unique.some(u => 
        u.guestName === tx.guestName &&
        u.message === tx.message &&
        Math.abs(new Date(u.timestamp) - new Date(tx.timestamp)) < 5000 // within 5 seconds
      );
      if (!isDuplicate) {
        unique.push(tx);
      }
    }
    
    this.messages = unique;
  }

  /**
   * Compatibility method for central update call (used in tests).
   */
  updateFromSnapshot(snapshot) {
    const rawMessages = [];
    
    if (snapshot && typeof snapshot.forEach === 'function') {
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (
          data.status === 'approved' &&
          data.isPublic === true &&
          data.message &&
          data.message.trim() !== ''
        ) {
          rawMessages.push({
            id: doc.id || (data.guestName + "_" + data.timestamp),
            guestName: data.guestName,
            message: data.message,
            timestamp: data.timestamp
          });
        }
      });
    }

    this.realtimeMessages = rawMessages;
    this.combineAndDeduplicate();
    this.render();
  }

  _createSlideElement(msg, idx) {
    const slide = document.createElement('div');
    slide.className = `carousel-slide${idx === this.currentIndex ? ' active' : ''}`;
    
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
    return slide;
  }

  _createDotElement(idx) {
    const dot = document.createElement('button');
    dot.className = `carousel-dot${idx === this.currentIndex ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Ir para slide ${idx + 1}`);
    dot.addEventListener('click', () => {
      this.goToSlide(idx);
      this.resetAutoplay();
    });
    return dot;
  }

  _toggleSectionVisibility(show) {
    const messagesSection = document.getElementById('messages');
    const competitionSection = document.getElementById('competition');

    if (show) {
      if (messagesSection) {
        messagesSection.classList.remove('u-hidden');
      }
      if (competitionSection) {
        competitionSection.classList.remove('messages-hidden');
      }
    } else {
      if (messagesSection) {
        messagesSection.classList.add('u-hidden');
      }
      if (competitionSection) {
        competitionSection.classList.add('messages-hidden');
      }
    }
  }

  /**
   * Returns true on mobile when there are more than 8 messages,
   * triggering the text counter instead of individual dots.
   */
  _shouldUseCounter() {
    return globalThis.window !== undefined
      && globalThis.window.innerWidth <= 768
      && this.messages.length > 8;
  }

  _renderSlidesAndDots(showControls) {
    this.trackEl.innerHTML = '';
    if (this.dotsEl) this.dotsEl.innerHTML = '';

    this.messages.forEach((msg, idx) => {
      const slide = this._createSlideElement(msg, idx);
      this.trackEl.appendChild(slide);

      // Dots only when not in counter mode
      if (this.dotsEl && showControls && !this._shouldUseCounter()) {
        const dot = this._createDotElement(idx);
        this.dotsEl.appendChild(dot);
      }
    });

    // Render counter when there are too many dots for mobile
    if (this.dotsEl && showControls && this._shouldUseCounter()) {
      const counter = document.createElement('span');
      counter.className = 'carousel-counter';
      counter.textContent = `${this.currentIndex + 1} / ${this.messages.length}`;
      this.dotsEl.appendChild(counter);
    }
  }

  render() {
    if (!this.trackEl) return;

    if (this.messages.length === 0) {
      this._toggleSectionVisibility(false);
      this.trackEl.innerHTML = '';
      this.stopAutoplay();
      if (this.loadMoreBtn) {
        this.loadMoreBtn.classList.add('u-hidden');
      }
      return;
    }

    this._toggleSectionVisibility(true);

    const showControls = this.messages.length > 1;
    const displayVal = showControls ? 'flex' : 'none';
    if (this.prevBtn) this.prevBtn.style.display = displayVal;
    if (this.nextBtn) this.nextBtn.style.display = displayVal;

    this._renderSlidesAndDots(showControls);

    // Ajustar currentIndex se ele estiver fora dos limites após novo render
    if (this.currentIndex >= this.messages.length) {
      this.currentIndex = 0;
    }
    
    if (showControls) {
      this.startAutoplay();
    } else {
      this.stopAutoplay();
    }

    // Gerenciar exibição do botão "Ver mais"
    if (this.loadMoreBtn) {
      if (this.isAllLoaded) {
        this.loadMoreBtn.classList.add('u-hidden');
      } else {
        this.loadMoreBtn.classList.remove('u-hidden');
      }
    }
  }

  /**
   * Event listeners for the control arrows and Load More button.
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

    if (this.loadMoreBtn) {
      this.loadMoreBtn.addEventListener('click', () => {
        this.loadMoreMessages();
        this.resetAutoplay();
      });
    }

    // Pause autoplay on hover (desktop) and touch (mobile)
    const container = this.trackEl?.closest('.messages-carousel-container');
    if (container) {
      container.addEventListener('mouseenter', () => this._pauseAutoplay());
      container.addEventListener('mouseleave', () => this._resumeAutoplay());
      container.addEventListener('touchstart', () => this._pauseAutoplay(), { passive: true });
      container.addEventListener('touchend', () => this._resumeAutoplay(), { passive: true });
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

    // Update text counter if active
    const counter = this.dotsEl?.querySelector('.carousel-counter');
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.messages.length}`;
    }
  }

  /**
   * Calculates reading time in ms based on word count (~180 wpm).
   * Clamped between 5s and 18s.
   */
  _getReadingTime(message) {
    const WORDS_PER_MIN = 180;
    const MIN_MS = 5000;
    const MAX_MS = 18000;
    const wordCount = (message || '').trim().split(/\s+/).length;
    const ms = Math.ceil((wordCount / WORDS_PER_MIN) * 60 * 1000);
    return Math.min(Math.max(ms, MIN_MS), MAX_MS);
  }

  /**
   * Injects the progress bar element into the carousel container.
   */
  _initProgressBar() {
    const container = this.trackEl?.closest('.messages-carousel-container');
    if (!container) return;
    const prog = document.createElement('div');
    prog.className = 'carousel-progress';
    const bar = document.createElement('div');
    bar.className = 'carousel-progress-bar';
    prog.appendChild(bar);
    container.appendChild(prog);
    this.progressBarEl = bar;
  }

  /**
   * Animates the progress bar over the given duration.
   */
  _startProgressBar(duration) {
    if (!this.progressBarEl) return;
    this.progressBarEl.style.transition = 'none';
    this.progressBarEl.style.width = '0%';
    // Force reflow so the reset takes effect before animating
    this.progressBarEl.getBoundingClientRect();
    this.progressBarEl.style.transition = `width ${duration}ms linear`;
    this.progressBarEl.style.width = '100%';
  }

  /**
   * Freezes the progress bar at its current position.
   */
  _pauseProgressBar() {
    if (!this.progressBarEl) return;
    const currentWidth = getComputedStyle(this.progressBarEl).width;
    const parentWidth = this.progressBarEl.parentElement?.offsetWidth || 1;
    const pct = (Number.parseFloat(currentWidth) / parentWidth) * 100;
    this.progressBarEl.style.transition = 'none';
    this.progressBarEl.style.width = `${pct}%`;
  }

  /**
   * Resumes the progress bar animation from its frozen position over the remaining duration.
   */
  _resumeProgressBar(remaining) {
    if (!this.progressBarEl) return;
    this.progressBarEl.getBoundingClientRect();
    this.progressBarEl.style.transition = `width ${remaining}ms linear`;
    this.progressBarEl.style.width = '100%';
  }

  _pauseAutoplay() {
    if (this.isPaused) return;
    this.isPaused = true;
    const elapsed = Date.now() - this._slideStartTime;
    this._remainingTime = Math.max(0, this._currentSlideDuration - elapsed);
    this.stopAutoplay();
    this._pauseProgressBar();
  }

  _resumeAutoplay() {
    if (!this.isPaused) return;
    this.isPaused = false;
    const remaining = this._remainingTime > 0 ? this._remainingTime : this._currentSlideDuration;
    // Update so subsequent pauses compute elapsed against this remaining window
    this._currentSlideDuration = remaining;
    this._remainingTime = 0;
    this._slideStartTime = Date.now();
    this._resumeProgressBar(remaining);
    this.autoplayTimer = setTimeout(() => {
      this.nextSlide();
      this.startAutoplay();
    }, remaining);
  }

  startAutoplay() {
    this.stopAutoplay();
    if (this.messages.length <= 1 || this.isPaused) return;
    const msg = this.messages[this.currentIndex];
    const duration = msg ? this._getReadingTime(msg.message) : this.autoplayInterval;
    this._currentSlideDuration = duration;
    this._remainingTime = 0;
    this._slideStartTime = Date.now();
    this._startProgressBar(duration);
    this.autoplayTimer = setTimeout(() => {
      this.nextSlide();
      this.startAutoplay();
    }, duration);
  }

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  resetAutoplay() {
    this.isPaused = false;
    this.startAutoplay();
  }
}
