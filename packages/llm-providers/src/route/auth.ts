import { Config, Effect, Redacted } from "effect"
import * as ConfigError from "effect/ConfigError"
import { AuthenticationReason, InvalidRequestReason, LLMError, type LLMRequest } from "../schema"

export class MissingCredentialError extends Error {
  readonly _tag = "MissingCredentialError"
  constructor(readonly source: string) {
    super(`Missing auth credential: ${source}`)
  }
}

export type CredentialError = MissingCredentialError | ConfigError.ConfigError
export type AuthError = CredentialError | LLMError

export interface AuthInput {
  readonly request: LLMRequest
  readonly method: "POST" | "GET"
  readonly url: string
  readonly body: string
  readonly headers: Record<string, string>
}

export interface Credential {
  readonly load: Effect.Effect<Redacted.Redacted, CredentialError>
  readonly orElse: (that: Credential) => Credential
  readonly bearer: () => Auth
  readonly header: (name: string) => Auth
  readonly pipe: <A>(f: (self: Credential) => A) => A
}

export interface Auth {
  readonly apply: (input: AuthInput) => Effect.Effect<Record<string, string>, AuthError>
  readonly andThen: (that: Auth) => Auth
  readonly orElse: (that: Auth) => Auth
  readonly pipe: <A>(f: (self: Auth) => A) => A
}

export const isAuth = (input: unknown): input is Auth =>
  typeof input === "object" && input !== null && "apply" in input && typeof input.apply === "function"

const credential = (load: Effect.Effect<Redacted.Redacted, CredentialError>): Credential => {
  const self: Credential = {
    load,
    orElse: (that) => credential(load.pipe(Effect.catchAll(() => that.load))),
    bearer: () => fromCredential(self, (secret) => ({ authorization: `Bearer ${secret}` })),
    header: (name) => fromCredential(self, (secret) => ({ [name]: secret })),
    pipe: (f) => f(self),
  }
  return self
}

const auth = (apply: Auth["apply"]): Auth => {
  const self: Auth = {
    apply,
    andThen: (that) =>
      auth((input) => apply(input).pipe(Effect.flatMap((headers) => that.apply({ ...input, headers })))),
    orElse: (that) => auth((input) => apply(input).pipe(Effect.catchAll(() => that.apply(input)))),
    pipe: (f) => f(self),
  }
  return self
}

const fromCredential = (source: Credential, render: (secret: string) => Record<string, string>) =>
  auth((input) =>
    source.load.pipe(Effect.map((secret) => ({ ...input.headers, ...render(Redacted.value(secret)) }))),
  )

const secretEffect = (secret: string | Redacted.Redacted, source: string) => {
  const redacted = typeof secret === "string" ? Redacted.make(secret) : secret
  if (Redacted.value(redacted) === "") return Effect.fail(new MissingCredentialError(source))
  return Effect.succeed(redacted)
}

const credentialFromSecret = (secret: string | Redacted.Redacted | Config.Config<string | Redacted.Redacted>, source: string) => {
  if (typeof secret === "string" || Redacted.isRedacted(secret)) return credential(secretEffect(secret, source))
  return credential(Effect.gen(function* () {
    return yield* secretEffect(yield* secret, source)
  }))
}

export const value = (secret: string, source = "value") => credentialFromSecret(secret, source)

export const optional = (secret: string | Redacted.Redacted | Config.Config<string | Redacted.Redacted> | undefined, source = "optional value") =>
  secret === undefined
    ? credential(Effect.fail(new MissingCredentialError(source)))
    : credentialFromSecret(secret, source)

export const config = (name: string) => credentialFromSecret(Config.redacted(name), name)

export const effect = (load: Effect.Effect<Redacted.Redacted, CredentialError>) => credential(load)

export const none = auth((input) => Effect.succeed(input.headers))

export const headers = (input: Record<string, string>) =>
  auth((inputAuth) => Effect.succeed({ ...inputAuth.headers, ...input }))

export const remove = (name: string) => auth((input) => {
  const { [name]: _, ...rest } = input.headers
  return Effect.succeed(rest)
})

export const custom = (apply: (input: AuthInput) => Effect.Effect<Record<string, string>, LLMError>) => auth(apply)

export const passthrough = none

const credentialInput = (source: string | Redacted.Redacted | Config.Config<string | Redacted.Redacted> | Credential) =>
  typeof source === "string" || Redacted.isRedacted(source) || Config.isConfig(source)
    ? credentialFromSecret(source, "value")
    : source

export function bearer(source: string | Redacted.Redacted | Config.Config<string | Redacted.Redacted> | Credential): Auth {
  return credentialInput(source).bearer()
}

export const apiKey = bearer

export function header(name: string): (source: string | Redacted.Redacted | Config.Config<string | Redacted.Redacted> | Credential) => Auth
export function header(name: string, source: string | Redacted.Redacted | Config.Config<string | Redacted.Redacted> | Credential): Auth
export function header(name: string, source?: any) {
  if (source === undefined) {
    return (next: any) => credentialInput(next).header(name)
  }
  return credentialInput(source).header(name)
}

const toLLMError = (error: AuthError): LLMError => {
  if (error instanceof MissingCredentialError) {
    return new LLMError({
      module: "Auth",
      method: "apply",
      reason: new AuthenticationReason({ message: error.message, kind: "missing" }),
    })
  }
  if (ConfigError.isConfigError(error)) {
    return new LLMError({
      module: "Auth",
      method: "apply",
      reason: new InvalidRequestReason({ message: `Failed to resolve auth config: ${error.message}` }),
    })
  }
  return error
}

export const toEffect =
  (input: Auth) =>
  (authInput: AuthInput): Effect.Effect<Record<string, string>, LLMError> =>
    input.apply(authInput).pipe(Effect.mapError(toLLMError))

export * as Auth from "./auth"