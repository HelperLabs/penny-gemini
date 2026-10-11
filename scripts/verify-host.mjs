#!/usr/bin/env node
// Offline native Gemini CLI loading and hook contract checks.
// Requires separately installed, pinned official packages. Never launch gemini,
// initialize an agent, start the ExtensionManager or connect an MCP client.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const isolated = process.argv[2] === "--isolated";
const [runtimeRootArg, packageRootArg, testHomeArg] = process.argv.slice(isolated ? 3 : 2);
if (!runtimeRootArg || !packageRootArg) throw new Error("Usage: node scripts/verify-host.mjs <temp npm prefix with Gemini 0.63.0> <extension-root>");
const runtimeRoot = path.resolve(runtimeRootArg);
const packageRoot = path.resolve(packageRootArg);
const cliRoot = path.join(runtimeRoot, "node_modules/@google/gemini-cli");
const coreRoot = path.join(runtimeRoot, "node_modules/@google/gemini-cli-core");
const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
assert.equal(readJson(path.join(cliRoot, "package.json")).version, "0.63.0");
assert.equal(readJson(path.join(coreRoot, "package.json")).version, "0.63.0");
const loaderFile = path.join(cliRoot, "bundle/chunk-ED56GFWH.js");
const loaderSha256 = createHash("sha256").update(fs.readFileSync(loaderFile)).digest("hex");
assert.equal(loaderSha256, "94aab0262101e44e50ffdd2566a19c8684ec1d6b053d42a792c7d4383f4bbaab", "Released Gemini loader changed; review before importing it");

if (!isolated) {
  const testHome = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "penny-google-loader-")));
  try {
    fs.mkdirSync(path.join(testHome, "workspace"));
    for (const file of ["system-settings.json", "system-defaults.json"]) fs.writeFileSync(path.join(testHome, file), "{}");
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--isolated", runtimeRoot, packageRoot, testHome], {
      cwd: path.join(testHome, "workspace"), encoding: "utf8", timeout: 30000,
      env: { PATH: `${path.dirname(process.execPath)}${path.delimiter}/usr/bin${path.delimiter}/bin`, LANG: "en_US.UTF-8",
        GEMINI_CLI_HOME: testHome, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(testHome, "system-settings.json"), GEMINI_CLI_SYSTEM_DEFAULTS_PATH: path.join(testHome, "system-defaults.json") },
    });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    assert.equal(result.status, 0, "Offline verifier failed");
  } finally { fs.rmSync(testHome, { recursive: true, force: true }); }
} else {
  assert(testHomeArg && process.env.GEMINI_CLI_HOME === testHomeArg, "Missing isolated native home");
  // Reject unexpected networking before importing native modules. Hook children
  // inherit only the synthetic environment and run our static bundled commands.
  const net = await import("node:net");
  net.Socket.prototype.connect = function () { throw new Error("Network prohibited in offline verifier"); };
  globalThis.fetch = async () => { throw new Error("Fetch prohibited in offline verifier"); };
  const native = await import(pathToFileURL(loaderFile).href);
  const core = file => import(pathToFileURL(path.join(coreRoot, "dist/src/hooks", file)).href);
  const { HookRegistry } = await core("hookRegistry.js");
  const { HookPlanner } = await core("hookPlanner.js");
  const { HookRunner } = await core("hookRunner.js");
  const { HookAggregator } = await core("hookAggregator.js");
  const workspaceDir = process.cwd();
  const geminiDir = packageRoot;
  const manager = new native.ExtensionManager({ workspaceDir, clientVersion: "0.63.0", settings: {
    security: { blockGitExtensions: false, folderTrust: { enabled: false } },
    experimental: { extensionConfig: false }, hooksConfig: { enabled: true }, telemetry: { enabled: false },
    admin: { extensions: { enabled: true }, mcp: { enabled: true } },
  }, requestConsent: async () => { throw new Error("Unexpected consent request"); }, requestSetting: null });
  const manifest = await manager.loadExtensionConfig(geminiDir);
  const extension = await manager.loadExtension(geminiDir);
  assert(extension, "Native loader rejected extension");
  assert.equal(extension.name, "penny-gemini");
  assert.equal(extension.version, "0.1.0");
  assert.deepEqual(extension.mcpServers, manifest.mcpServers);
  assert.deepEqual(Object.keys(extension.mcpServers), ["MyPenny"]);
  assert.deepEqual(Object.keys(extension.mcpServers.MyPenny), ["httpUrl"]);
  assert.deepEqual(extension.contextFiles, [path.join(geminiDir, "GEMINI.md")]);
  assert.deepEqual(extension.skills.map(skill => skill.name), ["MyPenny"]);
  const events = ["SessionStart", "BeforeAgent", "AfterAgent", "PreCompress", "SessionEnd"];
  assert.deepEqual(Object.keys(extension.hooks), events);
  const config = { isTrustedFolder: () => false, getHooks: () => undefined, getExtensions: () => [extension], getDisabledHooks: () => [],
    sanitizationConfig: { enableEnvironmentVariableRedaction: true }, storage: { getPlansDir: () => path.join(testHomeArg, "plans") } };
  const registry = new HookRegistry(config);
  await registry.initialize();
  assert.equal(registry.getAllHooks().length, 5);
  const planner = new HookPlanner(registry);
  const runner = new HookRunner(config);
  const aggregator = new HookAggregator();
  for (const event of events) {
    const plan = planner.createExecutionPlan(event, { trigger: "startup" });
    assert.equal(plan.hookConfigs.length, 1);
    const [hook] = plan.hookConfigs;
    assert(hook.command.includes(path.join(geminiDir, "scripts/gemini_hook.mjs")) && !hook.command.includes("${extensionPath}"));
    const result = await runner.executeHook(hook, event, { session_id: "synthetic", cwd: workspaceDir, hook_event_name: event, source: "startup", prompt: "SYNTHETIC_PRIVATE_INPUT", transcript_path: "/synthetic/never-open" });
    assert(result.success, `Native hook runner failed: ${result.error}`);
    assert(!("decision" in result.output) && !("continue" in result.output));
    assert(!JSON.stringify(result.output).includes("SYNTHETIC_PRIVATE_INPUT"));
    const consumed = aggregator.aggregateResults([result], event);
    assert(consumed.success);
    if (["SessionStart", "BeforeAgent"].includes(event)) assert(consumed.finalOutput.hookSpecificOutput.additionalContext.includes("penny_read"));
    if (event === "PreCompress") assert(consumed.finalOutput.systemMessage.includes("does not save"));
    if (["AfterAgent", "SessionEnd"].includes(event)) assert.deepEqual(result.output, {});
    // Penny's empty/neutral output must not cancel another hook's deny/stop.
    if (["SessionStart", "BeforeAgent", "AfterAgent"].includes(event)) {
      for (const order of [[result, { ...result, output: { decision: "deny", continue: false } }], [{ ...result, output: { decision: "deny", continue: false } }, result]]) {
        const combined = aggregator.aggregateResults(order, event).finalOutput;
        assert.equal(combined.decision, "deny");
        assert.equal(combined.continue, false);
      }
    }
  }
  const commands = await new native.FileCommandLoader({ getFolderTrust: () => false, isTrustedFolder: () => false, getProjectRoot: () => workspaceDir, getExtensions: () => [extension] }).loadCommands(new AbortController().signal);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].name, "penny:start");
  console.log(JSON.stringify({host:"Gemini CLI 0.63.0",loaderSha256,skills:extension.skills.map(skill=>skill.name),hooks:events,commands:commands.map(command=>command.name),nativeRunner:true,foreignDenyPreserved:true,scope:"offline synthetic inputs; no agent, OAuth or MCP connection"},null,2));
}
