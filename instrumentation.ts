// Runs once when the Next.js server starts. Node-only modules live in a
// separate file so the Edge bundle never sees them (see Next's
// instrumentation docs, "Specifying the runtime").
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node")
  }
}
