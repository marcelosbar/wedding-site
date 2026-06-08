/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Countdown } from '../src/js/countdown.js';

describe('Countdown Class', () => {
  let elements;
  let countdown;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="countdown-timer" class="countdown-container">
        <div class="countdown-grid">
          <span id="countdown-days">00</span>
          <span id="countdown-hours">00</span>
          <span id="countdown-minutes">00</span>
          <span id="countdown-seconds">00</span>
        </div>
        <div id="countdown-expired-msg" class="countdown-expired u-hidden">
          ✨ O grande dia chegou! ✨
        </div>
      </div>
    `;

    elements = {
      container: document.getElementById('countdown-timer'),
      grid: document.querySelector('.countdown-grid'),
      days: document.getElementById('countdown-days'),
      hours: document.getElementById('countdown-hours'),
      minutes: document.getElementById('countdown-minutes'),
      seconds: document.getElementById('countdown-seconds'),
      expiredMessage: document.getElementById('countdown-expired-msg')
    };
  });

  afterEach(() => {
    if (countdown !== undefined && countdown !== null) {
      countdown.destroy();
    }
    vi.useRealTimers();
  });

  it('should initialize and update the countdown correctly', () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2); // 2 days in the future
    targetDate.setHours(targetDate.getHours() + 3);
    targetDate.setMinutes(targetDate.getMinutes() + 15);
    targetDate.setSeconds(targetDate.getSeconds() + 30);

    countdown = new Countdown(targetDate.toISOString(), elements);
    countdown.init();

    // Check that elements show the correct values
    expect(elements.days.textContent).toBe('02');
    expect(elements.hours.textContent).toBe('03');
    expect(elements.minutes.textContent).toBe('15');
    expect(elements.seconds.textContent).toBe('30');
  });

  it('should decrement every second', () => {
    const targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() + 10);

    countdown = new Countdown(targetDate.toISOString(), elements);
    countdown.init();

    expect(elements.seconds.textContent).toBe('10');

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);
    expect(elements.seconds.textContent).toBe('09');

    vi.advanceTimersByTime(5000);
    expect(elements.seconds.textContent).toBe('04');
  });

  it('should display expired message when target date has passed initially', () => {
    const targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() - 10); // 10 seconds in the past

    countdown = new Countdown(targetDate.toISOString(), elements);
    countdown.init();

    expect(elements.container.classList.contains('expired')).toBe(true);
    expect(elements.grid.classList.contains('u-hidden')).toBe(true);
    expect(elements.expiredMessage.classList.contains('u-hidden')).toBe(false);
  });

  it('should stop timer and transition to expired state when target date passes', () => {
    const targetDate = new Date();
    targetDate.setSeconds(targetDate.getSeconds() + 2);

    countdown = new Countdown(targetDate.toISOString(), elements);
    countdown.init();

    expect(elements.grid.classList.contains('u-hidden')).toBe(false);

    vi.advanceTimersByTime(2000); // 2 seconds pass

    expect(elements.grid.classList.contains('u-hidden')).toBe(true);
    expect(elements.expiredMessage.classList.contains('u-hidden')).toBe(false);
  });

  it('should handle missing elements or partially missing elements gracefully during init and update', () => {
    const missingElements = {
      days: null,
      hours: null,
      minutes: null,
      seconds: null
    };

    const targetDate = new Date();
    countdown = new Countdown(targetDate.toISOString(), missingElements);
    
    // Should not throw error
    expect(() => countdown.init()).not.toThrow();

    const partialElements = {
      container: null,
      grid: null,
      expiredMessage: null
    };
    const pastDate = new Date();
    pastDate.setSeconds(pastDate.getSeconds() - 10);
    const countdownPast = new Countdown(pastDate.toISOString(), partialElements);
    
    // Should handle expired state with missing elements gracefully
    expect(() => countdownPast.showExpired()).not.toThrow();
  });
});
