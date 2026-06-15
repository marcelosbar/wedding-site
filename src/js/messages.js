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
    this.autoplayInterval = 6000; // 6 seconds
    this.isAllLoaded = false;
    this.isLoadingMore = false;
  }

  /**
   * Initializes the carousel by setting up event listeners and initiating data loading.
   */
  init() {
    if (!this.trackEl) return;

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

  _renderSlidesAndDots(showControls) {
    this.trackEl.innerHTML = '';
    if (this.dotsEl) this.dotsEl.innerHTML = '';

    this.messages.forEach((msg, idx) => {
      const slide = this._createSlideElement(msg, idx);
      this.trackEl.appendChild(slide);

      // Create dots
      if (this.dotsEl && showControls) {
        const dot = this._createDotElement(idx);
        this.dotsEl.appendChild(dot);
      }
    });
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
