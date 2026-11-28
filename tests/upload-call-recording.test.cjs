const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")

const source = fs.readFileSync(path.join(__dirname, "../lib/upload-call-recording.ts"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const payload = { audioBase64: "audio", mimeType: "audio/webm", transcriptText: "hello", notes: "", durationSeconds: 2 }

function setup(fetch) {
  const moduleUnderTest = { exports: {} }
  new Function("module", "exports", "fetch", "console", code)(
    moduleUnderTest, moduleUnderTest.exports, fetch, { warn: () => {} },
  )
  return moduleUnderTest.exports.uploadCallRecording
}

test("saves audio and transcript to the actual call", async () => {
  const requests = []
  const upload = setup(async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) })
    return { ok: true, json: async () => ({ data: { recordingUrl: "audio-url", transcript: "hello" } }) }
  })
  assert.equal(await upload("new/call", payload), "saved")
  assert.equal(requests[0].url, "/api/admin/customers/call/new%2Fcall/recording")
  assert.deepEqual(requests[0].body, payload)
})

test("retries captions only when audio is missing from a successful response", async () => {
  const requests = []
  const upload = setup(async (_url, options) => {
    requests.push(JSON.parse(options.body))
    return { ok: true, json: async () => ({ data: { transcript: "hello" } }) }
  })
  assert.equal(await upload("call", payload), "captions-only")
  assert.equal(requests[1].audioBase64, undefined)
  assert.equal(requests[1].transcriptText, "hello")
})

test("reports failure when audio and captions cannot be saved", async () => {
  const upload = setup(async () => { throw new Error("offline") })
  assert.equal(await upload("call", payload), "failed")
})
