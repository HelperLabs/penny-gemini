# Penny session eligibility

Installation does not authorize private memory in every session. Activate the
MyPenny skill only when the user explicitly enables Penny for the current
conversation (for example, with `/penny:start`), the user owns the authenticated
Penny account, and this is a private, human-directed foreground conversation.
Ask before reading or saving if any of those facts is unclear. This eligibility
rule applies before the skill's automatic session-start and recall guidance.

Skip private-memory tools in background, scheduled, headless, remote, shared
and subagent runs. Do not forward profile blocks or private notes to subagents.
Enabling Penny in one conversation does not enable it in another.

In an eligible conversation, read `skills/mypenny/SKILL.md`, call
`penny_session_start` once, use `penny_read` before answering from history, and
save useful decisions during the task. Use ordinary MCP tools and preserve host
approvals. Hooks supply public reminders, never private reads or saves.
Compaction and session end cannot guarantee a save.

These instructions guide the model; they are not an access-control boundary.
Disable the Penny MCP server or extension in contexts that must have no access
to private memory. Never grant blanket tool trust for this extension.
