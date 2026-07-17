import { Context, Effect, Layer, Schema, Stream } from "effect"
import { type Auth as AuthDef } from "./auth"
import { Endpoint, type EndpointPatch } from "./endpoint"
import type { Transport, TransportRuntime } from "./transport"
import type { Protocol } from "./protocol"
import type { LLMError, LLMEvent, PreparedRequestOf, ProtocolID, ProviderOptions } from "../schema"
import {
  GenerationOptions,
  HttpOptions,
  LLMRequest,
  LLMResponse,
  Model,
  ModelLimits,
  LLMError as LLMErrorClass,
  PreparedRequest,
  ProviderID,
  LLMResponseHelpers,
  mergeGenerationOptions,
  mergeHttpOptions,
  mergeProviderOptions,
} from "../schema"
import { InvalidRequestReason, NoRouteReason, InvalidProviderOutputReason } from "../schema/errors"


export interface RouteBody<Body> {
  readonly schema: Schema.Schema<Body, unknown>
  readonly from: (request: LLMRequest) => Effect.Effect<Body, LLMError>
}

export interface Route<Body, Prepared = unknown> {
  readonly id: string
  readonly provider?: ProviderID
  readonly protocol: ProtocolID
  readonly endpoint: Endpoint<Body>
  readonly auth: AuthDef
  readonly transport: Transport<Body, Prepared, unknown>
  readonly defaults: RouteDefaults
  readonly body: RouteBody<Body>
  readonly with: (patch: RoutePatch<Body, Prepared>) => Route<Body, Prepared>
  readonly model: (input: RouteMappedModelInput) => Model
  readonly prepareTransport: (body: Body, request: LLMRequest) => Effect.Effect<Prepared, LLMError>
  readonly streamPrepared: (prepared: Prepared, request: LLMRequest, runtime: TransportRuntime) => Stream.Stream<LLMEvent, LLMError>
}

export type AnyRoute = Route<any, any>

export type RouteModelInput = Omit<Model.Input, "provider" | "route">
export type RouteRoutedModelInput = Omit<Model.Input, "route">

export interface RouteDefaults {
  readonly headers?: Record<string, string>
  readonly limits?: ModelLimits
  readonly generation?: GenerationOptions
  readonly providerOptions?: ProviderOptions
  readonly http?: HttpOptions
}

export interface RouteDefaultsInput {
  readonly headers?: Record<string, string>
  readonly limits?: ConstructorParameters<typeof ModelLimits>[0]
  readonly generation?: ConstructorParameters<typeof GenerationOptions>[0]
  readonly providerOptions?: ProviderOptions
  readonly http?: ConstructorParameters<typeof HttpOptions>[0]
}

export type BodyTransform<Body> = (body: Body, request: LLMRequest) => Body

export interface RoutePatch<Body, Prepared> extends RouteDefaultsInput {
  readonly id?: string
  readonly provider?: string | ProviderID
  readonly auth?: AuthDef
  readonly transport?: Transport<Body, Prepared, unknown>
  readonly endpoint?: EndpointPatch<Body>
  readonly bodyTransform?: BodyTransform<Body>
}

type RouteMappedModelInput = RouteModelInput | RouteRoutedModelInput

const makeRouteModel = (route: AnyRoute, mapped: RouteMappedModelInput) => {
  const provider = route.provider ?? ("provider" in mapped ? mapped.provider : undefined)
  if (!provider) throw new Error(`Route.model(${route.id}) requires a provider`)
  return Model.make({ ...(mapped as any), provider, route: route.id })
}

function make<Body, Prepared, Frame>(
  input: RouteInput<Body, Prepared, Frame>,
): Route<Body, Prepared> {
  const route: Route<Body, Prepared> = {
    id: input.id,
    provider: input.provider as ProviderID | undefined,
    protocol: input.protocol.id as unknown as ProtocolID,
    endpoint: input.endpoint as Endpoint<Body>,
    auth: input.auth,
    transport: input.transport as Transport<Body, Prepared, unknown>,
    defaults: input.defaults as RouteDefaults,
    body: input.protocol.body as RouteBody<Body>,

    with: (patch) =>
      make({
        ...input,
        id: patch.id ?? input.id,
        provider: patch.provider ?? input.provider,
        auth: patch.auth ?? input.auth,
        transport: patch.transport ?? input.transport,
        endpoint: patch.endpoint !== undefined
          ? { ...(input.endpoint as any), ...patch.endpoint }
          : input.endpoint,
        defaults: { ...input.defaults, ...patch } as any,
        bodyTransform: patch.bodyTransform ?? input.bodyTransform,
      } as RouteInput<Body, Prepared, Frame>),

    model: (mapped) => makeRouteModel(route as any, mapped as any),

    prepareTransport: (body, request) => {
      const transform = input.bodyTransform ?? ((b: Body) => b)
      const transformed = transform(body, request)
      return input.transport.prepare({
        body: transformed,
        request,
        endpoint: input.endpoint as Endpoint<Body>,
        auth: input.auth,
        encodeBody: (b) => JSON.stringify(b),
      }) as Effect.Effect<Prepared, LLMError>
    },

    streamPrepared: (prepared, request, runtime) => {
      const frameStream = input.transport.frames(prepared as any, request, runtime) as any
      const ps = input.protocol.stream

      let state = ps.initial(request)
      let terminalReached = false

      const processed = (frameStream as any).pipe(
        Stream.filter(() => !terminalReached),
        Stream.mapEffect((frame: unknown) =>
          Effect.gen(function* () {
            const event = yield* Schema.decodeUnknown(ps.event)(frame).pipe(
              Effect.mapError((err) =>
                new LLMErrorClass({
                  module: "Route",
                  method: "streamPrepared",
                  reason: new InvalidRequestReason({ message: `Failed to decode frame: ${(err as any).message}` }),
                }),
              ),
            )
            const [newState, events] = yield* ps.step(state, event)
            state = newState
            if (ps.terminal?.(event)) terminalReached = true
            return events
          }),
        ),
        Stream.flatMap((events: ReadonlyArray<LLMEvent>) => Stream.fromIterable(events)),
      )

      return Stream.concat(
        processed,
        Stream.suspend(() => {
          const haltEvents = ps.onHalt?.(state) ?? []
          return Stream.fromIterable(haltEvents)
        }),
      ) as any
    },
  }
  return route
}

export interface RouteInput<Body, Prepared, Frame> {
  readonly id: string
  readonly provider?: string | ProviderID
  readonly protocol: Protocol<Body, Frame, any, any>
  readonly endpoint: Endpoint<Body>
  readonly auth: AuthDef
  readonly transport: Transport<Body, Prepared, Frame>
  readonly defaults?: RouteDefaultsInput
  readonly bodyTransform?: BodyTransform<Body>
}

const Route = { make }

export { Route }

const authAndDefaults = (route: AnyRoute, request: LLMRequest) => {
  const defaults = route.defaults
  return {
    ...request,
    headers: defaults?.headers,
    generation: mergeGenerationOptions(defaults?.generation, request.generation),
    http: mergeHttpOptions(defaults?.http, request.http),
    providerOptions: mergeProviderOptions(defaults?.providerOptions, request.providerOptions),
  }
}

export interface Interface {
  readonly prepare: <Body = unknown>(request: LLMRequest) => Effect.Effect<PreparedRequestOf<Body>, LLMError>
  readonly stream: (request: LLMRequest) => Stream.Stream<LLMEvent, LLMError>
  readonly generate: (request: LLMRequest) => Effect.Effect<LLMResponse, LLMError>
}

export const Service = Context.GenericTag<Interface>("@doktor/LLM/LLMClient")

function streamPrepared(
  routes: ReadonlyArray<AnyRoute>,
  request: LLMRequest,
  prepared: PreparedRequest,
  runtime: TransportRuntime,
): Stream.Stream<LLMEvent, LLMError> {
  const route = routes.find((r) => r.id === prepared.route)
  if (!route) return Stream.fail(new LLMErrorClass({
    module: "LLMClient", method: "streamPrepared",
    reason: new InvalidRequestReason({ message: `No route found for ${prepared.route}` }),
  }))
  return route.streamPrepared(prepared.body as any, request, runtime)
}

const prepareRequest = (routes: ReadonlyArray<AnyRoute>, request: LLMRequest): Effect.Effect<[AnyRoute, PreparedRequest], LLMError> =>
  Effect.gen(function* () {
    const model = request.model
    const routeId = typeof model.route === 'string' ? model.route : model.route?.id
    const route = routes.find((r) => r.id === routeId)
    if (!route) return yield* Effect.fail(new LLMErrorClass({
      module: "LLMClient", method: "prepare",
      reason: new NoRouteReason({ route: model.route.id, provider: model.provider as any, model: model.id as any }),
    }))
    const merged = authAndDefaults(route, request)
    const body = yield* route.body.from(merged as LLMRequest)
    const prepared = yield* route.prepareTransport(body, merged as LLMRequest)

    return [
      route,
      new PreparedRequest({
        id: request.id ?? crypto.randomUUID(),
        route: route.id,
        protocol: route.protocol,
        model: request.model,
        body: prepared,
      }),
    ] as const
  })

export const layer = (
  routes: ReadonlyArray<AnyRoute>,
): Layer.Layer<Interface, never, never> =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const runtime: TransportRuntime = {
        http: {
          execute: (url, body, headers) =>
            Effect.tryPromise({
              try: async () => {
                console.log("[fetch] URL:", url, "routes:", routes.map(r => r.id))
                const res = await fetch(url, { method: "POST", headers, body })
                return {
                  status: res.status,
                  headers: Object.fromEntries(res.headers.entries()),
                  text: Effect.promise(() => res.text()),
                  stream: res.body,
                }
              },
              catch: (err) => new Error(`HTTP request failed: ${err}`),
            }),
        },
      }

      return Service.of({
        prepare: (request) =>
          Effect.gen(function* () {
            const [, prepared] = yield* prepareRequest(routes, request)
            return prepared as any
          }),

        stream: (request) =>
          Stream.unwrap(
            Effect.gen(function* () {
              const [_route, prepared] = yield* prepareRequest(routes, request)
              return streamPrepared(routes, request, prepared, runtime) as any
            }),
          ),

        generate: (request) =>
          Effect.gen(function* () {
            const [_route, prepared] = yield* prepareRequest(routes, request)
            const events: Array<LLMEvent> = []
            const stream_ = streamPrepared(routes, request, prepared, runtime)
            const collected = yield* Stream.runCollect(stream_)
            for (const event of collected) { events.push(event) }
            const state = events.reduce(
              (s, e) => LLMResponseHelpers.reduce(s, e),
              LLMResponseHelpers.empty(),
            )
            const response = LLMResponseHelpers.complete(state)
            if (response) return response
            return yield* Effect.fail(new LLMErrorClass({
              module: "LLMClient", method: "generate",
              reason: new InvalidProviderOutputReason({ message: "No finish event received", raw: JSON.stringify(events) }),
            }))
          }),
      })
    }),
  )