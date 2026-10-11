import { handleGeminiHook } from "./hooks";

// Native hooks receive a whole turn payload. Bound it, never read the transcript
// path, never log input/errors, and fail open with JSON only on stdout.
let bytes = 0;
let input = "";
let finished = false;
const eventIndex = process.argv.indexOf("--event");
const event = eventIndex >= 0 ? process.argv[eventIndex + 1] ?? "" : "";
const finish = (raw?: unknown) => {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  process.stdin.pause();
  process.stdout.write(`${JSON.stringify(handleGeminiHook(event, raw))}\n`, () => process.exit(0));
};
const timer = setTimeout(() => finish(), 3500);
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  bytes += Buffer.byteLength(chunk, "utf8");
  if (bytes > 64 * 1024) { finish(); return; }
  input += chunk;
});
process.stdin.on("error", () => finish());
process.stdin.on("end", () => {
  try { finish(JSON.parse(input)); } catch { finish(); }
});
