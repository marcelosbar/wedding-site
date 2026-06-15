import { db, onSnapshot, query, auth, googleProvider } from './firebase.js';
import { doc, updateDoc, collection, getDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { escapeHTML } from './utils.js';

class AdminApp {
  loggedIn = false;
  transactions = [];

  async isAdmin(email) {
    try {
      const adminDoc = await getDoc(doc(db, 'config', 'admins'));
      if (adminDoc.exists()) {
        const emails = adminDoc.data().emails || [];
        return emails.includes(email);
      }
      return false;
    } catch (e) {
      console.error('Error checking admin status', e);
      return false;
    }
  }

  constructor() {
    this.loginScreen = document.getElementById('login-screen');
    this.dashboardScreen = document.getElementById('dashboard-screen');
    this.tableBody = document.getElementById('admin-table-body');

    this.messageModal = document.getElementById('message-modal');
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalCloseBtn = document.getElementById('modal-close-btn');

    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', () => this.closeModal());
    }

    if (this.tableBody) {
      this.tableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('js-btn-view-modal') || target.closest('.js-cell-view-modal')) {
          const tr = target.closest('tr');
          if (tr) {
            const transactionId = tr.dataset.id;
            const transaction = this.transactions.find(t => t.id === transactionId);
            if (transaction) {
              this.showModal(transaction);
            }
          }
        }
      });
    }

    const loginBtn = document.getElementById('admin-login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.login());
    }

    const logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Mudar UI automaticamente quando o login mudar
    if (auth) {
      onAuthStateChanged(auth, async (user) => {
        if (user && await this.isAdmin(user.email)) {
          this.loggedIn = true;
          this.loginScreen.classList.add('u-hidden');
          this.loginScreen.style.display = 'none';
          this.dashboardScreen.classList.remove('u-hidden');
          this.dashboardScreen.style.display = 'block';
          this.fetchData();
        } else {
          if (user) {
            alert('Acesso negado. Este e-mail não tem permissão de administrador.');
            signOut(auth);
          }
          this.loggedIn = false;
          this.loginScreen.classList.remove('u-hidden');
          this.loginScreen.style.display = 'flex';
          this.dashboardScreen.classList.add('u-hidden');
          this.dashboardScreen.style.display = 'none';
        }
      });
    } else {
      console.warn("Firebase Auth desabilitado ou não configurado.");
    }
  }

  async login() {
    if (!auth) {
      alert("Firebase Auth não está configurado localmente. Adicione as chaves no arquivo .env.");
      return;
    }
    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login com Google", error);
      alert("Falha ao fazer login com o Google.");
    }
  }

  async logout() {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar", error);
    }
  }

  fetchData() {
    try {
      const q = query(collection(db, "transactions"));
      onSnapshot(q, (snapshot) => {
        this.transactions = [];
        snapshot.forEach((doc) => {
          this.transactions.push({ id: doc.id, ...doc.data() });
        });
        // Sort by newest first
        this.transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.renderTable();
      }, (err) => {
        console.error("Firebase fetch error", err);
        alert("Erro ao conectar com Firebase. Verifique se as regras e configurações estão corretas.");
      });
    } catch (e) {
      console.warn("Firebase not initialized yet.", e);
      this.tableBody.innerHTML = `<tr><td colspan="6" class="u-text-center">Firebase não configurado. Adicione a config em firebase.js</td></tr>`;
    }
  }

  showModal(transaction) {
    if (!this.messageModal) return;

    const guestNameEl = document.getElementById('modal-guest-name');
    const amountEl = document.getElementById('modal-amount');
    const listEl = document.getElementById('modal-list');
    const privacyEl = document.getElementById('modal-privacy');
    const textEl = document.getElementById('modal-message-text');
    const giftsListEl = document.getElementById('modal-gifts-list');

    if (guestNameEl) guestNameEl.innerText = transaction.guestName;
    if (amountEl) amountEl.innerText = `R$ ${transaction.totalAmount.toFixed(2)}`;
    if (listEl) listEl.innerText = transaction.listChosen === 'Groom' ? 'Noivo' : 'Noiva';
    if (privacyEl) privacyEl.innerText = transaction.isPublic ? 'Pública' : 'Privada';
    if (textEl) textEl.innerText = transaction.message || '';

    if (giftsListEl) {
      giftsListEl.innerHTML = '';
      if (transaction.items && transaction.items.length > 0) {
        transaction.items.forEach(item => {
          const li = document.createElement('li');
          const priceText = item.price ? `R$ ${item.price.toFixed(2)} cada` : '';
          const suffix = priceText ? ` (${priceText})` : '';
          li.textContent = `${item.quantity}x ${item.name}${suffix}`;
          giftsListEl.appendChild(li);
        });
      }
    }

    this.messageModal.classList.remove('u-hidden');
  }

  closeModal() {
    if (this.messageModal) {
      this.messageModal.classList.add('u-hidden');
    }
  }

  renderTable() {
    this.tableBody.innerHTML = '';
    if (this.transactions.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="6" class="u-text-center">Nenhuma transação encontrada.</td></tr>`;
      return;
    }

    this.transactions.forEach(t => {
      const tr = document.createElement('tr');
      tr.dataset.id = t.id;
      
      let statusClass = 'status-pending';
      let statusText = 'Pendente';
      
      if (t.status === 'approved') {
        statusClass = 'status-approved';
        statusText = 'Aprovado';
      } else if (t.status === 'rejected') {
        statusClass = 'status-rejected';
        statusText = 'Rejeitado';
      }

      let messageHTML = '<span class="u-text-muted">-</span>';
      if (t.message) {
        const messageText = t.message;
        const privacyBadge = t.isPublic ? '' : ' <span class="badge-private">(Privado)</span>';
        
        if (messageText.length > 60) {
          messageHTML = `
            <div class="admin-message-cell js-cell-view-modal clickable">
              ${escapeHTML(messageText.substring(0, 60))}...
              <button type="button" class="admin-message-link js-btn-view-modal">Ver mais</button>
              ${privacyBadge}
            </div>
          `;
        } else {
          messageHTML = `
            <div class="admin-message-cell">
              ${escapeHTML(messageText)}
              ${privacyBadge}
            </div>
          `;
        }
      }

      tr.innerHTML = `
        <td>
          <button type="button" class="admin-detail-link js-btn-view-modal" title="Ver detalhes">
            ${escapeHTML(t.guestName)}
          </button>
        </td>
        <td>R$ ${t.totalAmount.toFixed(2)}</td>
        <td>${t.listChosen === 'Groom' ? 'Noivo' : 'Noiva'}</td>
        <td>${messageHTML}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td class="action-cell"></td>
      `;

      const actionCell = tr.querySelector('.action-cell');
      if (t.status === 'pending') {
        const approveBtn = document.createElement('button');
        approveBtn.className = 'btn btn-sm admin-btn-approve';
        approveBtn.innerText = 'Aprovar';
        approveBtn.addEventListener('click', () => this.updateStatus(t.id, 'approved'));

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-sm admin-btn-reject';
        rejectBtn.innerText = 'Rejeitar';
        rejectBtn.addEventListener('click', () => this.updateStatus(t.id, 'rejected'));

        actionCell.appendChild(approveBtn);
        actionCell.appendChild(rejectBtn);
      } else {
        actionCell.innerText = '-';
      }

      this.tableBody.appendChild(tr);
    });
  }

  async updateStatus(id, newStatus) {
    if (confirm(`Tem certeza que deseja marcar como ${newStatus === 'approved' ? 'Aprovado' : 'Rejeitado'}?`)) {
      try {
        const docRef = doc(db, "transactions", id);
        await updateDoc(docRef, { status: newStatus });
      } catch (e) {
        console.error("Erro ao atualizar status", e);
        alert("Erro ao atualizar. Verifique as regras do Firebase Firestore.");
      }
    }
  }
}

const adminApp = new AdminApp();
globalThis.adminApp = adminApp;
