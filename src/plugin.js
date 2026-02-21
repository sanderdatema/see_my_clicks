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

    configureServer(server) {
      server.middlewares.use("/__see-my-clicks", middleware);

      // Post-middleware: inject client script into HTML responses.
      // Runs after SSR frameworks (SvelteKit, Nuxt, etc.) that bypass
      // transformIndexHtml. Returned function registers as post-middleware.
      return () => {
        server.middlewares.use((req, res, next) => {
          const originalWrite = res.write;
          const originalEnd = res.end;
          let body = "";

          res.write = function (chunk) {
            body += chunk.toString();
            return true;
          };

          res.end = function (chunk) {
            if (chunk) body += chunk.toString();
            const contentType = res.getHeader("content-type");
            if (
              contentType?.toString().includes("text/html") &&
              body.includes("</body>")
            ) {
              body = body.replace(
                "</body>",
                `<script src="/__see-my-clicks/client.js"></script></body>`,
              );
            }
            res.setHeader("content-length", Buffer.byteLength(body));
            originalWrite.call(res, body);
            originalEnd.call(res);
          };

          next();
        });
      };
    },

    transformIndexHtml() {
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
