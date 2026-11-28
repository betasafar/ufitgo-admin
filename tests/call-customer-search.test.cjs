const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const ts = require("typescript")
const React = require("react")
const { renderToStaticMarkup } = require("react-dom/server")
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query")

const source = fs.readFileSync(path.join(__dirname, "../components/calls/call-customer-search.tsx"), "utf8")
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const moduleUnderTest = { exports: {} }
let fetchImpl
new Function("module", "exports", "require", "fetch", code)(moduleUnderTest, moduleUnderTest.exports, require, (...args) => fetchImpl(...args))
const { searchCallCustomers, CallCustomerSearch } = moduleUnderTest.exports

test("searches the existing customers API with pagination and maps customer details", async () => {
  const signal = new AbortController().signal
  fetchImpl = async (url, options) => {
    const parsed = new URL(url, "https://example.test")
    assert.equal(parsed.pathname, "/api/admin/customers")
    assert.equal(parsed.searchParams.get("search"), "John Adamu")
    assert.equal(parsed.searchParams.get("page"), "2")
    assert.equal(parsed.searchParams.get("limit"), "10")
    assert.equal(options.signal, signal)
    return { ok: true, json: async () => ({ data: [{ id: "123", firstName: "John", lastName: "Adamu", phone: "123" }], totalPages: 3 }) }
  }
  assert.deepEqual(await searchCallCustomers("John Adamu", 2, signal), {
    customers: [{ id: "123", firstName: "John", lastName: "Adamu", email: undefined, phone: "123" }],
    totalPages: 3,
  })
})

test("surfaces API errors and invalid responses", async () => {
  const signal = new AbortController().signal
  fetchImpl = async () => ({ ok: false, status: 403 })
  await assert.rejects(searchCallCustomers("John", 1, signal), /403/)
  fetchImpl = async () => ({ ok: true, json: async () => ({ message: "unexpected" }) })
  await assert.rejects(searchCallCustomers("John", 1, signal), /invalid list/)
  fetchImpl = async () => ({ ok: true, json: async () => ({ data: [{}] }) })
  await assert.rejects(searchCallCustomers("John", 1, signal), /without an ID/)
})

test("renders accessible search and a warning when switching is blocked", () => {
  const queryClient = new QueryClient()
  const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client: queryClient },
    React.createElement(CallCustomerSearch, { disabled: true, onSelect() {} })))
  assert.match(html, /Find a customer to call/)
  assert.match(html, /Customer name, email or phone/)
  assert.match(html, /end any active call/)
})
