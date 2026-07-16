export interface AuthOptions {
  readonly apiKey?: string
  readonly auth?: any
}

export type ProviderAuthOption = { readonly apiKey?: string; readonly auth?: any }

export type ApiKeyMode = "bearer" | "header" | "query"

export type AuthOverride = { readonly apiKey?: string; readonly auth?: any }

import { Auth } from "./auth"

export namespace AuthOptions {
  export const bearer = (options: ProviderAuthOption, envVar: string) => {
    if (options.auth) return options.auth
    if (options.apiKey) return Auth.bearer(options.apiKey)
    return Auth.config(envVar)
  }
}
