export enum ExecutionStatus {
  CREATED = 'CREATED',
  QUOTED = 'QUOTED',
  EXECUTING = 'EXECUTING',
  SETTLING = 'SETTLING',
  SETTLED = 'SETTLED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED'
}

export interface IntentParams {
  sourceChain: string;
  destinationChain: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  deadline: number;
  [key: string]: string | number;
}

export interface Intent {
  id: string;
  params: IntentParams;
  signature?: string;
  status: ExecutionStatus;
  createdAt: number;
  executionSteps: ExecutionStep[];
  settlementTx?: string;
}

export interface ExecutionStep {
  step: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  timestamp: number;
  details?: string;
}

export class JACK_SDK {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Constructs the EIP-712 typed data for an intent
   */
  getIntentTypedData(params: IntentParams) {
    const domain = {
      name: 'JACK',
      version: '1',
      chainId: 84532, // Base Sepolia
      verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`
    };

    const types = {
      Intent: [
        { name: 'sourceChain', type: 'string' },
        { name: 'destinationChain', type: 'string' },
        { name: 'tokenIn', type: 'string' },
        { name: 'tokenOut', type: 'string' },
        { name: 'amountIn', type: 'string' },
        { name: 'minAmountOut', type: 'string' },
        { name: 'deadline', type: 'uint256' }
      ]
    };

    return { domain, types, message: params, primaryType: 'Intent' as const };
  }

  /**
   * Submits a signed intent to the Kernel
   */
  async submitIntent(params: IntentParams, signature: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/intents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, signature })
    });

    if (!response.ok) {
      throw new Error('Failed to submit intent');
    }

    const data = await response.json();
    return data.intentId;
  }

  /**
   * Polls the status of an intent execution
   */
  async getExecutionStatus(intentId: string): Promise<Intent> {
    const response = await fetch(`${this.baseUrl}/intents/${intentId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch execution status');
    }

    return await response.json();
  }

  /**
   * Fetches the complete list of intents for the dashboard
   */
  async listIntents(): Promise<Intent[]> {
    const response = await fetch(`${this.baseUrl}/intents`);
    if (!response.ok) return [];
    return await response.json();
  }
}
