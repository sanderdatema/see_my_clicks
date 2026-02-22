import { createMiddleware } from "./server.js";
import { getClientScript } from "./client.js";

/**
 * Vite plugin factory.
 *
 * @param {Object} [opts]
 * @param {number} [opts.maxEntries=10]      Max clicks kept in the JSON file
 * @param {number} [opts.expiryMinutes=60]   Auto-expire entries older than this
 * @param {string} [opts.outputFile=".see-my-clicks/clicked.json"]  Path relative to cwd
 * @returns {import('vite').Plugin}
 */
export function seeMyClicks(opts = {}) {
  const middleware = createMiddleware(opts);
  const clientScript = getClientScript();

  return {
    name: "see-my-clicks",
    apply: "serve",

    config(config) {
      config.server ??= {};
      config.server.watch ??= {};
      const ignored = config.server.watch.ignored;
      const entry = "**/.see-my-clicks/**";
      if (Array.isArray(ignored)) {
        ignored.push(entry);
      } else if (typeof ignored === "string") {
        config.server.watch.ignored = [ignored, entry];
      } else {
        config.server.watch.ignored = [entry];
      }
    },

    configureServer(server) {
      server.middlewares.use("/__see-my-clicks", middleware);

      // Intercept HTML responses to inject the client script.
      // transformIndexHtml works for plain Vite, but SSR frameworks
      // like SvelteKit bypass it by generating their own HTML.
      server.middlewares.use((req, res, next) => {
        const origEnd = res.end;
        const origWrite = res.write;
        let body = "";
        let isHtml = false;

        res.write = function (chunk, ...args) {
          if (!isHtml) {
            const ct = res.getHeader("content-type");
            isHtml = typeof ct === "string" && ct.includes("text/html");
          }
          if (isHtml) {
            body += typeof chunk === "string" ? chunk : chunk.toString("utf-8");
            return true;
          }
          return origWrite.call(this, chunk, ...args);
        };

        res.end = function (chunk, ...args) {
          if (chunk && isHtml) {
            body += typeof chunk === "string" ? chunk : chunk.toString("utf-8");
          }
          if (
            isHtml &&
            body.includes("</body>") &&
            !body.includes("__seeMyClicksInitialized")
          ) {
            body = body.replace(
              "</body>",
              `<script>${clientScript}</script></body>`,
            );
            res.setHeader("content-length", Buffer.byteLength(body));
            return origEnd.call(this, body, "utf-8");
          }
          return origEnd.call(this, chunk, ...args);
        };

        next();
      });
    },

    transformIndexHtml() {
      // Fallback for frameworks that do use Vite's HTML pipeline.
      // The middleware above checks for __seeMyClicksInitialized to
      // avoid double-injection.
      return [
        {
          tag: "script",
          children: clientScript,
          injectTo: "body",
        },
      ];
    },
  };
}
