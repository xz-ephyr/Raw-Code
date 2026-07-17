import type { LLMRequest } from "../schema"

export interface EndpointInput<Body> {
  readonly request: LLMRequest
  readonly body: Body
}

export type EndpointPart<Body> = string | ((input: EndpointInput<Body>) => string)

export interface Endpoint<Body> {
  readonly baseURL?: string
  readonly path: EndpointPart<Body>
  readonly query?: Record<string, string>
}

export type EndpointPatch<Body> = Partial<Endpoint<Body>>

export const path = <Body>(value: EndpointPart<Body>, options: Omit<Endpoint<Body>, "path"> = {}): Endpoint<Body> => ({
  ...options,
  path: value,
})

export const merge = <Body>(base: Endpoint<Body>, patch: EndpointPatch<Body>): Endpoint<Body> => ({
  ...base,
  ...patch,
  baseURL: patch.baseURL ?? base.baseURL,
  path: patch.path ?? base.path,
  query: patch.query === undefined ? base.query : { ...base.query, ...patch.query },
})

const renderPart = <Body>(part: EndpointPart<Body>, input: EndpointInput<Body>) =>
  typeof part === "function" ? part(input) : part

export const render = <Body>(endpoint: Endpoint<Body>, input: EndpointInput<Body>) => {
  const base = (endpoint.baseURL ?? "").replace(/\/+$/, "")
  const path = renderPart(endpoint.path, input)
  console.log("[render] endpoint.path:", JSON.stringify(endpoint.path), "base:", JSON.stringify(base), "path:", JSON.stringify(path))

  // Defensive check: if the path evaluator returned undefined/null, fail fast with a clear message.
  if (path === undefined || path === null) {
    throw new Error(
      `[Endpoint.render] endpoint.path evaluated to ${String(path)} for endpoint=${JSON.stringify(endpoint)}; ` +
      `ensure the endpoint.path is a string or a function that returns a string for the given request`,
    )
  }

  if (base.startsWith("/")) {
    return `${base}${path}`
  }

  const url = new URL(`${base}${path}`)
  for (const [key, value] of Object.entries(endpoint.query ?? {})) url.searchParams.set(key, value)
  return url
}

export * as Endpoint from "./endpoint"
