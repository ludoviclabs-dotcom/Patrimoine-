import { UserButton } from "@clerk/nextjs";
import { notFound, redirect } from "next/navigation";
import { requireClerkTenantContext } from "@/lib/auth/clerk-tenant-context";
import type { TenantContext } from "@/lib/tenancy/tenant-context";

async function resolveWorkspaceContext(): Promise<TenantContext> {
  try {
    return await requireClerkTenantContext();
  } catch (error) {
    if (error instanceof Error && (error.message === "CLERK_SESSION_REQUIRED" || error.message === "CLERK_ORGANIZATION_REQUIRED")) {
      redirect("/sign-in");
    }
    notFound();
  }
}

export default async function WorkspacePage() {
  const context = await resolveWorkspaceContext();
  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Espace cabinet</h1>
        <UserButton />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Organisation interne authentifiée. Les données restent protégées par la membership PostgreSQL et RLS.
      </p>
      <dl className="mt-6 grid max-w-xl grid-cols-2 gap-3 text-sm">
        <dt>Rôle interne</dt><dd>{context.role}</dd>
        <dt>Contexte</dt><dd>résolu côté serveur</dd>
      </dl>
    </main>
  );
}
