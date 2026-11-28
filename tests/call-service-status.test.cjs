const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")

const source = fs.readFileSync(path.join(__dirname, "../components/calls/call-service-status.tsx"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const moduleUnderTest = { exports: {} }
new Function("module", "exports", "require", code)(moduleUnderTest, moduleUnderTest.exports, require)
const { CallServiceStatusView } = moduleUnderTest.exports
const render = (props) => renderToStaticMarkup(React.createElement(CallServiceStatusView, { onRefresh() {}, ...props }))
const status = {
  callsEnabled: false,
  appIdConfigured: false,
  providerBillingStatus: "unknown",
  periodStart: "2026-11-01T00:00:00.000Z",
  periodEnd: "2026-12-01T00:00:00.000Z",
  completedCallCount: 2,
  recordedDurationSeconds: 125,
}

test("shows manual suspension, missing configuration, unknown provider balance and non-billable usage", () => {
  const html = render({ status, loading: false, error: "" })
  assert.match(html, /Off — new calls blocked/)
  assert.match(html, /Not configured — new calls blocked/)
  assert.match(html, /availability: unknown/)
  assert.match(html, /2\.1/)
  assert.match(html, /not Agora billable participant minutes/)
})

test("shows loading and errors without stale status", () => {
  assert.match(render({ status: null, loading: true, error: "" }), /Loading status/)
  const html = render({ status: null, loading: false, error: "Status request failed (500)." })
  assert.match(html, /Could not check call status/)
  assert.doesNotMatch(html, /New calls:/)
})

test("does not claim configured and enabled means Agora is available", () => {
  const html = render({ status: { ...status, callsEnabled: true, appIdConfigured: true }, loading: false, error: "" })
  assert.match(html, /Enabled/)
  assert.match(html, /Configured/)
  assert.match(html, /availability: unknown/)
})
