const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

const source = fs.readFileSync(path.join(__dirname, "../lib/request-call-end.ts"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const moduleUnderTest = { exports: {} }
let fetchImpl
new Function("module", "exports", "fetch", code)(moduleUnderTest, moduleUnderTest.exports, (...args) => fetchImpl(...args))
const { requestCallEnd } = moduleUnderTest.exports

test("sends a keepalive end action to the correct call", async () => {
  fetchImpl = async (url, options) => {
    assert.equal(url, "/api/admin/customers/call/call%2F123/respond")
    assert.equal(options.keepalive, true)
    assert.deepEqual(JSON.parse(options.body), { action: "end" })
    return { ok: true }
  }
  await requestCallEnd("call/123")
})

test("reports both server rejection and network failures", async () => {
  fetchImpl = async () => ({ ok: false, status: 503 })
  await assert.rejects(requestCallEnd("call"), /HTTP 503/)
  fetchImpl = async () => { throw new Error("offline") }
  await assert.rejects(requestCallEnd("call"), /offline/)
})
