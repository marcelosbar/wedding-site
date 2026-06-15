import { db, doc, onSnapshot } from './firebase.js';

/**
 * Scoreboard module — handles real-time score tracking and UI updates.
 */
export class Scoreboard {
  constructor(elements) {
    this.groomPointsBarEl = elements.groomPointsBarEl;
    this.bridePointsBarEl = elements.bridePointsBarEl;
    this.groomFillEl = elements.groomFillEl;
    this.brideFillEl = elements.brideFillEl;
    this.dividerEl = elements.dividerEl;
  }

  initRealtimeScoreboard() {
    try {
      const totalsRef = doc(db, 'scoreboard', 'totals');
      onSnapshot(totalsRef, (docSnap) => {
        let groomScore = 0;
        let brideScore = 0;
        if (docSnap.exists()) {
          const data = docSnap.data();
          groomScore = data.groomTotal || 0;
          brideScore = data.brideTotal || 0;
        }
        this.updateScoreboardUI(groomScore, brideScore);
      }, (error) => {
        console.warn('Erro ao carregar totais do scoreboard:', error);
      });
    } catch (e) {
      console.warn('Erro ao inicializar o listener do scoreboard:', e);
    }
  }

  updateFromSnapshot(snapshot) {
    let groomScore = 0;
    let brideScore = 0;

    if (snapshot && typeof snapshot.forEach === 'function') {
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'rejected') {
          if (data.listChosen === 'Groom') groomScore += data.totalAmount;
          if (data.listChosen === 'Bride') brideScore += data.totalAmount;
        }
      });
    }

    this.updateScoreboardUI(groomScore, brideScore);
  }

  simulateLocalScoreboard(list, amount) {
    let groomPts = Number.parseInt(this.groomPointsBarEl.innerText, 10) || 0;
    let bridePts = Number.parseInt(this.bridePointsBarEl.innerText, 10) || 0;

    if (list === 'Groom') groomPts += amount;
    if (list === 'Bride') bridePts += amount;

    this.updateScoreboardUI(groomPts, bridePts);
  }

  updateScoreboardUI(groomPts, bridePts) {
    if (this.groomPointsBarEl) this.groomPointsBarEl.innerText = `${groomPts} pts`;
    if (this.bridePointsBarEl) this.bridePointsBarEl.innerText = `${bridePts} pts`;

    const total = groomPts + bridePts;
    let groomPercent = 50;
    let bridePercent = 50;

    if (total > 0) {
      groomPercent = (groomPts / total) * 100;
      bridePercent = (bridePts / total) * 100;
    }

    if (this.groomFillEl) this.groomFillEl.style.width = `${groomPercent}%`;
    if (this.brideFillEl) this.brideFillEl.style.width = `${bridePercent}%`;
    if (this.dividerEl) this.dividerEl.style.left = `${groomPercent}%`;

    const heartEl = document.getElementById('global-divider-heart');
    if (heartEl) {
      if (groomPts > bridePts) {
        heartEl.src = 'https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_blue.png?tr=w-50';
      } else if (bridePts > groomPts) {
        heartEl.src = 'https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_yellow.png?tr=w-50';
      } else {
        heartEl.src = 'https://ik.imagekit.io/vfxvr8vqa/wedding-site/heart_red.png?tr=w-50';
      }
    }
  }
}
