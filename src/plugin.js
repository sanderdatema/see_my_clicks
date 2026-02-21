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
