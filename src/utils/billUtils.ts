export interface ExtractedBillIdentifiers {
  orderId?: string;     // 2. Custom Client Order ID (TXN_ORD_...)
  bbpsTxnId?: string;   // 1. API Transaction ID (BBPSU...)
  cc01Ref?: string;     // 4. BillAvenue Reference ID (CC01...)
  bbpsRef?: string;     // General BBPS Reference (CC01... or BBPSU...)
  apiTxnId?: string;    // Any other gateway ID
  displayRef: string;
}

/**
 * Robustly extracts the 4 UsePay identifiers:
 * 1. API Transaction ID (BBPSU...)
 * 2. Custom Client Order ID (TXN_ORD_...)
 * 3. Fetch Request ID (from biller params if available)
 * 4. BillAvenue Reference ID (CC01...)
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
  let bbpsTxnId: string | undefined;
  let cc01Ref: string | undefined;

  // Check if bbps_ref_id is CC01 or BBPSU
  if (bbpsRef) {
    if (bbpsRef.toUpperCase().startsWith('CC01')) {
      cc01Ref = bbpsRef;
    } else if (bbpsRef.toUpperCase().startsWith('BBPSU')) {
      bbpsTxnId = bbpsRef;
    }
  }

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

  // 2. Extract BBPSU API Transaction ID (e.g. BBPSU3828168450)
  const bbpsMatch = ref.match(/BBPSU\d+/i);
  if (bbpsMatch) {
    bbpsTxnId = bbpsMatch[0].toUpperCase();
    if (!bbpsRef) bbpsRef = bbpsTxnId;
  }

  // 3. Extract BillAvenue CC01 Reference ID (e.g. CC016226CBAF13851712)
  const cc01Match = ref.match(/CC01[A-Za-z0-9]+/i);
  if (cc01Match) {
    cc01Ref = cc01Match[0].toUpperCase();
    if (!bbpsRef) bbpsRef = cc01Ref;
  }

  // 4. Extract Order ID from transaction_ref (e.g. TXN_ORD_20260922065130_5926)
  if (!orderId) {
    const orderMatch = ref.match(/TXN_ORD_[A-Za-z0-9_]+/i);
    if (orderMatch) {
      orderId = orderMatch[0];
    }
  }

  // Check prefix matches
  if (ref.startsWith('TXN_ORD_') && !orderId) {
    orderId = ref.split(' ')[0];
  }
  if (ref.startsWith('BBPSU') && !bbpsTxnId) {
    bbpsTxnId = ref.split(' ')[0];
    if (!bbpsRef) bbpsRef = bbpsTxnId;
  }
  if (ref.startsWith('CC01') && !cc01Ref) {
    cc01Ref = ref.split(' ')[0];
    if (!bbpsRef) bbpsRef = cc01Ref;
  }

  // 5. Extract API Transaction ID
  if (!apiTxnId && ref) {
    const firstToken = ref.split(' ')[0];
    if (
      !firstToken.startsWith('TXN_ORD_') &&
      !firstToken.startsWith('BBPSU') &&
      !firstToken.startsWith('CC01') &&
      !firstToken.startsWith('USEPAY_') &&
      firstToken.length > 4
    ) {
      apiTxnId = firstToken;
    }
  }

  return {
    orderId,
    bbpsTxnId,
    cc01Ref,
    bbpsRef: cc01Ref || bbpsTxnId || bbpsRef,
    apiTxnId,
    displayRef: ref || orderId || cc01Ref || bbpsTxnId || 'N/A',
  };
};
