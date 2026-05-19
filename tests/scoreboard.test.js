/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Scoreboard } from '../src/js/scoreboard.js';

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

// Capture firebase imports to trigger callbacks
import { onSnapshot, query } from '../src/js/firebase.js';

function createMockElements() {
  document.body.innerHTML = `
    <div id="global-groom-points">0 pts</div>
    <div id="global-bride-points">0 pts</div>
    <div id="global-groom-fill" style="width: 50%"></div>
    <div id="global-bride-fill" style="width: 50%"></div>
    <div id="global-progress-divider" style="left: 50%"></div>
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

  it('should set up realtime sync and handle snapshots', () => {
    scoreboard.initRealtimeScoreboard();
    expect(query).toHaveBeenCalled();
    expect(onSnapshot).toHaveBeenCalled();

    // Grab callback passed to onSnapshot
    const snapshotCallback = onSnapshot.mock.calls[0][1];

    // Trigger with mock transactions snapshot
    const mockDocs = [
      { data: () => ({ status: 'approved', listChosen: 'Groom', totalAmount: 150 }) },
      { data: () => ({ status: 'pending', listChosen: 'Bride', totalAmount: 50 }) },
      { data: () => ({ status: 'rejected', listChosen: 'Groom', totalAmount: 500 }) } // Rejected should be ignored!
    ];

    snapshotCallback(mockDocs);

    expect(document.getElementById('global-groom-points').innerText).toBe('150 pts');
    expect(document.getElementById('global-bride-points').innerText).toBe('50 pts');
    expect(document.getElementById('global-groom-fill').style.width).toBe('75%');
    expect(document.getElementById('global-progress-divider').style.left).toBe('75%');
  });

  it('should handle realtime error callback', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    scoreboard.initRealtimeScoreboard();
    
    // Grab error callback passed to onSnapshot (third arg)
    const errorCallback = onSnapshot.mock.calls[0][2];
    errorCallback(new Error('Permission denied'));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Firebase Config'));
    logSpy.mockRestore();
  });
});
