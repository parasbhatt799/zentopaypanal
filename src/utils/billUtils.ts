export interface ExtractedBillIdentifiers {
  orderId?: string;
  bbpsRef?: string;
  apiTxnId?: string;
  displayRef: string;
}

/**
 * Robustly extracts BBPS Reference (BBPSU...), Custom Order ID (TXN_ORD_...),
 * and API Transaction IDs from any bill object across all stored variations.
 */
export const extractBillIdentifiers = (bill: {
  transaction_ref?: string;
  payment_method?: string;
  client_transaction_id?: string;
  api_transaction_id?: string;
  bbps_ref_id?: string;
}): ExtractedBillIdentifiers => {
  let bbpsRef = bill.bbps_ref_id ? bill.bbps_ref_id.trim() : undefined;
  let orderId = bill.client_transaction_id ? bill.client_transaction_id.trim() : undefined;
  let apiTxnId = bill.api_transaction_id ? bill.api_transaction_id.trim() : undefined;

  // 1. Extract Order ID from payment_method 4th pipe segment (method|billerId|mobile|clientTxnId)
  if (bill.payment_method && bill.payment_method.includes('|')) {
    const parts = bill.payment_method.split('|');
    if (parts[3] && parts[3].trim()) {
      const candidateOrder = parts[3].trim();
      if (!orderId) {
        orderId = candidateOrder;
      }
    }
  }

  const ref = (bill.transaction_ref || '').trim();

  // 2. Extract BBPS reference (e.g. BBPSU3828168450)
  if (!bbpsRef) {
    const bbpsMatch = ref.match(/BBPSU\d+/i);
    if (bbpsMatch) {
      bbpsRef = bbpsMatch[0].toUpperCase();
    }
  }

  // 3. Extract Order ID from transaction_ref (e.g. TXN_ORD_20260922065130_5926)
  if (!orderId) {
    const orderMatch = ref.match(/TXN_ORD_[A-Za-z0-9_]+/i);
    if (orderMatch) {
      orderId = orderMatch[0];
    }
  }

  // 4. Check if ref starts directly with TXN_ORD_
  if (ref.startsWith('TXN_ORD_') && !orderId) {
    orderId = ref.split(' ')[0];
  }

  // 5. Check if ref starts directly with BBPSU
  if (ref.startsWith('BBPSU') && !bbpsRef) {
    bbpsRef = ref.split(' ')[0];
  }

  // 6. Extract API Transaction ID (e.g., CC01...)
  if (!apiTxnId && ref) {
    const firstToken = ref.split(' ')[0];
    if (
      !firstToken.startsWith('TXN_ORD_') &&
      !firstToken.startsWith('BBPSU') &&
      !firstToken.startsWith('USEPAY_') &&
      firstToken.length > 4
    ) {
      apiTxnId = firstToken;
    }
  }

  return {
    orderId,
    bbpsRef,
    apiTxnId,
    displayRef: ref || orderId || bbpsRef || 'N/A',
  };
};
