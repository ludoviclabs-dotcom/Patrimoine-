import { spawn } from "node:child_process";
import { createRequire } from "node:module";

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

const server = spawn(
  process.execPath,
  [nextBin, "dev", "--port", port],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

server.on("exit", (code) => {
  if (code !== null && code !== 0) {
    console.error(serverLog);
  }
});

try {
  await waitForServer(serverUrl);
  const code = await runPlaywright(process.argv.slice(2));
  await stopServer();
  process.exit(code);
} catch (error) {
  await stopServer();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
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
    if (server.exitCode !== null || server.killed) {
      resolve();
      return;
    }

    server.once("exit", () => resolve());
    server.kill();

    setTimeout(() => {
      if (server.exitCode === null && !server.killed) {
        server.kill("SIGKILL");
      }
      resolve();
    }, 2_000).unref();
  });
}
