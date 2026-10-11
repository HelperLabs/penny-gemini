# Penny for Gemini CLI

Penny brings your memories, notes, projects and tasks into Gemini CLI through
OAuth MCP tools. Built by [HelperLabs](https://mypenny.ai).

This package targets Gemini CLI **0.63.0**. The build includes Penny's canonical
skill, `GEMINI.md`, `/penny:start` and five native hooks. The hooks supply public
reminders; private reads and saves use normal MCP tools with host approvals.

## Install

Install the HelperLabs release in Gemini CLI 0.63.0:

```sh
gemini extensions install https://github.com/HelperLabs/penny-gemini --ref v0.1.0
```

Review the extension permissions and restart Gemini CLI. The remote MCP URL is
`https://app.mypenny.ai/mcp`. Authenticate through Gemini's normal OAuth flow,
using `/mcp auth MyPenny` if needed. Do not add a token, static authorization
header, or blanket tool trust to the manifest.

For an approval prompt on each call, keep `mcp.allowed` unset for `MyPenny`
and do not select an always-allow option. Gemini treats servers in that setting
as approved for all their tools. Existing user policy settings still apply.

In a private foreground conversation where you own the authenticated Penny
account, run `/penny:start`. That requests Penny for this conversation. If the
audience or account ownership is unclear, the agent must ask before accessing
memory. Installation alone does not enable private reads or saves.

Use one Penny channel at a time. Disable or uninstall any preview copy before
installing this public release. The extension name is the same across channels.

## What each hook does

| Event | Behavior |
| --- | --- |
| `SessionStart` | Add public session eligibility and memory-use guidance. No profile read. |
| `BeforeAgent` | Repeat public guidance for the turn. No prompt processing or history query. |
| `AfterAgent` | Return `{}`. No retry, forced follow-up or save. |
| `PreCompress` | Display an advisory to save decisions during the task. No automatic save. |
| `SessionEnd` | Return `{}`. No exit-time save. |

Hooks require Node.js 20 or later on PATH. A malformed or oversized input returns
`{}`; input and errors are never logged. The hook reads stdin only to recognize
the native event. It does not open transcript paths, inspect source files,
call Penny, store credentials, upload telemetry or create local memory state.
Private profile data enters the conversation only when approved MCP calls
return it. A write sends the content chosen for that tool call to Penny.

## Privacy and host limits

The context file limits memory to explicitly enabled, private, human-directed
foreground conversations. It excludes background, scheduled, headless, remote,
shared and subagent runs. Do not forward private notes to subagents.

Gemini's published hook input does not attest the audience or distinguish every
automation and subagent context. These rules guide the model; they are not an
access-control boundary. Disable Penny's MCP server or extension in contexts
that must have no access to private memory. Keep normal tool approvals enabled.

Use `penny_read` before answering from history and save useful decisions while
the task is underway. Hooks cannot guarantee recall before every answer or an
approved save before compression or exit.

## Verification and publication

The offline verifier loads the assembled extension with Gemini's pinned native
modules, checks skills, commands and hooks, and consumes synthetic hook output.
It does not initialize an agent, connect MCP or authenticate. The separate live test used Gemini CLI 0.63.0’s native OAuth provider and
interactive MCP tools with a deterministic local model. OAuth, refused-write
cancellation, approved write, exact-ID readback, soft-delete and empty readback
passed. Private results stayed local. General model compliance and forced token
refresh were not tested. See the public release’s `VERIFICATION.md` for evidence.

Each standalone build includes an MIT license and `BUILD.json` identifying
HelperLabs, the channel, source commit and canonical skill hash. This adapter
has its own initial version, **0.1.0**; it is outside the existing four-package
npm lockstep release. A build does not publish a repository or gallery listing.

Gemini's gallery discovers public extension repositories with the
`gemini-cli-extension` topic. Google checks tagged repositories daily and lists
extensions that pass validation. Publication and gallery inclusion are separate
states.

## Build and check

The repository contains the hook source and committed runtime bundle. End users
need Node.js 20 or later; release builds pin Node.js 22.15.0 and npm 11.18.0.

```sh
npm ci --ignore-scripts
npm audit --audit-level high
npm run build
```

To check the official host contract, install the pinned verifier runtime into a
temporary directory, then run:

```sh
npm install --prefix /tmp/penny-gemini-host --ignore-scripts --no-save @google/gemini-cli@0.63.0 @google/gemini-cli-core@0.63.0
npm run verify:host -- /tmp/penny-gemini-host .
```

`npm run security:manifest` records the clean Git commit, tracked input hashes,
locked build dependencies and toolchains. It rejects dirty or uncommitted
inputs and mismatched installed dependencies. The adapter has no third-party
runtime dependencies. See [verification](VERIFICATION.md) and
[release toolchains](release-toolchains.json).

See the official [extension reference](https://geminicli.com/docs/extensions/reference/),
[hooks](https://geminicli.com/docs/hooks/reference/),
[MCP authentication](https://geminicli.com/docs/tools/mcp-server/) and
[releasing guide](https://geminicli.com/docs/extensions/releasing/).
