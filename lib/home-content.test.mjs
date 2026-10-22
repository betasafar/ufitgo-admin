import assert from "node:assert/strict"
import { test } from "node:test"
import {
  campaignEnd,
  fromLocalDateTime,
  homeContentRequest,
  toLocalDateTime,
  validateHomeContent,
} from "./home-content.ts"

function config() {
  return {
    revision: 2,
    seasons: {
      hajj: { mode: "automatic", year: null, automaticFallbackEnabled: false },
      ramadan: { mode: "automatic", year: null, automaticFallbackEnabled: false },
    },
    sections: [{
      id: "hajj", title: "Hajj", enabled: false, mode: "manual",
      packageIds: [], fallbackEnabled: false, limit: 5,
    }],
    campaigns: [],
  }
}

function campaign(overrides = {}) {
  return {
    id: "first", title: "First", enabled: true, packageIds: [], fallbackEnabled: false,
    startsAt: "2027-01-01T00:00:00.000Z", endsAt: "2027-02-01T00:00:00.000Z",
    ...overrides,
  }
}

test("automatic seasonal defaults and disabled empty manual sections remain valid", () => {
  assert.equal(validateHomeContent(config()), null)
  const value = config()
  value.sections[0].enabled = true
  assert.equal(validateHomeContent(value), null)
  assert.deepEqual(value.sections[0].packageIds, [])
  assert.equal(value.sections[0].fallbackEnabled, false)
})

test("manual seasons require independently valid selling years", () => {
  const value = config()
  value.seasons.hajj.mode = "manual"
  assert.match(validateHomeContent(value), /hajj/)
  value.seasons.hajj.year = 2027
  assert.equal(validateHomeContent(value), null)
  value.seasons.ramadan.mode = "manual"
  assert.match(validateHomeContent(value), /ramadan/)
})

test("enabled overlaps are rejected, but paused and adjacent campaigns are allowed", () => {
  const value = config()
  value.campaigns = [campaign(), campaign({
    id: "second", title: "Second",
    startsAt: "2027-01-15T00:00:00.000Z", endsAt: "2027-04-15T00:00:00.000Z",
  })]
  assert.match(validateHomeContent(value), /overlap/)
  value.campaigns[1].enabled = false
  assert.equal(validateHomeContent(value), null)
  value.campaigns[1].enabled = true
  value.campaigns[1].startsAt = value.campaigns[0].endsAt
  assert.equal(validateHomeContent(value), null)
})

test("custom multi-month schedules stay valid and end must follow start", () => {
  const value = config()
  value.campaigns = [campaign({ endsAt: "2027-08-18T09:30:00.000Z" })]
  assert.equal(validateHomeContent(value), null)
  value.campaigns[0].endsAt = value.campaigns[0].startsAt
  assert.match(validateHomeContent(value), /end after the start/)
  value.campaigns[0].endsAt = ""
  assert.match(validateHomeContent(value), /end after the start/)
})

test("month presets clamp the day instead of overflowing into the next month", () => {
  assert.equal(campaignEnd("2027-01-31T12:30:00.000Z", 1), "2027-02-28T12:30:00.000Z")
  assert.equal(campaignEnd("2028-01-31T12:30:00.000Z", 1), "2028-02-29T12:30:00.000Z")
  assert.equal(campaignEnd("2027-01-31T12:30:00.000Z", 3), "2027-04-30T12:30:00.000Z")
  assert.equal(campaignEnd("2027-01-31T12:30:00.000Z", 4), "2027-05-31T12:30:00.000Z")
})

test("date input values round-trip between local time and stored UTC", () => {
  const iso = "2027-03-17T12:30:00.000Z"
  assert.equal(fromLocalDateTime(toLocalDateTime(iso)), iso)
  assert.equal(toLocalDateTime("invalid"), "")
  assert.equal(fromLocalDateTime(""), "")
})

test("section titles and package limits are validated", () => {
  const value = config()
  value.sections[0].title = " "
  assert.match(validateHomeContent(value), /title/)
  value.sections[0].title = "Hajj"
  for (const limit of [0, -1, 1.5, 51]) {
    value.sections[0].limit = limit
    assert.match(validateHomeContent(value), /limit/)
  }
})

test("recommendation candidate filters support Hajj and Ramadan years without overriding central seasons", () => {
  const value = config()
  value.sections[0].id = "recommendations"
  value.sections[0].type = "hajj"
  value.sections[0].seasonYear = 2027
  assert.equal(validateHomeContent(value), null)
  value.sections[0].type = "umrah"
  assert.match(validateHomeContent(value), /requires Hajj or Ramadan/)
  value.sections[0].season = "ramadan"
  assert.equal(validateHomeContent(value), null)
  value.sections[0].mode = "automatic"
  assert.equal(validateHomeContent(value), null)
  value.sections[0].type = "hajj"
  assert.match(validateHomeContent(value), /Ramadan candidates must use Umrah/)
  assert.equal(value.seasons.hajj.mode, "automatic")
  assert.equal(value.seasons.ramadan.mode, "automatic")
})

test("requests use the authenticated same-origin admin proxy and retain revision", async (context) => {
  const calls = []
  context.mock.method(globalThis, "fetch", async (...args) => {
    calls.push(args)
    return Response.json(config())
  })
  const value = config()
  const saved = await homeContentRequest("", { method: "PUT", body: JSON.stringify(value) })
  assert.equal(saved.revision, value.revision)
  assert.equal(calls[0][0], "/api/admin/home-content")
  assert.equal(calls[0][1].cache, "no-store")
  assert.equal(calls[0][1].headers["Content-Type"], "application/json")
  assert.deepEqual(JSON.parse(calls[0][1].body), value)
})

test("revision conflicts explain recovery without replacing the unsaved draft", async (context) => {
  context.mock.method(globalThis, "fetch", async () => Response.json({ message: "stale" }, { status: 409 }))
  await assert.rejects(homeContentRequest("", { method: "PUT", body: "{}" }), /Revision conflict.*draft is preserved/)
})

test("upstream validation arrays and non-JSON failures remain actionable", async (context) => {
  const mocked = context.mock.method(globalThis, "fetch", async () => Response.json({ message: ["invalid dates", "overlap"] }, { status: 400 }))
  await assert.rejects(homeContentRequest("/preview", { method: "POST", body: "{}" }), /invalid dates; overlap/)
  mocked.mock.mockImplementation(async () => new Response("upstream unavailable", { status: 502 }))
  await assert.rejects(homeContentRequest(), /502/)
})
