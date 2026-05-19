/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scoreboard } from '../src/js/scoreboard.js';

vi.mock('../src/js/firebase.js', () => ({
  transactionsRef: {},
  onSnapshot: vi.fn(),
  query: vi.fn()
}));

function createMockElements() {
  document.body.innerHTML = `
    <div id="groom-points">0 pts</div>
    <div id="groom-progress"></div>
    <div id="bride-points">0 pts</div>
    <div id="bride-progress"></div>
  `;
  return {
    groomPointsEl: document.getElementById('groom-points'),
    groomProgressEl: document.getElementById('groom-progress'),
    bridePointsEl: document.getElementById('bride-points'),
    brideProgressEl: document.getElementById('bride-progress'),
  };
}

describe('Scoreboard', () => {
  let scoreboard;

  beforeEach(() => {
    scoreboard = new Scoreboard(createMockElements());
  });

  it('should display 0% for both when total is zero', () => {
    scoreboard.updateScoreboardUI(0, 0);
    expect(document.getElementById('groom-points').innerText).toBe('0 pts');
    expect(document.getElementById('groom-progress').style.width).toBe('0%');
  });

  it('should display correct percentages', () => {
    scoreboard.updateScoreboardUI(150, 50);
    expect(document.getElementById('groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('bride-points').innerText).toBe('50 pts');
    expect(document.getElementById('groom-progress').style.width).toBe('75%');
    expect(document.getElementById('bride-progress').style.width).toBe('25%');
  });

  it('should display 50/50 for equal scores', () => {
    scoreboard.updateScoreboardUI(100, 100);
    expect(document.getElementById('groom-progress').style.width).toBe('50%');
    expect(document.getElementById('bride-progress').style.width).toBe('50%');
  });

  it('should simulate local scoreboard correctly', () => {
    scoreboard.simulateLocalScoreboard('Groom', 200);
    expect(document.getElementById('groom-points').innerText).toBe('200 pts');
    expect(document.getElementById('groom-progress').style.width).toBe('100%');

    scoreboard.simulateLocalScoreboard('Bride', 100);
    expect(document.getElementById('bride-points').innerText).toBe('100 pts');
  });
});
