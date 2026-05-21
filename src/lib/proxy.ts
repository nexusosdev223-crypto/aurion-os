/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 🌐  AURION OS — UNIFIED PROXY / BOUNCE LAYER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PERSPECTIVE
 *   Outbound HTTP requests ──► VPN bounce pool ──► destination.
 *
 * WHAT THIS FILE DOES
 *   Detect / create a proxy agent from env vars, alias all supported
 *   proxy-URL schemes to Node-compatible Agent objects, install a
 *   globalThis.fetch shim so every caller that uses Node's built-in fetch is
 *   intercepted at process-top, and intentionally expose getProxyAgent() and
 *   proxiedFetch() so library authors (supabase-js, node-fetch, …) can bolt on
 *   via their configuration objects.
 *
 * PROXY ENV VARS
 *   HTTP_PROXY / HTTPS_PROXY  — e.g. "socks5://127.0.0.1:9050"
 *                              or  "http://127.0.0.1:7890"
 *   VPN_BOUNCE_PROXY         — explicit override (takes precedence)
 *   NO_PROXY                 — comma-sep allowlist, e.g. "localhost,127.0.0.1"
 *   VPN_BOUNCE_INSECURE      — set "true" to skip TLS cert verification
 *
 * LIFE-CYCLE
 *   bootProxyLayer() is called once at the top of supabase.ts (the module that
 *   has the broadest inward dependency graph).  Any other module that touches
 *   the network should either import from this file or just call fetch() — the
 *   globalThis.fetch patch installed by bootProxyLayer() catches everything.
 */

// ── NO_PROXY ─────────────────────────────────────────────────────────────────
function shouldBypass(host: string): boolean {
  const noProxy = (process.env.NO_PROXY || "localhost,127.0.0.1,::1,.local").split(",").map(s => s.trim()).filter(Boolean);
  return noProxy.some(entry => host === entry || host.endsWith(entry));
}

// ── AGENT FACTORY ─────────────────────────────────────────────────────────────
let __agent: any = null;

function makeAgent(): any {
  if (__agent) return __agent;

  const raw = process.env.VPN_BOUNCE_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!raw) return null;

  // Try agent libraries in order of specificity / likelihood
  const candidates: ReadonlyArray<[string, () => any]> = [
    [ "socks-proxy-agent",  () => require("socks-proxy-agent")  as any ],
    [ "socks-proxy-http",   () => require("socks-proxy-http")    as any ],
    [ "https-proxy-agent",  () => require("https-proxy-agent")   as any ],
    [ "http-proxy-agent",   () => require("http-proxy-agent")    as any ],
  ];

  for (const candidate of candidates) {
    try {
      const mod: any = candidate[1]();
      const Constructor = mod?.ProxyAgent ?? mod?.HttpsProxyAgent ?? mod?.HttpProxyAgent ?? mod?.default;
      if (Constructor) { __agent = new Constructor(raw); break; }
    } catch { /* next */ }
  }

  if (__agent) {
    console.info(`[VPN-PROXY] agent ${(__agent.constructor?.name ?? "unknown")} → ${raw}`);
  } else {
    console.warn("[VPN-PROXY] no matching agent module found; traffic WILL BE DIRECT.");
  }
  return __agent;
}

/**
 * Return a proxy `Agent` instance for the given URL, or `null` to go direct.
 * Callers can pass the result as the `agent` option on Node-fetch / undici
 * fetch calls.
 */
export function getProxyAgentForUrl(url: string): any {
  try {
    if (shouldBypass(new URL(url).hostname)) return null;
  } catch { /* not a valid URL — fall through */ }
  return makeAgent();
}

export function getProxyAgent(): any { return makeAgent(); }

// ── GLOBAL fetch SHIM ─────────────────────────────────────────────────────────
// Saved before-node replaces globalThis.fetch — sub-modules that cache the
// reference (e.g. import { fetch } from 'undici') cannot be intercepted; those
// few call sites need to use proxiedFetch() explicitly.

const origFetch = (globalThis as any).fetch;

/**
 * Thunk-safe drop-in replacement for globalThis.fetch that attaches the
 * proxy agent when the target host is not on the NO_PROXY list.
 *
 * Signature mirrors the native fetch so the compiler accepts it in all
 * call patterns:
 *   fetch(resource)
 *   fetch(resource, init)
 *   fetch(request)
 *   fetch(request, init)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const agent = getProxyAgentForUrl(input instanceof URL ? input.toString() : String(input));
  return (origFetch ?? fetch)(input, { ...(init ?? {}), agent } as any);
}

if (origFetch) (globalThis as any).fetch = patchedFetch;

// ── PUBLIC RE-EXPORT ──────────────────────────────────────────────────────────

/** Typed reference to the patched fetch for use in library config objects. */
export const proxiedFetch = patchedFetch as typeof fetch;

// ── INIT ──────────────────────────────────────────────────────────────────────
let __initDone = false;

export function bootProxyLayer(): void {
  if (__initDone) return;
  __initDone = true;

  // install global fetch shim (idempotent)
  if (origFetch) (globalThis as any).fetch = patchedFetch;

  // propagate transport env vars to any child process spawned later
  for (const varName of ["HTTP_PROXY", "HTTPS_PROXY", "VPN_BOUNCE_PROXY", "NO_PROXY"]) {
    if (process.env[varName]) {
      for (const nameCase of [varName, varName.toLowerCase()]) {
        if (!process.env[nameCase as any]) process.env[nameCase as any] = process.env[varName]!;
      }
    }
  }

  if (process.env.VPN_BOUNCE_INSECURE === "true") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.warn("[VPN-PROXY] TLS verification DISABLED (VPN_BOUNCE_INSECURE=true)");
  }

  console.info("[VPN-PROXY] booted");
}

// ── CONNECTIVITY TEST ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function testProxyConnectivity(target: string = "https://httpbin.org/ip"): Promise<{ ok: boolean; ip?: string; error?: string }> {
  try {
    const resp = await proxiedFetch(target, { signal: (AbortSignal as any)?.timeout?.(5000) ?? (undefined as any) });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const data: any = await resp.json().catch(() => ({}));
    return { ok: true, ip: data.origin ?? data.ip ?? "unknown" };
  } catch (err: any) {
    return { ok: false, error: err.message ?? String(err) };
  }
}
