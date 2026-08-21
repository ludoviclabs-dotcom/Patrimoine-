import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const playwrightCli = require.resolve("@playwright/test/cli");
const port = process.env.E2E_PORT ?? "3015";
// Next 16 proxies each request to its render worker through `localhost`.
// Pinning the server to IPv4 only makes that internal hop fail on hosts where
// `localhost` resolves to ::1 first: every request then returns 500 with
// "Failed to proxy ... socket hang up", and the repeated failures end in a
// libuv handle assertion. Binding the default dual stack keeps the hop
// reachable.
const serverUrl = `http://localhost:${port}`;

// PF-07 — the authenticated journeys need a real Clerk session resolved
// against a real database. When the fixture is requested, this runner
// provisions a disposable PostgreSQL cluster, migrates it, seeds the Clerk
// mapping and points the dev server at a NOBYPASSRLS runtime login. Without
// the flag the public suite runs exactly as before, with no database at all.
const authenticatedFixture = process.env.E2E_CLERK_FIXTURE === "1";

/** Reads a gitignored env file without overwriting an already-set variable. */
function loadEnvFile(file) {
  if (!existsSync(file)) return false;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const value = match[2].replace(/^"(.*)"$/s, "$1");
    if (value && process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
  return true;
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const chosen = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(chosen)));
    });
  });
}

let embedded = null;
let databaseDir = null;

async function startAuthenticatedFixture() {
  for (const file of [".env.e2e.local", ".env.staging.local", ".env.local"]) {
    loadEnvFile(join(process.cwd(), file));
  }

  const missing = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "E2E_CLERK_ORG_CABINET_A",
    "E2E_CLERK_ORG_CABINET_B",
    "E2E_CLERK_USER_ADVISER_A",
    "E2E_CLERK_USER_EXPERT_A",
    "E2E_CLERK_USER_CLIENT_A",
    "E2E_CLERK_USER_EXPERT_B",
  ].filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `E2E_CLERK_FIXTURE=1 but the fixture is not provisioned. Missing: ${missing.join(", ")}.\n`
      + "Run: npm run e2e:fixture -- provision",
    );
  }
  if (!process.env.CLERK_SECRET_KEY.startsWith("sk_test_")) {
    throw new Error("E2E_CLERK_FIXTURE refuses a non-development Clerk instance.");
  }

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  databaseDir = await mkdtemp(join(tmpdir(), "patrimoine-pf07-e2e-"));
  const databasePort = await availablePort();

  embedded = new EmbeddedPostgres({
    databaseDir,
    port: databasePort,
    user: "postgres",
    password: "postgres",
    persistent: true,
    onLog: () => {},
    onError: (error) => process.stderr.write(`[embedded-postgres] ${String(error)}\n`),
  });

  process.stdout.write("[e2e] provisioning disposable PostgreSQL…\n");
  await embedded.initialise();
  await embedded.start();

  const adminUrl = `postgres://postgres:postgres@127.0.0.1:${databasePort}/postgres`;
  const runtimePassword = randomBytes(24).toString("base64url");

  const seed = spawnSync(
    process.execPath,
    [require.resolve("tsx/cli"), "scripts/seed-e2e-fixture.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_ADMIN_URL: adminUrl,
        E2E_RUNTIME_PASSWORD: runtimePassword,
      },
      encoding: "utf8",
      windowsHide: true,
    },
  );

  process.stdout.write(seed.stdout ?? "");
  if (seed.status !== 0) {
    throw new Error(`E2E fixture seed failed.\n${seed.stderr ?? ""}`);
  }

  const runtimeUrl = new URL(adminUrl);
  runtimeUrl.username = "patrimoine_e2e_runtime";
  runtimeUrl.password = runtimePassword;

  // Handed to Playwright, not to the server: the revocation journey has to
  // change an authoritative membership while a Clerk session is still live.
  process.env.E2E_ADMIN_DATABASE_URL = adminUrl;

  return {
    DATABASE_URL: runtimeUrl.toString(),
    PERSISTENCE_MODE: "DATABASE",
    // Deployment-only in production; the E2E server must not hold it.
    DATABASE_ADMIN_URL: undefined,
    DOCUMENT_DOWNLOAD_SIGNING_SECRET:
      process.env.DOCUMENT_DOWNLOAD_SIGNING_SECRET?.trim()
      || randomBytes(48).toString("base64url"),
  };
}

async function stopAuthenticatedFixture() {
  if (embedded) {
    await Promise.race([
      embedded.stop().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 15_000)),
    ]);
    embedded = null;
  }
  if (databaseDir) {
    await rm(databaseDir, { recursive: true, force: true }).catch(() => {});
    databaseDir = null;
  }
}

let server = null;
let serverLog = "";

function startServer(extraEnv) {
  const env = { ...process.env, ...extraEnv };
  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined) delete env[key];
  }

  server = spawn(process.execPath, [nextBin, "dev", "--port", port], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });
  server.on("exit", (code) => {
    if (code !== null && code !== 0) console.error(serverLog);
  });
}

/**
 * Waits until the dev server answers. Any HTTP response means it is listening:
 * `next dev` legitimately answers non-2xx while compiling a route on demand.
 * The delay applies to every attempt, including a non-2xx one - polling
 * without it turns this loop into a busy-wait that floods the server.
 */
async function waitForServer(url) {
  const startedAt = Date.now();
  const timeout = 120_000;

  while (Date.now() - startedAt < timeout) {
    try {
      await fetch(url);
      return;
    } catch {
      // Not listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Next.js dev server did not become ready at ${url}.\n${serverLog}`);
}

function runPlaywright(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, "test", ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        E2E_BASE_URL: serverUrl,
        PLAYWRIGHT_HTML_OPEN: "never",
      },
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (!server || server.exitCode !== null || server.killed) {
      resolve();
      return;
    }

    server.once("exit", () => resolve());
    server.kill();

    setTimeout(() => {
      if (server.exitCode === null && !server.killed) server.kill("SIGKILL");
      resolve();
    }, 2_000).unref();
  });
}

async function shutdown() {
  await stopServer();
  await stopAuthenticatedFixture();
}

try {
  const extraEnv = authenticatedFixture ? await startAuthenticatedFixture() : {};
  startServer(extraEnv);
  await waitForServer(serverUrl);
  const code = await runPlaywright(process.argv.slice(2));
  await shutdown();
  process.exit(code);
} catch (error) {
  await shutdown();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
