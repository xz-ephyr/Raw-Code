import { Stream, Effect } from "effect"

// Minimal test — is Effect working?
const prog = Effect.sync(() => console.log("effect works!"))
Effect.runPromise(prog).catch((e) => console.log("FAIL:", e))

// Minimal Stream test
const s = Stream.fromIterable([1, 2, 3])
Effect.runPromise(Stream.runCollect(s)).then((c) => console.log("stream works:", [...c]))
