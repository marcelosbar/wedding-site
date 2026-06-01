/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';

// 1. Mock all firebase imports using global variables to ensure identical mock references
vi.mock('../src/js/firebase.js', () => {
  globalThis.__mockOnSnapshot = globalThis.__mockOnSnapshot || vi.fn();
  globalThis.__mockQuery = globalThis.__mockQuery || vi.fn();
  globalThis.__mockAuth = globalThis.__mockAuth !== undefined ? globalThis.__mockAuth : {};
  return {
    db: {},
    onSnapshot: globalThis.__mockOnSnapshot,
    query: globalThis.__mockQuery,
    get auth() {
      return globalThis.__mockAuth;
    },
    googleProvider: {}
  };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  getDoc: vi.fn()
}));

vi.mock('firebase/auth', () => {
  let authCallback = null;
  return {
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, cb) => {
      authCallback = cb; // Capture the callback to simulate auth state changes
    }),
    setPersistence: vi.fn().mockResolvedValue(),
    browserSessionPersistence: 'session',
    __triggerAuthStateChange: async (user) => {
      if (authCallback) await authCallback(user);
    }
  };
});

// Mock console methods and alert
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
const alertMock = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
const confirmMock = vi.spyOn(globalThis, 'confirm').mockImplementation(() => true);

// 2. Import elements
import { getDoc, updateDoc, collection } from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import * as firebaseAuthMock from 'firebase/auth';

describe('AdminApp', () => {
  let adminApp;

  beforeAll(async () => {
    document.body.innerHTML = `
      <div id="login-screen">
        <button id="admin-login-btn"></button>
      </div>
      <div id="dashboard-screen">
        <button id="admin-logout-btn"></button>
      </div>
      <table>
        <tbody id="admin-table-body"></tbody>
      </table>

      <!-- Modal for showing full message detail -->
      <div id="message-modal" class="modal u-hidden">
        <div id="modal-overlay"></div>
        <button id="modal-close-btn">&times;</button>
        <span id="modal-guest-name"></span>
        <span id="modal-amount"></span>
        <span id="modal-list"></span>
        <span id="modal-privacy"></span>
        <span id="modal-message-text"></span>
      </div>
    `;
    await import('../src/js/admin.js');
  });

  beforeEach(() => {
    // globalThis.adminApp was initialized when importing admin.js
    adminApp = globalThis.adminApp;
    adminApp.transactions = [];
    adminApp.tableBody.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and attach to globalThis', () => {
    expect(adminApp).toBeDefined();
    expect(adminApp.loginScreen).toBeDefined();
    expect(adminApp.dashboardScreen).toBeDefined();
  });

  it('should call login when admin-login-btn is clicked', async () => {
    const loginSpy = vi.spyOn(adminApp, 'login').mockImplementation(async () => {});
    const loginBtn = document.getElementById('admin-login-btn');
    loginBtn.click();
    expect(loginSpy).toHaveBeenCalled();
    loginSpy.mockRestore();
  });

  it('should call logout when admin-logout-btn is clicked', async () => {
    const logoutSpy = vi.spyOn(adminApp, 'logout').mockImplementation(async () => {});
    const logoutBtn = document.getElementById('admin-logout-btn');
    logoutBtn.click();
    expect(logoutSpy).toHaveBeenCalled();
    logoutSpy.mockRestore();
  });

  it('isAdmin should return true for valid admin email', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ emails: ['admin@test.com'] })
    });
    const result = await adminApp.isAdmin('admin@test.com');
    expect(result).toBe(true);
  });

  it('isAdmin should return false for invalid admin email', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ emails: ['admin@test.com'] })
    });
    const result = await adminApp.isAdmin('hacker@test.com');
    expect(result).toBe(false);
  });

  it('isAdmin should handle missing doc or errors gracefully', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await adminApp.isAdmin('admin@test.com')).toBe(false);

    getDoc.mockRejectedValueOnce(new Error('Network error'));
    expect(await adminApp.isAdmin('admin@test.com')).toBe(false);
  });

  it('should show dashboard if auth state changes to valid admin', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ emails: ['admin@test.com'] })
    });
    const fetchSpy = vi.spyOn(adminApp, 'fetchData').mockImplementation(() => {});

    await firebaseAuthMock.__triggerAuthStateChange({ email: 'admin@test.com' });

    expect(adminApp.loggedIn).toBe(true);
    expect(adminApp.loginScreen.style.display).toBe('none');
    expect(adminApp.dashboardScreen.style.display).toBe('block');
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('should logout and alert if auth state changes to non-admin', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ emails: ['admin@test.com'] })
    });

    await firebaseAuthMock.__triggerAuthStateChange({ email: 'hacker@test.com' });

    expect(alertMock).toHaveBeenCalledWith('Acesso negado. Este e-mail não tem permissão de administrador.');
    expect(signOut).toHaveBeenCalled();
    expect(adminApp.loggedIn).toBe(false);
    expect(adminApp.loginScreen.style.display).toBe('flex');
    expect(adminApp.dashboardScreen.style.display).toBe('none');
  });

  it('should hide dashboard if auth state changes to logged out', async () => {
    await firebaseAuthMock.__triggerAuthStateChange(null);
    expect(adminApp.loggedIn).toBe(false);
    expect(adminApp.loginScreen.style.display).toBe('flex');
    expect(adminApp.dashboardScreen.style.display).toBe('none');
  });

  it('should set auth persistence and call signInWithPopup on login()', async () => {
    await adminApp.login();
    expect(firebaseAuthMock.setPersistence).toHaveBeenCalledWith(expect.anything(), firebaseAuthMock.browserSessionPersistence);
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('should handle login error gracefully', async () => {
    signInWithPopup.mockRejectedValueOnce(new Error('Login Failed'));
    await adminApp.login();
    expect(alertMock).toHaveBeenCalledWith('Falha ao fazer login com o Google.');
  });

  it('should call signOut on logout()', async () => {
    await adminApp.logout();
    expect(signOut).toHaveBeenCalled();
  });

  it('should handle logout error', async () => {
    signOut.mockRejectedValueOnce(new Error('Logout Failed'));
    await adminApp.logout();
    expect(console.error).toHaveBeenCalled();
  });

  it('should fetch data and render table', () => {
    adminApp.fetchData();
    expect(globalThis.__mockOnSnapshot).toHaveBeenCalled();

    // Trigger onSnapshot callback
    const snapshotCallback = globalThis.__mockOnSnapshot.mock.calls[0][1];
    
    // Mock a snapshot with some docs
    const mockSnapshot = [
      { id: '1', data: () => ({ guestName: 'Alice', totalAmount: 100, listChosen: 'Groom', status: 'pending', timestamp: '2026-01-01', message: 'Parabéns!', isPublic: true }) },
      { id: '2', data: () => ({ guestName: 'Bob', totalAmount: 200, listChosen: 'Bride', status: 'approved', timestamp: '2026-01-02', message: 'Sejam felizes!', isPublic: false }) }
    ];
    
    snapshotCallback(mockSnapshot);
    
    expect(adminApp.transactions.length).toBe(2);
    // Should sort by newest first (Bob is newer)
    expect(adminApp.transactions[0].guestName).toBe('Bob');
    expect(adminApp.tableBody.innerHTML).toContain('Bob');
    expect(adminApp.tableBody.innerHTML).toContain('Alice');
    expect(adminApp.tableBody.innerHTML).toContain('Parabéns!');
    expect(adminApp.tableBody.innerHTML).toContain('Sejam felizes!');
    expect(adminApp.tableBody.innerHTML).toContain('(Privado)');
  });

  it('should handle fetch data errors', () => {
    adminApp.fetchData();
    const errorCallback = globalThis.__mockOnSnapshot.mock.calls[0][2];
    errorCallback(new Error('Permission denied'));
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Erro ao conectar com Firebase'));
  });

  it('should render empty table when no transactions', () => {
    adminApp.transactions = [];
    adminApp.renderTable();
    expect(adminApp.tableBody.innerHTML).toContain('Nenhuma transação encontrada');
  });

  it('should render rejected status correctly', () => {
    adminApp.transactions = [
      { id: '3', guestName: 'Charlie', totalAmount: 50, listChosen: 'Bride', status: 'rejected', timestamp: '2026-01-01' }
    ];
    adminApp.renderTable();
    expect(adminApp.tableBody.innerHTML).toContain('Rejeitado');
  });

  it('updateStatus should update doc if confirmed', async () => {
    confirmMock.mockReturnValueOnce(true);
    await adminApp.updateStatus('123', 'approved');
    expect(confirmMock).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
  });

  it('updateStatus should NOT update doc if not confirmed', async () => {
    confirmMock.mockReturnValueOnce(false);
    updateDoc.mockClear();
    await adminApp.updateStatus('123', 'approved');
    expect(confirmMock).toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('updateStatus should handle update errors', async () => {
    confirmMock.mockReturnValueOnce(true);
    updateDoc.mockRejectedValueOnce(new Error('Failed'));
    await adminApp.updateStatus('123', 'approved');
    expect(alertMock).toHaveBeenCalledWith('Erro ao atualizar. Verifique as regras do Firebase Firestore.');
  });

  it('should render configuration error when collection throws', () => {
    collection.mockImplementationOnce(() => {
      throw new Error('Firebase offline');
    });

    adminApp.fetchData();
    expect(adminApp.tableBody.innerHTML).toContain('Firebase não configurado');
  });

  it('should handle long messages truncation and view toggling in modal mode', () => {
    const longMsg = 'Esta é uma mensagem muito longa com mais de sessenta caracteres para testar o comportamento de truncamento do painel de administração.';
    adminApp.transactions = [
      { id: 't1', guestName: 'Daniel', totalAmount: 150, listChosen: 'Groom', status: 'approved', timestamp: '2026-01-03', message: longMsg, isPublic: true }
    ];
    adminApp.renderTable();

    // Check it truncated
    const truncatedText = longMsg.substring(0, 60);
    expect(adminApp.tableBody.innerHTML).toContain(truncatedText);
    expect(adminApp.tableBody.innerHTML).not.toContain(longMsg);
    expect(adminApp.tableBody.innerHTML).toContain('js-btn-view-modal');

    // Click to view modal
    const viewBtn = adminApp.tableBody.querySelector('.js-btn-view-modal');
    expect(viewBtn).toBeDefined();
    viewBtn.click();

    // Verify modal is open and populated
    expect(adminApp.messageModal.classList.contains('u-hidden')).toBe(false);
    expect(document.getElementById('modal-guest-name').innerText).toBe('Daniel');
    expect(document.getElementById('modal-amount').innerText).toBe('R$ 150.00');
    expect(document.getElementById('modal-list').innerText).toBe('Noivo');
    expect(document.getElementById('modal-privacy').innerText).toBe('Pública');
    expect(document.getElementById('modal-message-text').innerText).toBe(longMsg);

    // Close modal
    adminApp.modalCloseBtn.click();
    expect(adminApp.messageModal.classList.contains('u-hidden')).toBe(true);
  });

  it('should handle missing DOM elements in constructor and showModal without throwing (null-branches)', () => {
    const originalHTML = document.body.innerHTML;
    document.body.innerHTML = ''; // Empty DOM
    
    let tempApp;
    expect(() => {
      tempApp = new adminApp.constructor();
    }).not.toThrow();

    // Verify it handles missing messageModal in showModal
    expect(() => {
      tempApp.showModal({ guestName: 'Daniel', totalAmount: 100, listChosen: 'Groom', isPublic: true, message: 'Hi' });
    }).not.toThrow();

    // Make messageModal look present to test inner element missing checks in showModal
    tempApp.messageModal = {
      classList: {
        remove: vi.fn(),
        add: vi.fn()
      }
    };
    expect(() => {
      tempApp.showModal({ guestName: 'Daniel', totalAmount: 100, listChosen: 'Groom', isPublic: true, message: 'Hi' });
    }).not.toThrow();

    // Verify it handles messageModal in closeModal when present
    expect(() => {
      tempApp.closeModal();
    }).not.toThrow();

    // Verify it handles missing messageModal in closeModal
    tempApp.messageModal = null;
    expect(() => {
      tempApp.closeModal();
    }).not.toThrow();
    
    document.body.innerHTML = originalHTML; // Restore DOM
  });

  it('should handle missing Firebase Auth gracefully (auth-else and auth-null guards)', async () => {
    globalThis.__mockAuth = null; // Disable auth

    const appWithoutAuth = new adminApp.constructor();
    expect(appWithoutAuth.loggedIn).toBe(false);

    // Test login guard with null auth
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    await appWithoutAuth.login();
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Firebase Auth não está configurado localmente'));
    alertSpy.mockRestore();

    // Test logout guard with null auth
    expect(async () => {
      await appWithoutAuth.logout();
    }).not.toThrow();

    globalThis.__mockAuth = {}; // Restore auth
  });
});
