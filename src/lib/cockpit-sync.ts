export type CockpitSyncPhase = "idle" | "pending" | "synced" | "error";

export interface CockpitSyncState {
  phase: CockpitSyncPhase;
  label: string | null;
}

export interface CockpitSyncOperation<TResult> {
  label: string;
  execute: () => Promise<TResult>;
  confirm: (result: TResult) => void | Promise<void>;
}

/**
 * Serialises critical cockpit writes. The UI is only confirmed after both the
 * server mutation and the local cache reconciliation have completed.
 */
export class CockpitSyncCoordinator<TResult> {
  private pending = false;
  private failedOperation: CockpitSyncOperation<TResult> | null = null;
  private readonly report: (state: CockpitSyncState) => void;

  constructor(report: (state: CockpitSyncState) => void) {
    this.report = report;
  }

  get isPending(): boolean {
    return this.pending;
  }

  get canRetry(): boolean {
    return this.failedOperation !== null && !this.pending;
  }

  async run(operation: CockpitSyncOperation<TResult>): Promise<boolean> {
    if (this.pending) return false;

    this.pending = true;
    this.failedOperation = null;
    this.report({ phase: "pending", label: operation.label });

    try {
      const result = await operation.execute();
      await operation.confirm(result);
      this.report({ phase: "synced", label: operation.label });
      return true;
    } catch {
      this.failedOperation = operation;
      this.report({ phase: "error", label: operation.label });
      return false;
    } finally {
      this.pending = false;
    }
  }

  retry(): Promise<boolean> {
    if (!this.failedOperation || this.pending) return Promise.resolve(false);
    return this.run(this.failedOperation);
  }
}
