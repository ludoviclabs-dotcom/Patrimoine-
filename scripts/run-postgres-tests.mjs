import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

// Optional CLI arguments narrow the run to specific suites, e.g.
// `npm run test:postgres -- pf07-clerk-webhook`. With none, the whole
// directory runs sequentially, which is what validation uses.
const testFilters = process.argv.slice(2);

function runVitest(databaseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--globals",
        "--fileParallelism=false",
        ...(testFilters.length > 0 ? testFilters : ["tests/postgres"]),
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, PF03_TEST_DATABASE_URL: databaseUrl },
        stdio: "inherit",
      },
    );

    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

const databaseDir = await mkdtemp(join(tmpdir(), "patrimoine-pf03b-postgres-"));
const port = await availablePort();
const embedded = new EmbeddedPostgres({
  databaseDir,
  port,
  user: "postgres",
  password: "postgres",
  persistent: true,
  onLog: () => {},
  onError: (error) => process.stderr.write(`[embedded-postgres] ${String(error)}\n`),
});

let exitCode = 1;

try {
  await embedded.initialise();
  await embedded.start();
  exitCode = await runVitest(
    `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
  );
} finally {
  await Promise.race([
    embedded.stop().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 15_000)),
  ]);
  await rm(databaseDir, { recursive: true, force: true }).catch(() => {});
}

process.exit(exitCode);
