export interface SeeMyClicksOptions {
  maxEntries?: number;
  expiryMinutes?: number;
  outputFile?: string;
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
}

export interface SeeMyClicksRequest {
  url?: string;
  method?: string;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface SeeMyClicksResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): unknown;
  end(body?: string): unknown;
}

export type SeeMyClicksMiddleware = (
  req: SeeMyClicksRequest,
  res: SeeMyClicksResponse,
  next?: () => void,
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
export function createMiddleware(opts?: SeeMyClicksOptions): SeeMyClicksMiddleware;
export function getClientScript(): string;
