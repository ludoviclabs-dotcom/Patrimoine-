import type { ClientCase, UserAccount } from "../types";

type TenantScoped = {
  tenantId: string;
};

const reviewRoles = new Set<UserAccount["role"]>(["admin", "expert"]);
const cabinetRoles = new Set<UserAccount["role"]>(["admin", "conseiller", "expert"]);

export function filterByTenant<T extends TenantScoped>(records: readonly T[], tenantId: string) {
  return records.filter((record) => record.tenantId === tenantId);
}

export function assertTenantScoped(record: TenantScoped, tenantId: string) {
  if (record.tenantId !== tenantId) {
    throw new Error("TENANT_SCOPE_VIOLATION");
  }
}

export function canAccessCase(user: UserAccount, clientCase: ClientCase) {
  if (user.tenantId !== clientCase.tenantId) {
    return false;
  }

  if (cabinetRoles.has(user.role)) {
    return true;
  }

  return user.role === "client";
}

export function canReviewCase(user: UserAccount, clientCase: ClientCase) {
  return user.tenantId === clientCase.tenantId && reviewRoles.has(user.role);
}

export function requireCaseAccess(user: UserAccount, clientCase: ClientCase) {
  if (!canAccessCase(user, clientCase)) {
    throw new Error("CASE_ACCESS_DENIED");
  }
}
