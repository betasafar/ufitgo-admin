const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

function load(file, dependencies, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8")
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  const requireMock = (name) => {
    if (name in dependencies) return dependencies[name]
    return require(name)
  }
  const names = Object.keys(globals)
  new Function("module", "exports", "require", ...names, code)(module, module.exports, requireMock, ...Object.values(globals))
  return module.exports
}

class SessionRequestError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

function providerHarness() {
  let now = 1_000_000_000
  const absoluteExpiry = now + 12 * 60 * 60 * 1000
  let touchFailure = null
  let refreshFailure = null
  let touches = 0
  let refreshes = 0
  let logouts = 0
  let redirected = 0
  const states = []
  const effects = []
  const listeners = new Map()
  const storage = new Map()
  let timer
  const session = () => ({ absoluteExpiresAt: new Date(absoluteExpiry).toISOString() })
  const router = { replace: () => { redirected++ }, refresh: () => {} }
  const React = {
    createContext: () => ({ Provider: "provider" }),
    useContext: () => null,
    useRef: (value) => ({ current: value }),
    useState: (value) => {
      const index = states.length
      states.push(value)
      return [value, (next) => { states[index] = next }]
    },
    useCallback: (callback) => callback,
    useEffect: (effect) => { effects.push(effect) },
  }
  const fakeWindow = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
    setInterval: (handler) => { timer = handler; return 1 },
    clearInterval: () => {},
  }
  const fakeDocument = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} }
  const fakeStorage = { setItem: (key, value) => storage.set(key, value) }
  class FakeDate extends Date { static now() { return now } }
  const { SessionProvider } = load("components/auth/session-provider.tsx", {
    react: React,
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "next/navigation": { useRouter: () => router },
    "@/components/auth/session-timeout-dialog": { SessionTimeoutDialog: "dialog" },
    "@/lib/auth/session-client": {
      SessionRequestError,
      touchCurrentSession: async () => { touches++; if (touchFailure) throw touchFailure; return session() },
      refreshAccessToken: async () => { refreshes++; if (refreshFailure) throw refreshFailure; return { session: session() } },
      logoutCurrentSession: async () => { logouts++ },
    },
    "@/lib/rbac/permissions": { hasAllPermissions: () => true, hasAnyPermission: () => true },
  }, { window: fakeWindow, document: fakeDocument, localStorage: fakeStorage, Date: FakeDate, console: { error() {} } })
  const result = SessionProvider({ children: null, initialAdmin: { id: 1 } })
  const cleanups = effects.map((effect) => effect())
  const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve() }
  return {
    result, states, listeners, storage, flush,
    get counts() { return { touches, refreshes, logouts, redirected } },
    failTouch(error) { touchFailure = error },
    failRefresh(error) { refreshFailure = error },
    async advance(seconds) {
      for (let i = 0; i < seconds; i++) { now += 1000; timer(); await flush() }
    },
    cleanup() { cleanups.forEach((cleanup) => cleanup?.()) },
  }
}

test("a call keeps the session alive beyond 15 minutes, then idle expiry resumes", async () => {
  const h = providerHarness()
  await h.flush()
  h.result.props.value.setCallActive(true)
  await h.advance(16 * 60 + 17)
  assert.equal(h.counts.logouts, 0)
  assert.ok(h.counts.touches >= 16)
  assert.ok(h.counts.refreshes >= 1)
  assert.ok(h.storage.has("ufitgo-admin-activity-1"))
  h.result.props.value.setCallActive(false)
  await h.advance(15 * 60 - 1)
  assert.equal(h.counts.logouts, 0)
  await h.advance(1)
  assert.equal(h.counts.logouts, 1)
  assert.equal(h.counts.redirected, 1)
  h.cleanup()
})

test("temporary touch and refresh failures warn and retry without logging out", async () => {
  const h = providerHarness()
  await h.flush()
  h.result.props.value.setCallActive(true)
  h.failTouch(new SessionRequestError("unavailable", 503))
  await h.advance(60)
  assert.equal(h.states[3], true)
  assert.equal(h.counts.logouts, 0)
  const failedTouches = h.counts.touches
  h.failTouch(null)
  await h.advance(10)
  assert.ok(h.counts.touches > failedTouches)
  assert.equal(h.states[3], false)
  h.failRefresh(new SessionRequestError("unavailable", 503))
  await h.advance(530)
  assert.equal(h.states[3], true)
  assert.equal(h.counts.logouts, 0)
  h.failRefresh(null)
  await h.advance(10)
  assert.equal(h.states[3], false)
  h.cleanup()
})

test("the absolute session limit is still enforced during a call", async () => {
  const h = providerHarness()
  await h.flush()
  h.result.props.value.setCallActive(true)
  await h.advance(12 * 60 * 60)
  assert.equal(h.counts.logouts, 1)
  assert.equal(h.counts.redirected, 1)
  h.cleanup()
})

test("a rejected session logs out, but activity from another tab delays idle expiry", async () => {
  const h = providerHarness()
  await h.flush()
  await h.advance(14 * 60)
  h.listeners.get("storage")({ key: "ufitgo-admin-activity-1", newValue: String(1_000_000_000 + 14 * 60_000) })
  await h.advance(2 * 60)
  assert.equal(h.counts.logouts, 0)
  h.failTouch(new SessionRequestError("expired", 401))
  h.listeners.get("pointerdown")()
  await h.flush()
  assert.equal(h.counts.logouts, 1)
  h.cleanup()
})

test("pointer movement counts as activity", async () => {
  const h = providerHarness()
  await h.flush()
  await h.advance(14 * 60)
  h.listeners.get("pointermove")()
  await h.flush()
  await h.advance(2 * 60)
  assert.equal(h.counts.logouts, 0)
  h.cleanup()
})

test("session client retries refresh conflicts and serializes updates", async () => {
  let calls = 0
  let locks = 0
  const client = load("lib/auth/session-client.ts", {}, {
    navigator: { locks: { request: async (_name, run) => { locks++; return run() } } },
    fetch: async () => {
      calls++
      return { ok: calls > 1, status: calls > 1 ? 200 : 409, json: async () => calls > 1 ? { session: {} } : { message: "retry" } }
    },
    setTimeout: (callback) => { callback(); return 1 },
  })
  await client.refreshAccessToken()
  assert.equal(calls, 2)
  assert.equal(locks, 1)
})

test("refresh gateway distinguishes expired sessions from conflicts and service failures", async () => {
  let status = 401
  let header = "rotated-token"
  const server = load("lib/auth/server-refresh.ts", {
    "@/lib/auth/config": { getAdminApiUrl: (url) => url },
    "@/lib/auth/cookies": { refreshTokenFromHeader: (value) => value },
  }, {
    fetch: async () => ({
      ok: status === 200, status,
      headers: { get: () => header },
      json: async () => ({ access_token: "access" }),
    }),
  })
  assert.equal(await server.refreshAdminSession("old-token"), null)
  status = 409
  await assert.rejects(server.refreshAdminSession("old-token"), (error) => error.status === 409)
  status = 503
  await assert.rejects(server.refreshAdminSession("old-token"), (error) => error.status === 503)
  status = 200
  header = null
  await assert.rejects(server.refreshAdminSession("old-token"), (error) => error.status === 503)
  header = "rotated-token"
  assert.equal((await server.refreshAdminSession("old-token")).refreshToken, "rotated-token")
})

test("sign out all refreshes an expired access token and preserves cookies on service errors", async () => {
  let cookies = { refresh: "refresh-token" }
  let status = 200
  let refreshFailure = null
  let refreshCalls = 0
  class RefreshUnavailableError extends Error {
    constructor(code) { super("unavailable"); this.status = code }
  }
  const route = load("app/api/auth/logout-all/route.ts", {
    "next/headers": { cookies: async () => ({ get: (name) => cookies[name] ? { value: cookies[name] } : undefined }) },
    "next/server": { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    "@/lib/auth/config": { getAdminApiUrl: (url) => url },
    "@/lib/auth/cookies": {
      AUTH_COOKIES: { access: "access", refresh: "refresh" },
      clearAuthCookies: (response) => { response.cleared = true },
      setAuthCookies: (response) => { response.updated = true },
    },
    "@/lib/auth/server-refresh": {
      RefreshUnavailableError,
      refreshAdminSession: async () => {
        refreshCalls++
        if (refreshFailure) throw refreshFailure
        return { result: { access_token: "new-access" }, refreshToken: "new-refresh" }
      },
    },
  }, {
    fetch: async () => ({ ok: status === 200, status }),
    console: { error() {} },
  })
  const request = { headers: { get: () => null } }
  let response = await route.POST(request)
  assert.equal(response.status, 200)
  assert.equal(response.cleared, true)
  assert.equal(refreshCalls, 1)

  status = 503
  response = await route.POST(request)
  assert.equal(response.status, 503)
  assert.equal(response.updated, true)
  assert.equal(response.cleared, undefined)

  cookies = { access: "access-token", refresh: "refresh-token" }
  response = await route.POST(request)
  assert.equal(response.status, 503)
  assert.equal(response.cleared, undefined)
  cookies = { refresh: "refresh-token" }
  refreshFailure = new RefreshUnavailableError(409)
  response = await route.POST(request)
  assert.equal(response.status, 409)
  assert.equal(response.cleared, undefined)
})

test("admin proxy preserves rotated cookies when the retried backend request fails", async () => {
  let fetchCalls = 0
  let failure = "fetch"
  class MockResponse {
    constructor(body, options = {}) { this.body = body; this.status = options.status ?? 200 }
    static json(body, options = {}) { return new MockResponse(body, options) }
  }
  const route = load("app/api/admin/[...path]/route.ts", {
    "next/headers": { cookies: async () => ({ get: (name) => name === "refresh" ? { value: "old-refresh" } : undefined }) },
    "next/server": { NextResponse: MockResponse },
    "@/lib/auth/config": { getAdminApiUrl: (url) => `https://admin.example.invalid${url}` },
    "@/lib/auth/cookies": {
      AUTH_COOKIES: { access: "access", refresh: "refresh" },
      clearAuthCookies: (response) => { response.cleared = true },
      setAuthCookies: (response) => { response.updated = true },
    },
    "@/lib/auth/server-refresh": {
      RefreshUnavailableError: class extends Error {},
      refreshAdminSession: async () => ({ result: { access_token: "new-access" }, refreshToken: "new-refresh" }),
    },
  }, {
    fetch: async () => {
      fetchCalls++
      if (failure === "fetch") throw new Error("offline")
      return { status: 200, headers: new Headers(), arrayBuffer: async () => { throw new Error("interrupted") } }
    },
    console: { error() {} },
  })
  const request = {
    method: "GET",
    headers: new Headers(),
    nextUrl: { origin: "https://example.invalid", search: "" },
  }
  const context = { params: Promise.resolve({ path: ["customers"] }) }
  let response = await route.GET(request, context)
  assert.equal(response.status, 503)
  assert.equal(response.updated, true)
  assert.equal(response.cleared, undefined)
  failure = "body"
  response = await route.GET(request, context)
  assert.equal(response.status, 503)
  assert.equal(response.updated, true)
  assert.equal(fetchCalls, 2)
})
