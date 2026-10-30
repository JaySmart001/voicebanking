import {
  AccountsResponse,
  ChallengeResponse,
  EnrollRequest,
  EnrollResponse,
  TransactionsResponse,
  TransferRequest,
  TransferResponse,
  VerifyRequest,
  VerifyResponse,
} from "./types";

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/**
 * Thin fetch wrapper shared between the web app and the mobile app so both
 * clients speak the exact same contract to the backend.
 */
export class VoiceBankApiClient {
  private baseUrl: string;
  private fetchImpl: typeof fetch;
  private token?: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  setToken(token: string | undefined) {
    this.token = token;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error ?? `Request failed: ${res.status}`);
    }
    return body as T;
  }

  getChallenge(): Promise<ChallengeResponse> {
    return this.request<ChallengeResponse>("/api/auth/challenge", {
      method: "POST",
    });
  }

  enroll(req: EnrollRequest): Promise<EnrollResponse> {
    return this.request<EnrollResponse>("/api/auth/enroll", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  verify(req: VerifyRequest): Promise<VerifyResponse> {
    return this.request<VerifyResponse>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  getAccounts(): Promise<AccountsResponse> {
    return this.request<AccountsResponse>("/api/bank/accounts");
  }

  getTransactions(accountId: string): Promise<TransactionsResponse> {
    return this.request<TransactionsResponse>(
      `/api/bank/transactions?accountId=${encodeURIComponent(accountId)}`
    );
  }

  transfer(req: TransferRequest): Promise<TransferResponse> {
    return this.request<TransferResponse>("/api/bank/transfer", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }
}
