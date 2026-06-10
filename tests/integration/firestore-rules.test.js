// @vitest-environment node
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { doc, setDoc, getDoc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'demo-wedding-rules-test';
const ADMIN_EMAIL = 'admin@test.com';
const NON_ADMIN_EMAIL = 'guest@example.com';

/**
 * Builds a valid transaction object. Override individual fields via the `overrides` parameter.
 */
function buildValidTransaction(overrides = {}) {
  return {
    guestName: 'João Silva',
    totalAmount: 150.00,
    listChosen: 'Groom',
    status: 'pending',
    timestamp: new Date().toISOString(),
    message: 'Felicidades ao casal!',
    isPublic: true,
    items: [{ name: 'Ingresso Disney', price: 150.00, quantity: 1 }],
    ...overrides,
  };
}

let testEnv;

beforeAll(async () => {
  const rulesPath = resolve(import.meta.dirname, '../../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: 'localhost', port: 8080 },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Returns a Firestore instance for an unauthenticated user. */
function getUnauthedDb() {
  return testEnv.unauthenticatedContext().firestore();
}

/** Returns a Firestore instance for an authenticated admin (verified email in allowlist). */
function getAdminDb() {
  return testEnv.authenticatedContext('admin-user', {
    email: ADMIN_EMAIL,
    email_verified: true,
  }).firestore();
}

/** Returns a Firestore instance for a non-admin authenticated user. */
function getNonAdminDb() {
  return testEnv.authenticatedContext('regular-user', {
    email: NON_ADMIN_EMAIL,
    email_verified: true,
  }).firestore();
}

/** Returns a Firestore instance for an admin whose email is NOT verified. */
function getUnverifiedAdminDb() {
  return testEnv.authenticatedContext('unverified-admin', {
    email: ADMIN_EMAIL,
    email_verified: false,
  }).firestore();
}

/** Seeds the config/admins document and optionally a transaction, bypassing security rules. */
async function seedAdminsDoc() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'config', 'admins'), { emails: [ADMIN_EMAIL] });
  });
}

async function seedTransaction(id, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'transactions', id), data);
  });
}

// ──────────────────────────────────────────────
// /transactions — Create
// ──────────────────────────────────────────────

describe('/transactions — Create', () => {
  it('allows creating a valid Groom transaction', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ listChosen: 'Groom' });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  it('allows creating a valid Bride transaction', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ listChosen: 'Bride' });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  it('allows totalAmount at the upper limit of 5000', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ totalAmount: 5000 });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  it('allows message at the upper limit of 500 characters', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ message: 'a'.repeat(500) });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  it('allows an empty message', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ message: '' });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  it('allows items list at the upper limit of 50 items', async () => {
    const db = getUnauthedDb();
    const items = Array.from({ length: 50 }, (_, i) => ({
      name: `Item ${i + 1}`, price: 10, quantity: 1,
    }));
    const data = buildValidTransaction({ items });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  // ── Rejections ──

  it('rejects totalAmount greater than 5000', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ totalAmount: 5001 });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects totalAmount of zero', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ totalAmount: 0 });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects negative totalAmount', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ totalAmount: -100 });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects status other than pending', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ status: 'approved' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects extra fields not in the schema', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ extraField: 'malicious' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects empty guestName', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ guestName: '' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects guestName longer than 100 characters', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ guestName: 'x'.repeat(101) });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects guestName at exactly 100 characters', async () => {
    const db = getUnauthedDb();
    // 100 chars should be allowed (size() < 100 means max 99)
    // Wait — the rule says guestName.size() < 100, so 100 is rejected
    const data = buildValidTransaction({ guestName: 'x'.repeat(100) });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('allows guestName at 99 characters', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ guestName: 'x'.repeat(99) });
    await assertSucceeds(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects message longer than 500 characters', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ message: 'a'.repeat(501) });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects invalid listChosen value', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ listChosen: 'Invalid' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects items list with more than 50 items', async () => {
    const db = getUnauthedDb();
    const items = Array.from({ length: 51 }, (_, i) => ({
      name: `Item ${i + 1}`, price: 10, quantity: 1,
    }));
    const data = buildValidTransaction({ items });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects non-number totalAmount', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ totalAmount: '150' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects non-string guestName', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ guestName: 123 });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects non-boolean isPublic', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ isPublic: 'true' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects non-string timestamp', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ timestamp: 12345 });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects non-string message', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ message: 123 });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });

  it('rejects non-list items', async () => {
    const db = getUnauthedDb();
    const data = buildValidTransaction({ items: 'not-a-list' });
    await assertFails(addDoc(collection(db, 'transactions'), data));
  });
});

// ──────────────────────────────────────────────
// /transactions — Read
// ──────────────────────────────────────────────

describe('/transactions — Read', () => {
  it('allows unauthenticated read (for scoreboard)', async () => {
    await seedTransaction('tx-read-test', buildValidTransaction());

    const db = getUnauthedDb();
    await assertSucceeds(getDoc(doc(db, 'transactions', 'tx-read-test')));
  });
});

// ──────────────────────────────────────────────
// /transactions — Update
// ──────────────────────────────────────────────

describe('/transactions — Update', () => {
  const TX_ID = 'tx-update-test';

  beforeEach(async () => {
    await seedAdminsDoc();
    await seedTransaction(TX_ID, buildValidTransaction());
  });

  it('allows admin to update only the status field', async () => {
    const db = getAdminDb();
    await assertSucceeds(updateDoc(doc(db, 'transactions', TX_ID), { status: 'approved' }));
  });

  it('allows admin to reject a transaction', async () => {
    const db = getAdminDb();
    await assertSucceeds(updateDoc(doc(db, 'transactions', TX_ID), { status: 'rejected' }));
  });

  it('rejects admin updating fields other than status', async () => {
    const db = getAdminDb();
    await assertFails(updateDoc(doc(db, 'transactions', TX_ID), { totalAmount: 9999 }));
  });

  it('rejects admin updating status AND another field', async () => {
    const db = getAdminDb();
    await assertFails(updateDoc(doc(db, 'transactions', TX_ID), {
      status: 'approved',
      totalAmount: 9999,
    }));
  });

  it('rejects non-admin update', async () => {
    const db = getNonAdminDb();
    await assertFails(updateDoc(doc(db, 'transactions', TX_ID), { status: 'approved' }));
  });

  it('rejects unauthenticated update', async () => {
    const db = getUnauthedDb();
    await assertFails(updateDoc(doc(db, 'transactions', TX_ID), { status: 'approved' }));
  });

  it('rejects admin without email_verified', async () => {
    const db = getUnverifiedAdminDb();
    await assertFails(updateDoc(doc(db, 'transactions', TX_ID), { status: 'approved' }));
  });
});

// ──────────────────────────────────────────────
// /transactions — Delete
// ──────────────────────────────────────────────

describe('/transactions — Delete', () => {
  const TX_ID = 'tx-delete-test';

  beforeEach(async () => {
    await seedAdminsDoc();
    await seedTransaction(TX_ID, buildValidTransaction());
  });

  it('allows admin to delete a transaction', async () => {
    const db = getAdminDb();
    await assertSucceeds(deleteDoc(doc(db, 'transactions', TX_ID)));
  });

  it('rejects non-admin delete', async () => {
    const db = getNonAdminDb();
    await assertFails(deleteDoc(doc(db, 'transactions', TX_ID)));
  });

  it('rejects unauthenticated delete', async () => {
    const db = getUnauthedDb();
    await assertFails(deleteDoc(doc(db, 'transactions', TX_ID)));
  });

  it('rejects admin without email_verified', async () => {
    const db = getUnverifiedAdminDb();
    await assertFails(deleteDoc(doc(db, 'transactions', TX_ID)));
  });
});

// ──────────────────────────────────────────────
// /config/admins
// ──────────────────────────────────────────────

describe('/config/admins', () => {
  describe('Read', () => {
    beforeEach(async () => {
      await seedAdminsDoc();
    });

    it('allows authenticated admin to read', async () => {
      const db = getAdminDb();
      await assertSucceeds(getDoc(doc(db, 'config', 'admins')));
    });

    it('rejects non-admin read', async () => {
      const db = getNonAdminDb();
      await assertFails(getDoc(doc(db, 'config', 'admins')));
    });

    it('rejects unauthenticated read', async () => {
      const db = getUnauthedDb();
      await assertFails(getDoc(doc(db, 'config', 'admins')));
    });

    it('rejects admin without email_verified', async () => {
      const db = getUnverifiedAdminDb();
      await assertFails(getDoc(doc(db, 'config', 'admins')));
    });
  });

  describe('Write', () => {
    it('allows write when document does not exist (auto-seed)', async () => {
      // No seedAdminsDoc() — document does not exist
      const db = getUnauthedDb();
      await assertSucceeds(setDoc(doc(db, 'config', 'admins'), {
        emails: ['new-admin@test.com'],
      }));
    });

    it('allows admin to overwrite when document exists', async () => {
      await seedAdminsDoc();
      const db = getAdminDb();
      await assertSucceeds(setDoc(doc(db, 'config', 'admins'), {
        emails: [ADMIN_EMAIL, 'another@test.com'],
      }));
    });

    it('rejects non-admin write when document exists', async () => {
      await seedAdminsDoc();
      const db = getNonAdminDb();
      await assertFails(setDoc(doc(db, 'config', 'admins'), {
        emails: [NON_ADMIN_EMAIL],
      }));
    });

    it('rejects unauthenticated write when document exists', async () => {
      await seedAdminsDoc();
      const db = getUnauthedDb();
      await assertFails(setDoc(doc(db, 'config', 'admins'), {
        emails: ['hacker@evil.com'],
      }));
    });
  });
});
