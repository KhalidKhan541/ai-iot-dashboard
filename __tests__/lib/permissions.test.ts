import { PermissionService, User, Permission } from '@/lib/permissions';

describe('PermissionService', () => {
  let service: PermissionService;

  const createTestUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    role: 'operator',
    permissions: [],
    orgId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    service = new PermissionService();
  });

  describe('addUser', () => {
    it('should add a user', () => {
      const user = createTestUser();
      service.addUser(user);

      const found = service.getUser(user.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
    });
  });

  describe('getUser', () => {
    it('should return user by ID', () => {
      const user = createTestUser();
      service.addUser(user);

      const found = service.getUser(user.id);
      expect(found?.email).toBe('test@example.com');
    });

    it('should return undefined for non-existent user', () => {
      const found = service.getUser('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('removeUser', () => {
    it('should remove a user', () => {
      const user = createTestUser();
      service.addUser(user);

      const result = service.removeUser(user.id);
      expect(result).toBe(true);
      expect(service.getUser(user.id)).toBeUndefined();
    });

    it('should return false for non-existent user', () => {
      const result = service.removeUser('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should grant permission based on role', () => {
      const user = createTestUser({ role: 'admin' });
      service.addUser(user);

      const check = service.hasPermission(user.id, 'device:write');
      expect(check.granted).toBe(true);
    });

    it('should deny permission for lower roles', () => {
      const user = createTestUser({ role: 'viewer' });
      service.addUser(user);

      const check = service.hasPermission(user.id, 'device:write');
      expect(check.granted).toBe(false);
      expect(check.reason).toContain('Missing permission');
    });

    it('should grant custom permissions', () => {
      const user = createTestUser({
        role: 'viewer',
        permissions: ['device:write'],
      });
      service.addUser(user);

      const check = service.hasPermission(user.id, 'device:write');
      expect(check.granted).toBe(true);
    });

    it('should deny permission for non-existent user', () => {
      const check = service.hasPermission('non-existent', 'device:read');
      expect(check.granted).toBe(false);
      expect(check.reason).toBe('User not found');
    });

    it('should deny permission for inactive user', () => {
      const user = createTestUser({ isActive: false });
      service.addUser(user);

      const check = service.hasPermission(user.id, 'device:read');
      expect(check.granted).toBe(false);
      expect(check.reason).toBe('User account is inactive');
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if any permission is granted', () => {
      const user = createTestUser({ role: 'viewer' });
      service.addUser(user);

      const result = service.hasAnyPermission(user.id, [
        'device:write',
        'device:read',
      ]);
      expect(result).toBe(true);
    });

    it('should return false if no permissions are granted', () => {
      const user = createTestUser({ role: 'viewer' });
      service.addUser(user);

      const result = service.hasAnyPermission(user.id, [
        'device:write',
        'device:delete',
      ]);
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if all permissions are granted', () => {
      const user = createTestUser({ role: 'admin' });
      service.addUser(user);

      const result = service.hasAllPermissions(user.id, [
        'device:read',
        'device:write',
        'device:delete',
      ]);
      expect(result).toBe(true);
    });

    it('should return false if any permission is missing', () => {
      const user = createTestUser({ role: 'viewer' });
      service.addUser(user);

      const result = service.hasAllPermissions(user.id, [
        'device:read',
        'device:write',
      ]);
      expect(result).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions including role-based', () => {
      const user = createTestUser({ role: 'viewer' });
      service.addUser(user);

      const permissions = service.getUserPermissions(user.id);
      expect(permissions).toContain('device:read');
      expect(permissions).toContain('dashboard:read');
    });

    it('should include custom permissions', () => {
      const user = createTestUser({
        role: 'viewer',
        permissions: ['device:write'],
      });
      service.addUser(user);

      const permissions = service.getUserPermissions(user.id);
      expect(permissions).toContain('device:write');
    });

    it('should return empty array for non-existent user', () => {
      const permissions = service.getUserPermissions('non-existent');
      expect(permissions).toEqual([]);
    });
  });

  describe('getRolePermissions', () => {
    it('should return permissions for viewer role', () => {
      const permissions = service.getRolePermissions('viewer');
      expect(permissions).toContain('device:read');
      expect(permissions).not.toContain('device:write');
    });

    it('should return permissions for operator role', () => {
      const permissions = service.getRolePermissions('operator');
      expect(permissions).toContain('device:read');
      expect(permissions).toContain('device:write');
    });

    it('should return permissions for admin role', () => {
      const permissions = service.getRolePermissions('admin');
      expect(permissions).toContain('device:admin');
      expect(permissions).toContain('system:admin');
    });

    it('should return all permissions for super_admin role', () => {
      const permissions = service.getRolePermissions('super_admin');
      expect(permissions.length).toBeGreaterThan(10);
    });
  });

  describe('canAccessResource', () => {
    it('should check resource access', () => {
      const user = createTestUser({ role: 'admin' });
      service.addUser(user);

      const check = service.canAccessResource(
        { userId: user.id, role: user.role, permissions: user.permissions, orgId: 'org-1' },
        'device',
        'write'
      );
      expect(check.granted).toBe(true);
    });

    it('should deny resource access for insufficient permissions', () => {
      const user = createTestUser({ role: 'viewer' });
      service.addUser(user);

      const check = service.canAccessResource(
        { userId: user.id, role: user.role, permissions: user.permissions, orgId: 'org-1' },
        'device',
        'delete'
      );
      expect(check.granted).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should allow higher role to manage lower role', () => {
      const manager = createTestUser({ id: 'manager', role: 'admin' });
      const target = createTestUser({ id: 'target', role: 'viewer' });
      service.addUser(manager);
      service.addUser(target);

      const result = service.canManageUser(manager.id, target.id);
      expect(result).toBe(true);
    });

    it('should not allow same role to manage', () => {
      const manager = createTestUser({ id: 'manager', role: 'viewer' });
      const target = createTestUser({ id: 'target', role: 'viewer' });
      service.addUser(manager);
      service.addUser(target);

      const result = service.canManageUser(manager.id, target.id);
      expect(result).toBe(false);
    });

    it('should return false for non-existent users', () => {
      const result = service.canManageUser('non-existent', 'also-non-existent');
      expect(result).toBe(false);
    });
  });

  describe('role hierarchy', () => {
    it('should return correct hierarchy levels', () => {
      expect(service.getRoleHierarchyLevel('viewer')).toBe(0);
      expect(service.getRoleHierarchyLevel('operator')).toBe(1);
      expect(service.getRoleHierarchyLevel('admin')).toBe(2);
      expect(service.getRoleHierarchyLevel('super_admin')).toBe(3);
    });

    it('should compare roles correctly', () => {
      expect(service.isHigherRole('admin', 'viewer')).toBe(true);
      expect(service.isHigherRole('viewer', 'admin')).toBe(false);
      expect(service.isHigherRole('viewer', 'viewer')).toBe(false);
    });
  });

  describe('getPermissionsByResource', () => {
    it('should return permissions for device resource', () => {
      const permissions = service.getPermissionsByResource('device');
      expect(permissions).toContain('device:read');
      expect(permissions).toContain('device:write');
      expect(permissions).toContain('device:delete');
      expect(permissions).toContain('device:admin');
    });

    it('should return permissions for alert resource', () => {
      const permissions = service.getPermissionsByResource('alert');
      expect(permissions).toContain('alert:read');
      expect(permissions).toContain('alert:acknowledge');
    });
  });

  describe('getUsersByRole', () => {
    it('should return users by role', () => {
      service.addUser(createTestUser({ id: 'u1', role: 'viewer' }));
      service.addUser(createTestUser({ id: 'u2', role: 'admin' }));
      service.addUser(createTestUser({ id: 'u3', role: 'viewer' }));

      const viewers = service.getUsersByRole('viewer');
      expect(viewers).toHaveLength(2);
    });
  });

  describe('getActiveUsers', () => {
    it('should return only active users', () => {
      service.addUser(createTestUser({ id: 'u1', isActive: true }));
      service.addUser(createTestUser({ id: 'u2', isActive: false }));

      const active = service.getActiveUsers();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('u1');
    });
  });

  describe('clear', () => {
    it('should remove all users', () => {
      service.addUser(createTestUser({ id: 'u1' }));
      service.addUser(createTestUser({ id: 'u2' }));

      service.clear();
      expect(service.count()).toBe(0);
    });
  });
});
