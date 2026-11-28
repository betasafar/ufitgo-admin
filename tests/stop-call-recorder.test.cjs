const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

const source = fs.readFileSync(path.join(__dirname, "../lib/stop-call-recorder.ts"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const moduleUnderTest = { exports: {} }
new Function("module", "exports", code)(moduleUnderTest, moduleUnderTest.exports)
const { stopCallRecorder } = moduleUnderTest.exports

class Recorder extends EventTarget {
  state = "recording"
  stop() { this.state = "inactive" }
}

test("waits for the final stop event before resolving", async () => {
  const recorder = new Recorder()
  let finished = false
  const promise = stopCallRecorder(recorder).then(() => { finished = true })
  await Promise.resolve()
  assert.equal(finished, false)
  recorder.dispatchEvent(new Event("stop"))
  await promise
  assert.equal(finished, true)
})

test("surfaces recorder errors and a missing stop event", async () => {
  const failing = new Recorder()
  const failed = stopCallRecorder(failing)
  failing.dispatchEvent(new Event("error"))
  await assert.rejects(failed, /failed to stop/)
  await assert.rejects(stopCallRecorder(new Recorder(), 5), /did not finish/)
})
