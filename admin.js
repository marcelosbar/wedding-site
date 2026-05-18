import { db, onSnapshot, query, auth, googleProvider } from './firebase.js';
import { doc, updateDoc, collection } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

class AdminApp {
  loggedIn = false;
  transactions = [];

  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
  constructor() {
    this.loginScreen = document.getElementById('login-screen');
    this.dashboardScreen = document.getElementById('dashboard-screen');
    this.tableBody = document.getElementById('admin-table-body');

    // Mudar UI automaticamente quando o login mudar
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.loggedIn = true;
        this.loginScreen.style.display = 'none';
        this.dashboardScreen.style.display = 'block';
        this.fetchData();
      } else {
        this.loggedIn = false;
        this.loginScreen.style.display = 'flex';
        this.dashboardScreen.style.display = 'none';
      }
    });
  }

  async login() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login com Google", error);
      alert("Falha ao fazer login com o Google.");
    }
  }

  async logout() {
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
      this.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Firebase não configurado. Adicione a config em firebase.js</td></tr>`;
    }
  }

  renderTable() {
    this.tableBody.innerHTML = '';
    if (this.transactions.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma transação encontrada.</td></tr>`;
      return;
    }

    this.transactions.forEach(t => {
      const tr = document.createElement('tr');
      
      let statusClass = 'status-pending';
      let statusText = 'Pendente';
      
      if (t.status === 'approved') {
        statusClass = 'status-approved';
        statusText = 'Aprovado';
      } else if (t.status === 'rejected') {
        statusClass = 'status-rejected';
        statusText = 'Rejeitado';
      }

      tr.innerHTML = `
        <td>${this.escapeHTML(t.guestName)}</td>
        <td>R$ ${t.totalAmount.toFixed(2)}</td>
        <td>${t.listChosen === 'Groom' ? 'Noivo' : 'Noiva'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          ${t.status === 'pending' ? `
            <button class="btn btn-sm" style="background: #16a34a; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;" onclick="adminApp.updateStatus('${t.id}', 'approved')">Aprovar</button>
            <button class="btn btn-sm" style="background: #dc2626; color: white; padding: 0.25rem 0.5rem; border-radius: 4px;" onclick="adminApp.updateStatus('${t.id}', 'rejected')">Rejeitar</button>
          ` : '-'}
        </td>
      `;
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
