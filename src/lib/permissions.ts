// ── Types ────────────────────────────────────────────────────────────────────

export type Permission =
  | 'device:read'
  | 'device:write'
  | 'device:delete'
  | 'device:admin'
  | 'alert:read'
  | 'alert:write'
  | 'alert:acknowledge'
  | 'alert:admin'
  | 'dashboard:read'
  | 'dashboard:write'
  | 'dashboard:delete'
  | 'dashboard:admin'
  | 'analytics:read'
  | 'analytics:write'
  | 'analytics:admin'
  | 'rule:read'
  | 'rule:write'
  | 'rule:delete'
  | 'rule:admin'
  | 'user:read'
  | 'user:write'
  | 'user:admin'
  | 'system:read'
  | 'system:admin';

export type Role = 'viewer' | 'operator' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  permissions: Permission[];
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface PermissionCheck {
  granted: boolean;
  reason?: string;
  requiredPermission: Permission;
  userRole: Role;
  userPermissions: Permission[];
}

export interface AccessContext {
  userId: string;
  role: Role;
  permissions: Permission[];
  orgId: string;
  deviceId?: string;
  dashboardId?: string;
}

// ── Role-Permission Matrix ──────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [
    'device:read',
    'alert:read',
    'dashboard:read',
    'analytics:read',
    'rule:read',
    'user:read',
    'system:read',
  ],
  operator: [
    'device:read',
    'device:write',
    'alert:read',
    'alert:write',
    'alert:acknowledge',
    'dashboard:read',
    'dashboard:write',
    'analytics:read',
    'analytics:write',
    'rule:read',
    'rule:write',
    'user:read',
    'system:read',
  ],
  admin: [
    'device:read',
    'device:write',
    'device:delete',
    'device:admin',
    'alert:read',
    'alert:write',
    'alert:acknowledge',
    'alert:admin',
    'dashboard:read',
    'dashboard:write',
    'dashboard:delete',
    'dashboard:admin',
    'analytics:read',
    'analytics:write',
    'analytics:admin',
    'rule:read',
    'rule:write',
    'rule:delete',
    'rule:admin',
    'user:read',
    'user:write',
    'user:admin',
    'system:read',
    'system:admin',
  ],
  super_admin: [
    'device:read',
    'device:write',
    'device:delete',
    'device:admin',
    'alert:read',
    'alert:write',
    'alert:acknowledge',
    'alert:admin',
    'dashboard:read',
    'dashboard:write',
    'dashboard:delete',
    'dashboard:admin',
    'analytics:read',
    'analytics:write',
    'analytics:admin',
    'rule:read',
    'rule:write',
    'rule:delete',
    'rule:admin',
    'user:read',
    'user:write',
    'user:admin',
    'system:read',
    'system:admin',
  ],
};

// ── Service ─────────────────────────────────────────────────────────────────

export class PermissionService {
  private users: Map<string, User> = new Map();

  constructor(initialUsers: User[] = []) {
    initialUsers.forEach(u => this.users.set(u.id, u));
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  removeUser(id: string): boolean {
    return this.users.delete(id);
  }

  hasPermission(userId: string, permission: Permission): PermissionCheck {
    const user = this.users.get(userId);
    if (!user) {
      return {
        granted: false,
        reason: 'User not found',
        requiredPermission: permission,
        userRole: 'viewer',
        userPermissions: [],
      };
    }

    if (!user.isActive) {
      return {
        granted: false,
        reason: 'User account is inactive',
        requiredPermission: permission,
        userRole: user.role,
        userPermissions: user.permissions,
      };
    }

    const rolePermissions = ROLE_PERMISSIONS[user.role] ?? [];
    const allPermissions = [...new Set([...rolePermissions, ...user.permissions])];
    const granted = allPermissions.includes(permission);

    return {
      granted,
      reason: granted ? undefined : `Missing permission: ${permission}`,
      requiredPermission: permission,
      userRole: user.role,
      userPermissions: allPermissions,
    };
  }

  hasAnyPermission(userId: string, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(userId, p).granted);
  }

  hasAllPermissions(userId: string, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(userId, p).granted);
  }

  getUserPermissions(userId: string): Permission[] {
    const user = this.users.get(userId);
    if (!user) return [];
    const rolePermissions = ROLE_PERMISSIONS[user.role] ?? [];
    return [...new Set([...rolePermissions, ...user.permissions])];
  }

  getRolePermissions(role: Role): Permission[] {
    return [...(ROLE_PERMISSIONS[role] ?? [])];
  }

  canAccessResource(
    context: AccessContext,
    resourceType: 'device' | 'dashboard' | 'alert' | 'rule',
    action: 'read' | 'write' | 'delete' | 'admin'
  ): PermissionCheck {
    const permission = `${resourceType}:${action}` as Permission;
    return this.hasPermission(context.userId, permission);
  }

  canManageUser(managerId: string, targetUserId: string): boolean {
    const manager = this.users.get(managerId);
    const target = this.users.get(targetUserId);
    if (!manager || !target) return false;

    const roleHierarchy: Record<Role, number> = {
      viewer: 0,
      operator: 1,
      admin: 2,
      super_admin: 3,
    };

    return roleHierarchy[manager.role] > roleHierarchy[target.role];
  }

  getRoleHierarchyLevel(role: Role): number {
    const hierarchy: Record<Role, number> = {
      viewer: 0,
      operator: 1,
      admin: 2,
      super_admin: 3,
    };
    return hierarchy[role] ?? 0;
  }

  isHigherRole(role1: Role, role2: Role): boolean {
    return this.getRoleHierarchyLevel(role1) > this.getRoleHierarchyLevel(role2);
  }

  getPermissionsByResource(resource: string): Permission[] {
    const allPermissions: Permission[] = [
      'device:read', 'device:write', 'device:delete', 'device:admin',
      'alert:read', 'alert:write', 'alert:acknowledge', 'alert:admin',
      'dashboard:read', 'dashboard:write', 'dashboard:delete', 'dashboard:admin',
      'analytics:read', 'analytics:write', 'analytics:admin',
      'rule:read', 'rule:write', 'rule:delete', 'rule:admin',
      'user:read', 'user:write', 'user:admin',
      'system:read', 'system:admin',
    ];
    return allPermissions.filter(p => p.startsWith(`${resource}:`));
  }

  getUsersByRole(role: Role): User[] {
    return Array.from(this.users.values()).filter(u => u.role === role);
  }

  getActiveUsers(): User[] {
    return Array.from(this.users.values()).filter(u => u.isActive);
  }

  count(): number {
    return this.users.size;
  }

  clear(): void {
    this.users.clear();
  }
}
