/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scoreboard } from '../src/js/scoreboard.js';

function createMockElements() {
  document.body.innerHTML = `
    <div id="global-groom-points">0 pts</div>
    <div id="global-bride-points">0 pts</div>
    <div id="global-groom-fill" style="width: 50%"></div>
    <div id="global-bride-fill" style="width: 50%"></div>
    <div id="global-progress-divider" style="left: 50%"></div>
    <img id="global-divider-heart" src="https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_red.png?tr=w-50" />
  `;
  return {
    groomPointsBarEl: document.getElementById('global-groom-points'),
    bridePointsBarEl: document.getElementById('global-bride-points'),
    groomFillEl: document.getElementById('global-groom-fill'),
    brideFillEl: document.getElementById('global-bride-fill'),
    dividerEl: document.getElementById('global-progress-divider'),
  };
}

describe('Scoreboard', () => {
  let scoreboard;

  beforeEach(() => {
    scoreboard = new Scoreboard(createMockElements());
    vi.clearAllMocks();
  });

  it('should display 50% for both when total is zero', () => {
    scoreboard.updateScoreboardUI(0, 0);
    expect(document.getElementById('global-groom-points').innerText).toBe('0 pts');
    expect(document.getElementById('global-groom-fill').style.width).toBe('50%');
    expect(document.getElementById('global-bride-fill').style.width).toBe('50%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('50%');
  });

  it('should display correct percentages and adjust divider', () => {
    scoreboard.updateScoreboardUI(150, 50);
    expect(document.getElementById('global-groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('global-bride-points').innerText).toBe('50 pts');
    expect(document.getElementById('global-groom-fill').style.width).toBe('75%');
    expect(document.getElementById('global-bride-fill').style.width).toBe('25%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('75%');
  });

  it('should display 50/50 for equal scores', () => {
    scoreboard.updateScoreboardUI(100, 100);
    expect(document.getElementById('global-groom-fill').style.width).toBe('50%');
    expect(document.getElementById('global-bride-fill').style.width).toBe('50%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('50%');
  });

  it('should simulate local scoreboard correctly', () => {
    scoreboard.simulateLocalScoreboard('Groom', 200);
    expect(document.getElementById('global-groom-points').innerText).toBe('200 pts');
    expect(document.getElementById('global-groom-fill').style.width).toBe('100%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('100%');

    scoreboard.simulateLocalScoreboard('Bride', 200);
    expect(document.getElementById('global-bride-points').innerText).toBe('200 pts');
    expect(document.getElementById('global-groom-fill').style.width).toBe('50%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('50%');
  });

  it('should update the scoreboard and UI from a snapshot', () => {
    const mockDocs = [
      { data: () => ({ status: 'approved', listChosen: 'Groom', totalAmount: 150 }) },
      { data: () => ({ status: 'pending', listChosen: 'Bride', totalAmount: 50 }) },
      { data: () => ({ status: 'rejected', listChosen: 'Groom', totalAmount: 500 }) } // Rejected should be ignored!
    ];

    scoreboard.updateFromSnapshot(mockDocs);

    expect(document.getElementById('global-groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('global-bride-points').innerText).toBe('50 pts');
    expect(document.getElementById('global-groom-fill').style.width).toBe('75%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('75%');
  });

  it('should handle empty snapshot gracefully', () => {
    scoreboard.updateFromSnapshot([]);
    expect(document.getElementById('global-groom-points').innerText).toBe('0 pts');
    expect(document.getElementById('global-bride-points').innerText).toBe('0 pts');
  });

  it('should update the heart image based on who is winning', () => {
    const heartEl = document.getElementById('global-divider-heart');
    
    // Groom winning
    scoreboard.updateScoreboardUI(150, 100);
    expect(heartEl.src).toBe('https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_blue.png?tr=w-50');
    
    // Bride winning
    scoreboard.updateScoreboardUI(100, 150);
    expect(heartEl.src).toBe('https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_yellow.png?tr=w-50');
    
    // Tied
    scoreboard.updateScoreboardUI(120, 120);
    expect(heartEl.src).toBe('https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_red.png?tr=w-50');
  });
});
