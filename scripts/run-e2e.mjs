import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const playwrightCli = require.resolve("@playwright/test/cli");
const port = process.env.E2E_PORT ?? "3015";
const serverUrl = `http://127.0.0.1:${port}`;

const server = spawn(
  process.execPath,
  [nextBin, "dev", "--port", port, "--hostname", "127.0.0.1"],
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

async function waitForServer(url) {
  const startedAt = Date.now();
  const timeout = 60_000;

  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
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
