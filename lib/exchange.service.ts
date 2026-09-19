import { io, Socket } from 'socket.io-client';

export const USER_API_BASE = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8080") + "/api";
export const USER_API_URL = USER_API_BASE.replace('/api', '');

export interface ExchangeAgent {
  id: number;
  companyName: string;
  tradingName: string;
  location: string;
  country: string;
  logoUrl: string;
  trustScore: number;
}

export interface ExchangeOrder {
  id: string;
  status: string;
  amountNgn: number;
  amountForeign: number;
  currency: string;
  fulfillmentMethod: string;
  refundBankCode: string;
  refundAccountNumber: string;
  escrowId: string;
  agentId: number;
}

class WebExchangeService {
  private socket: Socket | null = null;

  private async fetchWithAuth(url: string, token: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP Error ${res.status}` };
      }
      console.warn(`[API Error] ${url}`, errorData.message);
      throw new Error(errorData.message || 'API request failed');
    }
    return res.json();
  }

  async getAgents(token: string, currency?: string, city?: string): Promise<ExchangeAgent[]> {
    const params = new URLSearchParams();
    if (currency) params.append('currency', currency);
    if (city) params.append('city', city);

    const url = `${USER_API_BASE}/exchange/agents${params.toString() ? `?${params.toString()}` : ''}`;
    return this.fetchWithAuth(url, token);
  }

  async createOrder(
    token: string,
    data: {
      agentId: number;
      amountNgn: number;
      amountForeign: number;
      currency: string;
      fulfillmentMethod: string;
      refundBankCode: string;
      refundAccountNumber: string;
    }
  ): Promise<{ order: ExchangeOrder; otp: string; escrowId: string }> {
    return this.fetchWithAuth(`${USER_API_BASE}/exchange/orders`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelOrder(token: string, orderId: string): Promise<ExchangeOrder> {
    return this.fetchWithAuth(`${USER_API_BASE}/exchange/orders/${orderId}/cancel`, token, {
      method: 'POST',
    });
  }

  // Socket setup
  connect(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    // Connect to the `/exchange` namespace
    this.socket = io(`${USER_API_URL}/exchange`, {
      transports: ['websocket'],
      query: { token }
    });

    this.socket.on('connect', () => {
      console.log('[Web Socket] Connected to Exchange namespace');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Web Socket] Error:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onOrderUpdated(callback: (order: ExchangeOrder) => void) {
    if (this.socket) {
      this.socket.off('exchange_order_updated');
      this.socket.on('exchange_order_updated', callback);
    }
  }
}

export const exchangeService = new WebExchangeService();
