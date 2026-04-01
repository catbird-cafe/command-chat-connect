import type { Connect, Plugin } from "vite";

/**
 * Dev / preview only: POST /register is not handled by the SPA — the browser talks to
 * Supabase directly from JS. The CLI POSTs to the same URL users see (`/register`), so we
 * forward that request to the Edge Function.
 */
export function registerPostProxyPlugin(supabaseUrl: string, supabaseAnonKey: string): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const pathname = req.url?.split("?")[0] ?? "";
    if (req.method !== "POST" || pathname !== "/register") {
      next();
      return;
    }

    const base = supabaseUrl?.trim();
    if (!base) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "VITE_SUPABASE_URL is not set — cannot proxy POST /register to the register Edge Function",
        }),
      );
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      void (async () => {
        try {
          const body = Buffer.concat(chunks);
          const target = new URL("/functions/v1/register", base.replace(/\/$/, ""));
          const headers: Record<string, string> = {
            "Content-Type": req.headers["content-type"] || "application/json",
          };
          const anon = supabaseAnonKey?.trim();
          if (anon) {
            headers.Authorization = `Bearer ${anon}`;
            headers.apikey = anon;
          }
          const r = await fetch(target.href, {
            method: "POST",
            headers,
            body,
          });
          const text = await r.text();
          res.statusCode = r.status;
          const ct = r.headers.get("content-type");
          if (ct) res.setHeader("Content-Type", ct);
          res.end(text);
        } catch {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Registration proxy failed" }));
        }
      })();
    });
    req.on("error", () => {
      res.statusCode = 400;
      res.end();
    });
  };

  return {
    name: "register-post-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
