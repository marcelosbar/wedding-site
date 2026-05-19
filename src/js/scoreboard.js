import { transactionsRef, onSnapshot, query } from './firebase.js';

/**
 * Scoreboard module — handles real-time score tracking and UI updates.
 */
export class Scoreboard {
  constructor(elements) {
    this.groomPointsEl = elements.groomPointsEl;
    this.groomProgressEl = elements.groomProgressEl;
    this.bridePointsEl = elements.bridePointsEl;
    this.brideProgressEl = elements.brideProgressEl;
  }

  initRealtimeScoreboard() {
    let groomScore = 0;
    let brideScore = 0;

    try {
      const q = query(transactionsRef);
      onSnapshot(q, (snapshot) => {
        groomScore = 0;
        brideScore = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status !== 'rejected') {
            if (data.listChosen === 'Groom') groomScore += data.totalAmount;
            if (data.listChosen === 'Bride') brideScore += data.totalAmount;
          }
        });

        this.updateScoreboardUI(groomScore, brideScore);
      }, () => {
        console.log('Waiting for proper Firebase Config to enable real-time sync.');
      });
    } catch (e) {
      console.warn('Firebase not configured correctly for realtime sync.', e);
    }
  }

  simulateLocalScoreboard(list, amount) {
    let groomPts = Number.parseInt(this.groomPointsEl.innerText, 10) || 0;
    let bridePts = Number.parseInt(this.bridePointsEl.innerText, 10) || 0;

    if (list === 'Groom') groomPts += amount;
    if (list === 'Bride') bridePts += amount;

    this.updateScoreboardUI(groomPts, bridePts);
  }

  updateScoreboardUI(groomPts, bridePts) {
    this.groomPointsEl.innerText = `${groomPts} pts`;
    this.bridePointsEl.innerText = `${bridePts} pts`;

    const total = groomPts + bridePts;
    const groomPercent = total > 0 ? (groomPts / total) * 100 : 0;
    const bridePercent = total > 0 ? (bridePts / total) * 100 : 0;

    this.groomProgressEl.style.width = `${groomPercent}%`;
    this.brideProgressEl.style.width = `${bridePercent}%`;
  }
}
