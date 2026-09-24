export interface ExtractedBillIdentifiers {
  orderId?: string;     // 2. Custom Client Order ID (TXN_ORD_...)
  bbpsTxnId?: string;   // 1. API Transaction ID (BBPSU...)
  cc01Ref?: string;     // 4. BillAvenue Reference ID (CC01...)
  bbpsRef?: string;     // General BBPS Reference (CC01... or BBPSU...)
  apiTxnId?: string;    // Any other gateway ID
  displayRef: string;
}

export interface ParsedPaymentMethod {
  method: string;
  billerId: string;
  mobile: string;
  clientTxnId?: string;
  apiResponse?: string;
}

export const parsePaymentMethod = (paymentMethodStr: string): ParsedPaymentMethod => {
  if (paymentMethodStr && paymentMethodStr.includes('|')) {
    const parts = paymentMethodStr.split('|');
    return {
      method: parts[0] || 'UPI / NetBanking',
      billerId: parts[1] || 'N/A',
      mobile: parts[2] || 'N/A',
      clientTxnId: parts[3] || undefined,
      apiResponse: parts.slice(4).join('|').trim() || undefined
    };
  }
  return {
    method: paymentMethodStr || 'UPI / NetBanking',
    billerId: 'N/A',
    mobile: 'N/A',
    clientTxnId: undefined,
    apiResponse: undefined
  };
};

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

/**
 * Strict Status Hierarchy Logic for UsePay B2B Gateway / BBPS Responses.
 * 
 * Rules:
 * 1. Priority 1 (Authoritative): `current_status` (UsePay Gateway Master State)
 *    - If Gateway says Pending/Processing/Initiated -> STRICTLY 'Pending'
 *    - If Gateway says Success/Completed/Settled -> STRICTLY 'Success'
 *    - If Gateway says Failed/Failure/Rejected/Declined -> STRICTLY 'Failed'
 * 
 * 2. Priority 2: `bbps_status` (Downstream BBPS / NPCI / Biller State) - only checked if current_status is absent or uninformative
 *    - If BBPS says Pending/In Progress/Pending at Biller -> 'Pending'
 *    - If BBPS says Success/Approved -> 'Success'
 *    - If BBPS says Failed/Rejected -> 'Failed'
 * 
 * 3. Priority 3: `payment_status` / `status` (General payload fields)
 *    - Evaluated in the same order if priorities 1 & 2 are not conclusive.
 */
export const resolveGatewayStatus = (
  rawStatusData: any,
  fallbackStatus: 'Success' | 'Pending' | 'Failed' = 'Pending'
): 'Success' | 'Pending' | 'Failed' => {
  if (!rawStatusData) return fallbackStatus;

  // Clean strings
  const currentStatus = (
    typeof rawStatusData === 'string'
      ? rawStatusData
      : rawStatusData.current_status || ''
  ).trim().toLowerCase();

  const bbpsStatus = (rawStatusData.bbps_status || '').trim().toLowerCase();
  const paymentStatus = (rawStatusData.payment_status || '').trim().toLowerCase();
  const generalStatus = (rawStatusData.status || '').trim().toLowerCase();

  const isPendingStr = (val: string): boolean => {
    if (!val) return false;
    const pendingKeywords = [
      'pending',
      'processing',
      'queued',
      'initiated',
      'in_progress',
      'in-progress',
      'in progress',
      'under_verification',
      'hold',
      'biller received',
      'pending at biller',
      'received',
      'created',
    ];
    return pendingKeywords.some((k) => val === k || val.includes(k));
  };

  const isSuccessStr = (val: string): boolean => {
    if (!val) return false;
    const successKeywords = [
      'success',
      'successful',
      'completed',
      'settled',
      'approved',
      'paid',
    ];
    return successKeywords.some((k) => val === k || val.includes(k));
  };

  const isFailedStr = (val: string): boolean => {
    if (!val) return false;
    const failedKeywords = [
      'failed',
      'failure',
      'rejected',
      'declined',
      'cancelled',
      'canceled',
      'error',
      'biller down',
      'not found',
    ];
    return failedKeywords.some((k) => val === k || val.includes(k));
  };

  // 1. Priority 1: UsePay Gateway Master Status (`current_status`)
  if (currentStatus) {
    if (isPendingStr(currentStatus)) return 'Pending';
    if (isSuccessStr(currentStatus)) return 'Success';
    if (isFailedStr(currentStatus)) return 'Failed';
  }

  // 2. Priority 2: Downstream BBPS / NPCI Status (`bbps_status`)
  if (bbpsStatus) {
    if (isPendingStr(bbpsStatus)) return 'Pending';
    if (isSuccessStr(bbpsStatus)) return 'Success';
    if (isFailedStr(bbpsStatus)) return 'Failed';
  }

  // 3. Priority 3: Payment Status / General Status Candidate
  const candidateStatus = paymentStatus || generalStatus;
  if (candidateStatus) {
    if (isPendingStr(candidateStatus)) return 'Pending';
    if (isSuccessStr(candidateStatus)) return 'Success';
    if (isFailedStr(candidateStatus)) return 'Failed';
  }

  return fallbackStatus;
};
