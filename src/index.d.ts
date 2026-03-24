export interface SeeMyClicksOptions {
  outputFile?: string;
  /** Modifier key for capture clicks. Default: "alt". Use "ctrl" for Linux or "meta" for macOS Cmd. */
  modifier?: "alt" | "ctrl" | "meta";
}

export interface CapturedComponentInfo {
  name: string;
  file: string;
  framework: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParentChainEntry {
  tagName: string;
  id: string | null;
  classList: string[];
  component: CapturedComponentInfo | null;
}

export interface CapturedElementData {
  clickId: string;
  timestamp: string;
  tagName: string;
  elementId: string | null;
  classList: string[];
  selector: string;
  textContent: string;
  boundingBox: BoundingBox;
  component: CapturedComponentInfo | null;
  parentChain: ParentChainEntry[];
  attributes: Record<string, string>;
  url: string;
  viewportSize: { width: number; height: number };
  comment?: string | null;
}

export interface CaptureSession {
  id: string;
  name: string;
  color: string;
  startedAt: string;
  clicks: CapturedElementData[];
}

export interface CaptureStore {
  sessions: CaptureSession[];
  lastRetrievedAt?: string | null;
}

export interface SeeMyClicksRequest {
  url?: string;
  method?: string;
  headers: { origin?: string; [key: string]: string | string[] | undefined };
  on(event: string, listener: (...args: unknown[]) => void): void;
  destroy(): void;
}

export interface SeeMyClicksResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): void;
  end(body?: string): void;
}

export type SeeMyClicksMiddleware = (
  req: SeeMyClicksRequest,
  res: SeeMyClicksResponse,
  next?: () => void
) => void;

export interface SeeMyClicksPlugin {
  name: "see-my-clicks";
  apply?: "serve" | "build" | ((...args: any[]) => boolean);
  config?: (...args: any[]) => any;
  configureServer?: (...args: any[]) => any;
  transformIndexHtml?: (...args: any[]) => any;
  [key: string]: unknown;
}

export function seeMyClicks(opts?: SeeMyClicksOptions): SeeMyClicksPlugin;
export function createMiddleware(
  opts?: SeeMyClicksOptions
): SeeMyClicksMiddleware;
export function getClientScript(): string;

/**
 * Read the capture store from disk. Handles missing files, corrupt JSON,
 * and legacy flat-array format migration.
 *
 * WARNING: This bypasses the middleware's write queue. Do not call while
 * the dev server is running unless you accept the risk of a race condition.
 */
export function readData(outputFile: string): CaptureStore;

/**
 * Atomically write the capture store to disk (tmp file + rename).
 *
 * WARNING: This bypasses the middleware's write queue. Do not call while
 * the dev server is running unless you accept the risk of a race condition.
 */
export function writeData(outputFile: string, data: CaptureStore): void;
