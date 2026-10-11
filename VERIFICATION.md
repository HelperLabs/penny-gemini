# Penny Gemini CLI 0.1.0 verification

Verified on October 11, 2026 against the official Gemini CLI and core 0.63.0.

## Native host and live account

The actual interactive Gemini CLI loaded the extension, context, skill and
`/penny:start`. Its native OAuth provider completed discovery, registration,
PKCE and token exchange with Penny. Access and refresh credentials were
persisted with file mode 0600 in an isolated test home.

With normal per-call approval enabled, a refused write was cancelled by the
host. Allow-once approvals then saved a harmless private test note, read the
same content back by its exact returned ID, soft-deleted it and confirmed an
empty exact-ID readback. Both disposable notes created during setup and the
approved test were cleaned up. A project-directory request also returned a
valid paginated response; it did not find the test project on its first page.

A deterministic GenAI protocol fixture ran on loopback. It selected the tool
calls; Gemini CLI executed the real authenticated Penny MCP calls. Private
results stayed local. The test establishes native loading, auth, approvals and
the account round trip. It does not establish general model compliance,
forced token refresh, shared/subagent eligibility or Google-model behavior.

Setup attempts exposed two fixture mistakes: `mcp.allowed` automatically
approved server tools, and a delete call used the wrong argument name. The
setting was removed, the argument corrected, and the successful checks above
used normal allow-once approvals. The README explains the approval setting.

## Offline and release checks

- 17 source integration tests passed.
- The pinned official loader accepted the context, complete canonical skill,
  command and all five hooks. The native hook runner preserved foreign
  deny/stop decisions.
- The standalone source rebuilt with pinned Node.js 22.15.0/npm 11.18.0 and
  esbuild 0.28.2. The rebuilt hook passed the same native verifier.
- The standalone dependency audit found no vulnerabilities.
- No third-party runtime dependencies, credential files or private engine
  implementation are included. `BUILD.json` records the source commit and
  canonical skill hash; release dependency evidence records the public commit.

The five hooks emit public guidance only. They make no private reads or writes,
do not open transcript files, and do not guarantee recall or a save before
compression or exit. Context instructions guide the model and are not an
access-control boundary. Disable the extension or its MCP server wherever
private memory must be inaccessible.

## Gallery

Google discovers public repositories with the `gemini-cli-extension` topic
and a root manifest through a daily crawl. A published release and an indexed
gallery entry are separate states. See the official
[releasing guide](https://geminicli.com/docs/extensions/releasing/).
