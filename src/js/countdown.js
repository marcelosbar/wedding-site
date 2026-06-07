/**
 * Countdown Module — Calculates and updates the countdown timer to the wedding date.
 */
export class Countdown {
  constructor(targetDateStr, elements) {
    this.targetDate = new Date(targetDateStr);
    this.elements = elements;
    this.intervalId = null;
  }

  /**
   * Initializes the countdown timer interval.
   */
  init() {
    if (this.elements === undefined || this.elements === null ||
        this.elements.days === undefined || this.elements.days === null ||
        this.elements.hours === undefined || this.elements.hours === null ||
        this.elements.minutes === undefined || this.elements.minutes === null ||
        this.elements.seconds === undefined || this.elements.seconds === null) {
      return;
    }
    this.update();
    this.intervalId = globalThis.setInterval(() => this.update(), 1000);
  }

  /**
   * Calculates time difference and updates the UI elements.
   */
  update() {
    const now = new Date();
    const diff = this.targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      this.destroy();
      this.showExpired();
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this.elements.days.textContent = String(days).padStart(2, '0');
    this.elements.hours.textContent = String(hours).padStart(2, '0');
    this.elements.minutes.textContent = String(minutes).padStart(2, '0');
    this.elements.seconds.textContent = String(seconds).padStart(2, '0');
  }

  /**
   * Displays the expired state UI.
   */
  showExpired() {
    if (this.elements.container !== undefined && this.elements.container !== null) {
      this.elements.container.classList.add('expired');
    }
    if (this.elements.grid !== undefined && this.elements.grid !== null) {
      this.elements.grid.classList.add('u-hidden');
    }
    if (this.elements.expiredMessage !== undefined && this.elements.expiredMessage !== null) {
      this.elements.expiredMessage.classList.remove('u-hidden');
    }
  }

  /**
   * Clears the timer interval.
   */
  destroy() {
    if (this.intervalId !== undefined && this.intervalId !== null) {
      globalThis.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
