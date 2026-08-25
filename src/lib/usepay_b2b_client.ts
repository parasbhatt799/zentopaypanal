/**
 * UsePay B2B Portal API Client
 * 
 * This client provides wrapper functions for interacting with the UsePay B2B Gateway.
 * It encapsulates the payload normalization, request signing, and response handling logic 
 * exactly as it is implemented in Zentopay.
 * 
 * IMPORTANT FOR INTEGRATION:
 * 1. Exposing API credentials (x-api-key, x-secret-key) on the frontend is a security risk.
 *    In production, it is highly recommended to run this client on your backend server.
 * 2. Whitelisted IP: UsePay gateway typically requires requests to originate from a whitelisted IP.
 *    In development, Zentopay proxies requests via Vite server configuration with IP spoofing headers.
 *    In your production backend, ensure your backend server's public IP is registered with UsePay.
 */

export interface B2BClientConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string; // Defaults to UsePay production URL 'https://www.usepay.in'
}

export interface CustomerParam {
  name: string;
  value: string;
}

export interface BillerResponseInfo {
  customerName: string;
  billAmount: string; // Amount in Paisa (e.g. "10000" for Rs 100.00)
  billDate: string;   // YYYY-MM-DD
  dueDate: string;    // YYYY-MM-DD
}

export interface FetchBillRequest {
  billerId: string;
  mobile: string;
  customerParams: CustomerParam[];
}

export interface FetchBillResponse {
  status: 'success' | 'failed' | 'error';
  message?: string;
  data?: {
    requestId: string;
    billerResponse: BillerResponseInfo;
    additionalInfo?: {
      info: any;
    };
  };
}

export interface PayBillRequest {
  billerId: string;
  amount: number;
  mobile: string;
  customerParams: CustomerParam[];
  billerResponseInfo?: any; // Raw response from fetch-bill or customized fallback object
  customerPan?: string;     // Required for payments >= 50,000 INR
  customerNameFallback?: string; // Used if billing details aren't fetched beforehand
}

export interface PayBillResponse {
  status?: 'success' | 'failed' | 'error';
  payment_status?: string;
  message?: string;
  transaction_id?: string;
  data?: {
    message?: string;
    current_status?: string;
    billPayResponse?: {
      txnReferenceId: string;
    };
  };
  ExtBillPayResponse?: {
    approvalRefNumber?: string;
    errorInfo?: {
      error?: {
        errorMessage?: string;
      };
    };
  };
}

export interface BalanceResponse {
  status: 'success' | 'failed' | 'error';
  message?: string;
  data?: {
    balance: number | string;
  };
}

export interface BankAccount {
  bank_account_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  ifsc_code: string;
  branch_name?: string;
}

export interface FetchBankAccountsResponse {
  status: 'success' | 'failed' | 'error';
  data?: BankAccount[];
}

export interface FundRequestRequest {
  amount: number;
  utr_number: string;
  proof_url?: string | null;
  admin_bank_account_id?: string | null;
}

export interface FundRequestResponse {
  status: 'success' | 'failed' | 'error';
  message?: string;
  data?: {
    request_id: string;
    amount: number | string;
    utr_number: string;
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: string;
  };
}

export class UsePayB2BClient {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(config: B2BClientConfig) {
    this.apiKey = config.apiKey.trim();
    this.secretKey = config.secretKey.trim();
    // Default to UsePay production gateway URL if baseUrl is not supplied
    this.baseUrl = (config.baseUrl || 'https://www.usepay.in').replace(/\/$/, '');
  }

  /**
   * Helper to execute API requests with correct headers and API credentials
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-secret-key': this.secretKey,
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        throw new Error(`HTTP Error ${response.status}: ${errorText || response.statusText}`);
      }
      throw new Error(errorJson.message || `HTTP Error ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * 1. GET Wallet Balance
   * Path: /api/v1/b2b/balance
   */
  async fetchBalance(): Promise<number> {
    const res = await this.request<BalanceResponse>('/api/v1/b2b/balance', {
      method: 'GET',
    });

    if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
      return Number(res.data.balance);
    }
    throw new Error(res.message || 'Failed to fetch balance from UsePay.');
  }

  /**
   * 2. GET Admin Bank Accounts
   * Path: /api/v1/b2b/admin-bank-accounts
   */
  async fetchAdminBankAccounts(): Promise<BankAccount[]> {
    const res = await this.request<FetchBankAccountsResponse>('/api/v1/b2b/admin-bank-accounts', {
      method: 'GET',
    });

    if (res.status === 'success' && Array.isArray(res.data)) {
      return res.data;
    }
    throw new Error('Failed to fetch admin bank accounts list from UsePay.');
  }

  /**
   * 3. POST Submit Fund Request
   * Path: /api/v1/b2b/fund-request
   */
  async submitFundRequest(req: FundRequestRequest): Promise<FundRequestResponse['data']> {
    const payload = {
      amount: parseFloat(req.amount.toString()),
      utr_number: req.utr_number.trim(),
      proof_url: req.proof_url || null,
      admin_bank_account_id: req.admin_bank_account_id?.trim() || null,
    };

    const res = await this.request<FundRequestResponse>('/api/v1/b2b/fund-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.status === 'success' && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to submit fund request to UsePay.');
  }

  /**
   * 4. POST Fetch Bill Details
   * Path: /api/v1/b2b/fetch-bill
   */
  async fetchBill(req: FetchBillRequest): Promise<FetchBillResponse['data']> {
    const res = await this.request<FetchBillResponse>('/api/v1/b2b/fetch-bill', {
      method: 'POST',
      body: JSON.stringify({
        billerId: req.billerId,
        mobile: req.mobile,
        customerParams: req.customerParams,
      }),
    });

    if (res.status === 'success' && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Failed to fetch bill. Make sure input details are correct.');
  }

  /**
   * 5. POST Pay Bill
   * Path: /api/v1/b2b/pay-bill
   * Includes automatic data extraction and normalization from raw fetch-bill responses
   */
  async payBill(req: PayBillRequest): Promise<{ transactionRef: string; approvalRef?: string; status: 'Success' | 'Pending' }> {
    const rawBillerInfo = req.billerResponseInfo;
    
    // Exact Zentopay normalization logic:
    // Extract billing parameters from potentially nested object hierarchies returned by different billers
    const finalBillerResponseInfo = rawBillerInfo?.billFetchResponse?.billerResponse
      || rawBillerInfo?.billerResponse
      || rawBillerInfo
      || {
        customerName: req.customerNameFallback || 'N/A',
        billAmount: (parseFloat(req.amount.toString()) * 100).toFixed(0).toString(), // in paisa
        billDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0]
      };

    const fetchRequestId = rawBillerInfo?.requestId
      || rawBillerInfo?.billFetchResponse?.requestId
      || rawBillerInfo?.billId;

    const additionalInfo = rawBillerInfo?.billFetchResponse?.additionalInfo?.info
      || rawBillerInfo?.additionalInfo?.info
      || rawBillerInfo?.additionalInfo;

    const requestPayload: any = {
      billerId: req.billerId,
      amount: parseFloat(req.amount.toFixed(2)),
      mobile: req.mobile,
      customerParams: req.customerParams,
      billerResponseInfo: finalBillerResponseInfo
    };

    if (req.customerPan) {
      requestPayload.customerPan = req.customerPan;
    }

    if (fetchRequestId) {
      requestPayload.fetchRequestId = fetchRequestId;
    }

    if (additionalInfo) {
      requestPayload.additionalInfo = additionalInfo;
    }

    // Call UsePay B2B Gateway
    const resData = await this.request<PayBillResponse>('/api/v1/b2b/pay-bill', {
      method: 'POST',
      body: JSON.stringify(requestPayload),
    });

    // Check for validation, vendor, or gateway errors
    const extError = resData.ExtBillPayResponse?.errorInfo?.error?.errorMessage;
    const gatewayError = resData.message || resData.data?.message;

    if (resData.status === 'error' || resData.status === 'failed' || resData.payment_status === 'failed' || extError) {
      const errMsg = extError || gatewayError || 'Transaction rejected by UsePay gateway.';
      throw new Error(errMsg);
    }

    // Extract reference codes on success
    const baseRef = resData.transaction_id || resData.data?.billPayResponse?.txnReferenceId || '';
    const approvalRef = resData.ExtBillPayResponse?.approvalRefNumber;

    let transactionStatus: 'Success' | 'Pending' = 'Success';
    const responseStatus = (resData.payment_status || resData.status || resData.data?.current_status || '').toLowerCase();
    if (responseStatus === 'pending') {
      transactionStatus = 'Pending';
    }

    return {
      transactionRef: baseRef,
      approvalRef: approvalRef,
      status: transactionStatus
    };
  }
}
