export type PersistenceMode = "FIXTURE" | "DATABASE";

export type PersistenceRuntime = Readonly<{
  mode: PersistenceMode;
  databaseConfigured: boolean;
  explicit: boolean;
}>;

export function resolvePersistenceRuntime(
  env: NodeJS.ProcessEnv = process.env,
): PersistenceRuntime {
  const configuredMode = env.PERSISTENCE_MODE?.trim().toUpperCase();
  const production = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";

  if (!configuredMode) {
    if (production) {
      throw new Error("PERSISTENCE_MODE_REQUIRED_IN_PRODUCTION");
    }

    return {
      mode: "FIXTURE",
      databaseConfigured: Boolean(env.DATABASE_URL),
      explicit: false,
    };
  }

  if (configuredMode !== "FIXTURE" && configuredMode !== "DATABASE") {
    throw new Error(`PERSISTENCE_MODE_INVALID:${configuredMode}`);
  }

  if (configuredMode === "DATABASE" && !env.DATABASE_URL) {
    throw new Error("DATABASE_URL_REQUIRED_FOR_DATABASE_MODE");
  }

  return {
    mode: configuredMode,
    databaseConfigured: Boolean(env.DATABASE_URL),
    explicit: true,
  };
}

export function isDatabaseMode(env: NodeJS.ProcessEnv = process.env) {
  return resolvePersistenceRuntime(env).mode === "DATABASE";
}
