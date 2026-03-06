import { createMiddleware } from "./server.js";
import { getClientScript } from "./client.js";

/**
 * Vite plugin factory.
 *
 * @param {Object} [opts]
 * @param {string} [opts.outputFile=".see-my-clicks/clicked.json"]  Path relative to cwd
 * @param {"alt"|"ctrl"|"meta"} [opts.modifier="alt"]  Modifier key for capture clicks
 * @returns {import('vite').Plugin}
 */
export function seeMyClicks(opts = {}) {
  const middleware = createMiddleware(opts);
  const modifier = opts.modifier || "alt";

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
      } else if (typeof ignored === "string" || ignored instanceof RegExp) {
        config.server.watch.ignored = [ignored, entry];
      } else if (ignored) {
        // Preserve function or other truthy values alongside our entry
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
          children:
            "window.__smcModifier=" +
            JSON.stringify(modifier) +
            ";" +
            getClientScript(),
          injectTo: "body",
        },
      ];
    },
  };
}
