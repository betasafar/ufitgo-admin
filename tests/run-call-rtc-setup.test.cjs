const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

const source = fs.readFileSync(path.join(__dirname, "../lib/run-call-rtc-setup.ts"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const moduleUnderTest = { exports: {} }
new Function("module", "exports", "console", code)(moduleUnderTest, moduleUnderTest.exports, { info: () => {} })
const { runCallRtcSetup } = moduleUnderTest.exports

test("ending a call while joining does not report the expected abort as a failure", async () => {
  let aborted = false
  let rejectJoin
  let failureCalls = 0
  const join = new Promise((_, reject) => { rejectJoin = reject })
  const result = runCallRtcSetup(() => join, () => aborted, async () => { failureCalls++ })
  aborted = true
  rejectJoin(new Error("AgoraRTCError WS_ABORT"))
  assert.equal(await result, false)
  assert.equal(failureCalls, 0)
})

test("real setup failures are cleaned up and propagated", async () => {
  let failureCalls = 0
  await assert.rejects(
    runCallRtcSetup(async () => { throw new Error("join failed") }, () => false, async () => { failureCalls++ }),
    /join failed/,
  )
  assert.equal(failureCalls, 1)
})

test("successful setup does not continue after cancellation", async () => {
  assert.equal(await runCallRtcSetup(async () => {}, () => true, async () => {}), false)
  assert.equal(await runCallRtcSetup(async () => {}, () => false, async () => {}), true)
})
