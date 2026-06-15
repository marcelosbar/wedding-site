const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

exports.onTransactionWritten = onDocumentWritten("transactions/{transactionId}", async (event) => {
  const beforeData = event.data.before ? event.data.before.data() : null;
  const afterData = event.data.after ? event.data.after.data() : null;
  const transactionId = event.params.transactionId;

  const scoreboardRef = db.doc("scoreboard/totals");
  const updates = {};

  // 1. Recalculate totals (excluindo apenas status == 'rejected')
  const wasCounted = beforeData && beforeData.status !== "rejected";
  const isCounted = afterData && afterData.status !== "rejected";

  if (!beforeData && afterData) {
    // Criado
    if (isCounted) {
      const list = afterData.listChosen;
      updates[`${list.toLowerCase()}Total`] = FieldValue.increment(afterData.totalAmount);
    }
  } else if (beforeData && !afterData) {
    // Deletado
    if (wasCounted) {
      const list = beforeData.listChosen;
      updates[`${list.toLowerCase()}Total`] = FieldValue.increment(-beforeData.totalAmount);
    }
  } else if (beforeData && afterData) {
    // Atualizado
    const beforeList = beforeData.listChosen;
    const afterList = afterData.listChosen;

    if (wasCounted && isCounted) {
      if (beforeList === afterList) {
        const diff = afterData.totalAmount - beforeData.totalAmount;
        if (diff !== 0) {
          updates[`${afterList.toLowerCase()}Total`] = FieldValue.increment(diff);
        }
      } else {
        updates[`${beforeList.toLowerCase()}Total`] = FieldValue.increment(-beforeData.totalAmount);
        updates[`${afterList.toLowerCase()}Total`] = FieldValue.increment(afterData.totalAmount);
      }
    } else if (wasCounted && !isCounted) {
      // Passou a ser rejeitado
      updates[`${beforeList.toLowerCase()}Total`] = FieldValue.increment(-beforeData.totalAmount);
    } else if (!wasCounted && isCounted) {
      // Deixou de ser rejeitado (mudou para pending/approved)
      updates[`${afterList.toLowerCase()}Total`] = FieldValue.increment(afterData.totalAmount);
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      await scoreboardRef.set(updates, { merge: true });
    } catch (err) {
      console.error("Erro ao atualizar scoreboard/totals:", err);
    }
  }

  // 2. Gerenciar mensagens públicas
  const publicMsgRef = db.doc(`publicMessages/${transactionId}`);

  if (
    afterData &&
    afterData.status === "approved" &&
    afterData.isPublic === true &&
    afterData.message &&
    afterData.message.trim().length > 0
  ) {
    try {
      await publicMsgRef.set({
        guestName: afterData.guestName,
        message: afterData.message.trim(),
        timestamp: afterData.timestamp
      });
    } catch (err) {
      console.error(`Erro ao criar mensagem pública para a transação ${transactionId}:`, err);
    }
  } else {
    try {
      await publicMsgRef.delete();
    } catch (err) {
      console.error(`Erro ao deletar mensagem pública para a transação ${transactionId}:`, err);
    }
  }
});
