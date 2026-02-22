export interface SeeMyClicksOptions {
  maxEntries?: number;
  expiryMinutes?: number;
  outputFile?: string;
}

export interface CapturedComponentInfo {
  name?: string;
  file?: string;
  framework?: string;
  [key: string]: unknown;
}

export interface CapturedElementData {
  clickId: string;
  tagName: string;
  comment?: string | null;
  component?: CapturedComponentInfo | null;
  [key: string]: unknown;
}

export interface CaptureSession {
  id: string;
  name: string;
  color?: string;
  startedAt?: string;
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

export interface ViteLikeWatchConfig {
  ignored?: string | string[];
}

export interface ViteLikeServerConfig {
  watch?: ViteLikeWatchConfig;
}

export interface ViteLikeConfig {
  server?: ViteLikeServerConfig;
}

export interface ViteLikeDevServer {
  middlewares: {
    use(path: string, handler: SeeMyClicksMiddleware): void;
  };
}

export interface HtmlTagDescriptor {
  tag: string;
  children?: string;
  injectTo?: "head" | "body" | "head-prepend" | "body-prepend";
  [key: string]: unknown;
}

export interface SeeMyClicksPlugin {
  name: "see-my-clicks";
  apply: "serve";
  config(config: ViteLikeConfig): void;
  configureServer(server: ViteLikeDevServer): void;
  transformIndexHtml(): HtmlTagDescriptor[];
}

export function seeMyClicks(opts?: SeeMyClicksOptions): SeeMyClicksPlugin;
export function createMiddleware(opts?: SeeMyClicksOptions): SeeMyClicksMiddleware;
export function getClientScript(): string;
