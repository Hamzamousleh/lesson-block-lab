export type StudentProgressPhase = "idle" | "pending" | "error";

export interface StudentProgressState {
  phase: StudentProgressPhase;
  message: string | null;
}

export class StudentProgressCoordinator {
  private pending = false;
  private failedRequest: (() => Promise<void>) | null = null;
  private readonly report: (state: StudentProgressState) => void;

  constructor(report: (state: StudentProgressState) => void) {
    this.report = report;
  }

  get isPending(): boolean {
    return this.pending;
  }

  async run(request: () => Promise<void>): Promise<boolean> {
    if (this.pending) return false;
    this.pending = true;
    this.failedRequest = null;
    this.report({ phase: "pending", message: null });
    try {
      await request();
      this.report({ phase: "idle", message: null });
      return true;
    } catch {
      this.failedRequest = request;
      this.report({
        phase: "error",
        message: "Kunne ikke skifte aktivitet. Du er stadig på den nuværende aktivitet.",
      });
      return false;
    } finally {
      this.pending = false;
    }
  }

  retry(): Promise<boolean> {
    if (!this.failedRequest || this.pending) return Promise.resolve(false);
    return this.run(this.failedRequest);
  }
}
