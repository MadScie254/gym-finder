/**
 * One interface for everything a visitor sends us: reports, missing gyms and claims.
 * Plan decision D3: there is no server yet, so the only implementation stores submissions
 * in this browser ("simulation"). A real endpoint replaces `localBackend` without UI changes.
 */

export type IssueKind = "wrong_details" | "closed" | "duplicate" | "add_gym" | "claim" | "other";
export const ISSUE_KINDS: readonly IssueKind[] = ["wrong_details", "closed", "duplicate", "add_gym", "claim", "other"];

export type SubmissionInput = {
  kind: IssueKind;
  /** The gym the report is about. Null when adding a missing gym. */
  venueId: string | null;
  venueName: string;
  message: string;
  /** Only for "add_gym": where it is. */
  place?: string;
  /** Optional, so the owner can reply. Kept on this device only. */
  contact?: string;
};

/** "local" = saved on this device, not sent anywhere. A server would add "received" and "resolved". */
export type SubmissionStatus = "local";

export type Submission = SubmissionInput & { id: string; createdAt: string; status: SubmissionStatus };

export interface Backend {
  submit(input: SubmissionInput): Promise<Submission>;
  list(): Promise<Submission[]>;
  remove(id: string): Promise<void>;
}

const KEY = "fmg-submissions-v1";
const MAX_STORED = 100;

type KeyValue = Pick<Storage, "getItem" | "setItem">;

function isSubmission(value: unknown): value is Submission {
  if (!value || typeof value !== "object") return false;
  const row = value as Submission;
  return typeof row.id === "string" && typeof row.kind === "string" && typeof row.createdAt === "string"
    && typeof row.venueName === "string" && typeof row.message === "string";
}

function newId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `local-${random}`;
}

/** Storage that may throw (private mode, quota). Falls back to memory so the flow still completes. */
export function createLocalBackend(storage: KeyValue | null = typeof window !== "undefined" ? window.localStorage : null, now = () => new Date()): Backend {
  let memory: Submission[] = [];
  const read = (): Submission[] => {
    try {
      const raw = storage?.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : memory;
      return Array.isArray(parsed) ? parsed.filter(isSubmission) : [];
    } catch {
      return memory;
    }
  };
  const write = (rows: Submission[]) => {
    memory = rows;
    try { storage?.setItem(KEY, JSON.stringify(rows)); } catch { /* memory copy stays */ }
  };
  return {
    async submit(input) {
      const row: Submission = {
        ...input,
        venueName: input.venueName.trim().slice(0, 160),
        message: input.message.trim().slice(0, 2000),
        id: newId(),
        createdAt: now().toISOString(),
        status: "local",
      };
      write([row, ...read()].slice(0, MAX_STORED));
      return row;
    },
    async list() {
      return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async remove(id) {
      write(read().filter((row) => row.id !== id));
    },
  };
}

export const backend: Backend = createLocalBackend();
