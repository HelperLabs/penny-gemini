// src/hooks.ts
var MEMORY_GUIDANCE = "Penny: Use the MyPenny skill only in a private, human-directed foreground conversation where the user is the Penny account owner and has explicitly enabled Penny for this conversation. Installation alone does not enable private memory. If eligibility is unclear, ask the user before reading or saving. Skip private memory in background, scheduled, remote, shared and subagent runs. In an eligible conversation, read the skill, call penny_session_start once, use penny_read before answering from history, and save useful decisions during the task through approved MCP tools. Preserve host approvals. Hooks supply reminders only; they do not read or save memory. Model guidance is not an access-control boundary: disable the Penny MCP server in contexts that must have no private-memory access.";
function handleGeminiHook(event2, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input2 = raw;
  if (input2.hook_event_name !== event2 || typeof input2.session_id !== "string" || !input2.session_id || typeof input2.cwd !== "string" || !input2.cwd) return {};
  if (event2 === "SessionStart" || event2 === "BeforeAgent") {
    return { hookSpecificOutput: { hookEventName: event2, additionalContext: MEMORY_GUIDANCE } };
  }
  if (event2 === "PreCompress") {
    return { systemMessage: "Penny: save useful decisions during the task through approved MCP tools in an eligible conversation. This advisory hook does not save memory or guarantee a save before compression." };
  }
  return {};
}

// src/gemini_hook.ts
var bytes = 0;
var input = "";
var finished = false;
var eventIndex = process.argv.indexOf("--event");
var event = eventIndex >= 0 ? process.argv[eventIndex + 1] ?? "" : "";
var finish = (raw) => {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  process.stdin.pause();
  process.stdout.write(`${JSON.stringify(handleGeminiHook(event, raw))}
`, () => process.exit(0));
};
var timer = setTimeout(() => finish(), 3500);
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  bytes += Buffer.byteLength(chunk, "utf8");
  if (bytes > 64 * 1024) {
    finish();
    return;
  }
  input += chunk;
});
process.stdin.on("error", () => finish());
process.stdin.on("end", () => {
  try {
    finish(JSON.parse(input));
  } catch {
    finish();
  }
});
