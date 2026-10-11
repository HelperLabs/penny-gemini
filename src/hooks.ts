// Public, static guidance only. These hosts do not attest the audience or
// foreground/subagent identity, so a hook must never fetch private memory.
export const MEMORY_GUIDANCE = "Penny: Use the MyPenny skill only in a private, human-directed foreground conversation where the user is the Penny account owner and has explicitly enabled Penny for this conversation. Installation alone does not enable private memory. If eligibility is unclear, ask the user before reading or saving. Skip private memory in background, scheduled, remote, shared and subagent runs. In an eligible conversation, read the skill, call penny_session_start once, use penny_read before answering from history, and save useful decisions during the task through approved MCP tools. Preserve host approvals. Hooks supply reminders only; they do not read or save memory. Model guidance is not an access-control boundary: disable the Penny MCP server in contexts that must have no private-memory access.";

export interface GeminiHookOutput {
  hookSpecificOutput?: { hookEventName: string; additionalContext: string };
  systemMessage?: string;
}

export function handleGeminiHook(event: string, raw: unknown): GeminiHookOutput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  if (input.hook_event_name !== event || typeof input.session_id !== "string" || !input.session_id || typeof input.cwd !== "string" || !input.cwd) return {};
  if (event === "SessionStart" || event === "BeforeAgent") {
    return { hookSpecificOutput: { hookEventName: event, additionalContext: MEMORY_GUIDANCE } };
  }
  if (event === "PreCompress") {
    return { systemMessage: "Penny: save useful decisions during the task through approved MCP tools in an eligible conversation. This advisory hook does not save memory or guarantee a save before compression." };
  }
  // In particular, AfterAgent must not deny/retry and SessionEnd must not save.
  return {};
}

export function antigravityReminderCommand(): string {
  // The command is constant, self-contained and readable. No host input, file
  // path, environment variable or build argument is interpolated into a shell.
  if (/["'\\$`\r\n]/.test(MEMORY_GUIDANCE)) throw new Error("Unsafe static hook text");
  return `node -e "process.stdin.resume();process.stdout.write(JSON.stringify({injectSteps:[{ephemeralMessage:'${MEMORY_GUIDANCE}'}]}))"`;
}
