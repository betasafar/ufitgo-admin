const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

const source = fs.readFileSync(path.join(__dirname, "../lib/call-rtc-connection.ts"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const moduleUnderTest = { exports: {} }
new Function("module", "exports", code)(moduleUnderTest, moduleUnderTest.exports)
const { getCallRtcConnection } = moduleUnderTest.exports

test("reports connection interruption, recovery and unexpected disconnection", () => {
  assert.equal(getCallRtcConnection("CONNECTED", false), "connected")
  assert.equal(getCallRtcConnection("RECONNECTING", true), "reconnecting")
  assert.equal(getCallRtcConnection("CONNECTED", true), "connected")
  assert.equal(getCallRtcConnection("DISCONNECTED", true), "failed")
})

test("does not mistake initial or intentional disconnecting states for a dropped call", () => {
  assert.equal(getCallRtcConnection("DISCONNECTED", false), null)
  assert.equal(getCallRtcConnection("CONNECTING", false), null)
  assert.equal(getCallRtcConnection("DISCONNECTING", true), null)
})
