import { prisma } from "@/lib/db";
import { Prisma, OrgMember } from "@prisma/client";

// ─── Role Hierarchy ───────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 80,
  DEVICE_MANAGER: 60,
  ORG_MEMBER: 40,
  VIEWER: 20,
};

// ─── Permission Definitions ───────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "organization:create",
    "organization:read",
    "organization:update",
    "organization:delete",
    "organization:manage_members",
    "device:create",
    "device:read",
    "device:update",
    "device:delete",
    "device:manage",
    "device:data:read",
    "device:data:write",
    "dashboard:create",
    "dashboard:read",
    "dashboard:update",
    "dashboard:delete",
    "dashboard:share",
    "alert:read",
    "alert:manage",
    "alert:acknowledge",
    "alert:resolve",
    "rule:create",
    "rule:read",
    "rule:update",
    "rule:delete",
    "metric:read",
    "metric:create",
    "metric:delete",
    "integration:create",
    "integration:read",
    "integration:update",
    "integration:delete",
    "report:create",
    "report:read",
    "report:update",
    "report:delete",
    "audit:read",
    "user:read",
    "user:update",
    "user:delete",
    "settings:read",
    "settings:update",
  ],
  ORG_ADMIN: [
    "organization:read",
    "organization:update",
    "organization:manage_members",
    "device:create",
    "device:read",
    "device:update",
    "device:delete",
    "device:manage",
    "device:data:read",
    "device:data:write",
    "dashboard:create",
    "dashboard:read",
    "dashboard:update",
    "dashboard:delete",
    "dashboard:share",
    "alert:read",
    "alert:manage",
    "alert:acknowledge",
    "alert:resolve",
    "rule:create",
    "rule:read",
    "rule:update",
    "rule:delete",
    "metric:read",
    "metric:create",
    "metric:delete",
    "integration:create",
    "integration:read",
    "integration:update",
    "integration:delete",
    "report:create",
    "report:read",
    "report:update",
    "report:delete",
    "audit:read",
    "user:read",
    "user:update",
    "settings:read",
    "settings:update",
  ],
  DEVICE_MANAGER: [
    "organization:read",
    "device:create",
    "device:read",
    "device:update",
    "device:manage",
    "device:data:read",
    "device:data:write",
    "dashboard:create",
    "dashboard:read",
    "dashboard:update",
    "alert:read",
    "alert:acknowledge",
    "alert:resolve",
    "rule:create",
    "rule:read",
    "rule:update",
    "metric:read",
    "metric:create",
    "integration:read",
    "report:create",
    "report:read",
    "user:read",
  ],
  ORG_MEMBER: [
    "organization:read",
    "device:read",
    "device:data:read",
    "dashboard:create",
    "dashboard:read",
    "dashboard:update",
    "alert:read",
    "alert:acknowledge",
    "rule:read",
    "metric:read",
    "report:read",
    "user:read",
  ],
  VIEWER: [
    "organization:read",
    "device:read",
    "device:data:read",
    "dashboard:read",
    "alert:read",
    "rule:read",
    "metric:read",
    "report:read",
  ],
};

// ─── Permission Checking ──────────────────────────────────────────────────────

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: string, permission: string): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

export function hasAnyPermission(role: string, permissions: string[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.some((p) => rolePermissions.includes(p));
}

export function hasAllPermissions(role: string, permissions: string[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.every((p) => rolePermissions.includes(p));
}

export function isRoleHigherThan(role1: string, role2: string): boolean {
  const level1 = ROLE_HIERARCHY[role1] ?? 0;
  const level2 = ROLE_HIERARCHY[role2] ?? 0;
  return level1 > level2;
}

export function isRoleAtLeast(role: string, minimumRole: string): boolean {
  const roleLevel = ROLE_HIERARCHY[role] ?? 0;
  const minLevel = ROLE_HIERARCHY[minimumRole] ?? 0;
  return roleLevel >= minLevel;
}

// ─── Organization Permission Checks ──────────────────────────────────────────

export async function getUserOrganizationRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return membership?.role ?? null;
}

export async function isOrganizationMember(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  return membership !== null;
}

export async function canAccessOrganization(
  userId: string,
  organizationId: string
): Promise<{ allowed: boolean; role?: string }> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") {
      return { allowed: true, role: "SUPER_ADMIN" };
    }
    return { allowed: false };
  }

  return { allowed: true, role: membership.role };
}

// ─── Device Permission Checks ─────────────────────────────────────────────────

export async function canAccessDevice(
  userId: string,
  deviceId: string,
  requiredPermission: string = "device:read"
): Promise<boolean> {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    select: { organizationId: true },
  });

  if (!device) return false;

  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: device.organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, requiredPermission);
}

export async function canManageDevice(
  userId: string,
  deviceId: string
): Promise<boolean> {
  return canAccessDevice(userId, deviceId, "device:manage");
}

export async function canWriteDeviceData(
  userId: string,
  deviceId: string
): Promise<boolean> {
  return canAccessDevice(userId, deviceId, "device:data:write");
}

// ─── Dashboard Permission Checks ──────────────────────────────────────────────

export async function canAccessDashboard(
  userId: string,
  dashboardId: string,
  requiredPermission: string = "dashboard:read"
): Promise<boolean> {
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
    select: { organizationId: true, isPublic: true, ownerId: true },
  });

  if (!dashboard) return false;

  if (dashboard.isPublic && requiredPermission === "dashboard:read") {
    return true;
  }

  if (dashboard.ownerId === userId) return true;

  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: dashboard.organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, requiredPermission);
}

export async function canShareDashboard(
  userId: string,
  dashboardId: string
): Promise<boolean> {
  return canAccessDashboard(userId, dashboardId, "dashboard:share");
}

// ─── Alert Permission Checks ──────────────────────────────────────────────────

export async function canManageAlert(
  userId: string,
  alertId: string
): Promise<boolean> {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { deviceId: true },
  });

  if (!alert) return false;

  const device = await prisma.device.findUnique({
    where: { id: alert.deviceId },
    select: { organizationId: true },
  });

  if (!device) return false;

  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: device.organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, "alert:manage");
}

export async function canAcknowledgeAlert(
  userId: string,
  alertId: string
): Promise<boolean> {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { deviceId: true },
  });

  if (!alert) return false;

  const device = await prisma.device.findUnique({
    where: { id: alert.deviceId },
    select: { organizationId: true },
  });

  if (!device) return false;

  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: device.organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, "alert:acknowledge");
}

// ─── Rule Permission Checks ───────────────────────────────────────────────────

export async function canManageRule(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, "rule:create");
}

// ─── Integration Permission Checks ────────────────────────────────────────────

export async function canManageIntegration(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, "integration:create");
}

// ─── Report Permission Checks ─────────────────────────────────────────────────

export async function canManageReport(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === "SUPER_ADMIN") return true;
    return false;
  }

  return hasPermission(membership.role, "report:create");
}

// ─── Utility Functions ────────────────────────────────────────────────────────

export function getAllPermissions(): string[] {
  const allPermissions = new Set<string>();
  for (const permissions of Object.values(ROLE_PERMISSIONS)) {
    for (const permission of permissions) {
      allPermissions.add(permission);
    }
  }
  return Array.from(allPermissions);
}

export function getRoles(): string[] {
  return Object.keys(ROLE_PERMISSIONS);
}

export function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function canAssignRole(
  assignerRole: string,
  targetRole: string
): boolean {
  if (assignerRole === "SUPER_ADMIN") return true;
  return isRoleHigherThan(assignerRole, targetRole);
}

export function filterByOrganization<T extends { organizationId?: string }>(
  items: T[],
  organizationId: string
): T[] {
  return items.filter(
    (item) => item.organizationId === organizationId || !item.organizationId
  );
}
