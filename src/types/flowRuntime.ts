export interface RuntimeRequestSuccess {
  nodeId: string;
  method: string;
  endpoint: string;
  status: number;
  ok: boolean;
  durationMs: number;
  headers: Record<string, string>;
  rawText: string;
  data: unknown;
  responsePath: string;
}

export interface RuntimeRequestError {
  nodeId: string;
  method: string;
  endpoint: string;
  durationMs: number;
  responsePath: string;
  message: string;
  errorName?: string;
  fallbackData?: unknown;
}

export type RuntimeEvent =
  | {
      kind: 'timer';
      timerNodeId: string;
      intervalMs: number;
      tickAt: number;
    }
  | {
      kind: 'value';
      value: unknown;
      fromCodeNodeId: string;
      payload?: unknown;
    }
  | {
      kind: 'lifecycle';
      lifetime: string;
      componentKey: string;
      payload?: unknown;
    }
  | {
      kind: 'patch';
      patch: Record<string, unknown>;
      fromCodeNodeId: string;
      payload?: unknown;
    }
  | {
      kind: 'request:success';
      request: RuntimeRequestSuccess;
      payload?: unknown;
    }
  | {
      kind: 'request:error';
      request: RuntimeRequestError;
      payload?: unknown;
    };