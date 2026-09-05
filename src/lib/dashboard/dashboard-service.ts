/**
 * Dashboard management service.
 * Handles CRUD operations, sharing, permissions, favorites, folders,
 * and template-based dashboard creation for the IoT platform.
 */

import crypto from "crypto";

// ── Types ────────────────────────────────────────────────────────────────────

export type DashboardPermissionLevel = "view" | "edit" | "admin";

export interface DashboardPermission {
  id: string;
  userId: string;
  level: DashboardPermissionLevel;
  grantedAt: Date;
  grantedBy: string;
}

export interface DashboardFolder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardFavorite {
  id: string;
  dashboardId: string;
  userId: string;
  createdAt: Date;
}

export interface DashboardShare {
  id: string;
  dashboardId: string;
  sharedWithUserId: string | null;
  shareToken: string | null;
  permissionLevel: DashboardPermissionLevel;
  expiresAt: Date | null;
  createdAt: Date;
  createdBy: string;
}

export interface DashboardVariable {
  id: string;
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "device" | "location";
  defaultValue: string;
  options?: string[];
  deviceId?: string;
  locationId?: string;
  required: boolean;
  description: string;
}

export interface Dashboard {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  folderId: string | null;
  templateId: string | null;
  isPublic: boolean;
  isDefault: boolean;
  theme: "light" | "dark" | "system";
  variables: DashboardVariable[];
  permissions: DashboardPermission[];
  shares: DashboardShare[];
  tags: string[];
  refreshIntervalMs: number;
  autoRefresh: boolean;
  timeRange: string;
  createdAt: Date;
  updatedAt: Date;
  lastViewedAt: Date | null;
  viewCount: number;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  widgets: WidgetTemplate[];
  variables: DashboardVariable[];
  tags: string[];
  isBuiltIn: boolean;
  createdBy: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetTemplate {
  type: string;
  title: string;
  config: Record<string, unknown>;
  layout: { x: number; y: number; w: number; h: number };
  dataSourceId: string | null;
}

export interface CreateDashboardInput {
  title: string;
  description?: string;
  folderId?: string;
  templateId?: string;
  isPublic?: boolean;
  theme?: Dashboard["theme"];
  tags?: string[];
  refreshIntervalMs?: number;
}

export interface UpdateDashboardInput {
  title?: string;
  description?: string;
  folderId?: string | null;
  isPublic?: boolean;
  theme?: Dashboard["theme"];
  tags?: string[];
  refreshIntervalMs?: number;
  autoRefresh?: boolean;
  timeRange?: string;
  variables?: DashboardVariable[];
}

export interface DashboardListOptions {
  userId: string;
  folderId?: string | null;
  search?: string;
  tags?: string[];
  sortBy?: "title" | "updatedAt" | "createdAt" | "viewCount";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  includePublic?: boolean;
}

export interface DashboardListResult {
  dashboards: Dashboard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── In-Memory Store ──────────────────────────────────────────────────────────

const dashboards = new Map<string, Dashboard>();
const folders = new Map<string, DashboardFolder>();
const favorites = new Map<string, DashboardFavorite>();
const shares = new Map<string, DashboardShare>();
const templates = new Map<string, DashboardTemplate>();

// ── Dashboard Service ────────────────────────────────────────────────────────

export class DashboardService {
  // ─── Dashboard CRUD ──────────────────────────────────────────────────

  createDashboard(input: CreateDashboardInput): Dashboard {
    const id = crypto.randomUUID();
    const now = new Date();

    let variables: DashboardVariable[] = [];
    let templateId: string | null = input.templateId ?? null;

    if (input.templateId) {
      const template = templates.get(input.templateId);
      if (template) {
        variables = template.variables.map((v) => ({
          ...v,
          id: crypto.randomUUID(),
        }));
      }
    }

    const dashboard: Dashboard = {
      id,
      title: input.title,
      description: input.description ?? "",
      ownerId: "", // Set by caller via auth context
      folderId: input.folderId ?? null,
      templateId,
      isPublic: input.isPublic ?? false,
      isDefault: false,
      theme: input.theme ?? "system",
      variables,
      permissions: [],
      shares: [],
      tags: input.tags ?? [],
      refreshIntervalMs: input.refreshIntervalMs ?? 30_000,
      autoRefresh: true,
      timeRange: "last24h",
      createdAt: now,
      updatedAt: now,
      lastViewedAt: null,
      viewCount: 0,
    };

    dashboards.set(id, dashboard);
    return dashboard;
  }

  getDashboard(id: string): Dashboard | null {
    return dashboards.get(id) ?? null;
  }

  updateDashboard(id: string, input: UpdateDashboardInput): Dashboard | null {
    const existing = dashboards.get(id);
    if (!existing) return null;

    const updated: Dashboard = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.folderId !== undefined && { folderId: input.folderId }),
      ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      ...(input.theme !== undefined && { theme: input.theme }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.refreshIntervalMs !== undefined && {
        refreshIntervalMs: input.refreshIntervalMs,
      }),
      ...(input.autoRefresh !== undefined && { autoRefresh: input.autoRefresh }),
      ...(input.timeRange !== undefined && { timeRange: input.timeRange }),
      ...(input.variables !== undefined && { variables: input.variables }),
      updatedAt: new Date(),
    };

    dashboards.set(id, updated);
    return updated;
  }

  deleteDashboard(id: string): boolean {
    return dashboards.delete(id);
  }

  listDashboards(options: DashboardListOptions): DashboardListResult {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    let results = Array.from(dashboards.values()).filter((d) => {
      if (d.ownerId !== options.userId && !options.includePublic) return false;
      if (options.folderId !== undefined && d.folderId !== options.folderId) return false;
      if (options.search) {
        const q = options.search.toLowerCase();
        if (
          !d.title.toLowerCase().includes(q) &&
          !d.description.toLowerCase().includes(q)
        )
          return false;
      }
      if (options.tags?.length) {
        if (!options.tags.some((t) => d.tags.includes(t))) return false;
      }
      return true;
    });

    const sortBy = options.sortBy ?? "updatedAt";
    const sortOrder = options.sortOrder ?? "desc";
    results.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === "asc"
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }
      return 0;
    });

    const total = results.length;
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    return {
      dashboards: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  recordView(id: string): void {
    const d = dashboards.get(id);
    if (d) {
      d.lastViewedAt = new Date();
      d.viewCount += 1;
    }
  }

  getRecentDashboards(userId: string, limit = 5): Dashboard[] {
    return Array.from(dashboards.values())
      .filter((d) => d.ownerId === userId || d.isPublic)
      .sort((a, b) => {
        const aTime = a.lastViewedAt?.getTime() ?? 0;
        const bTime = b.lastViewedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  getDefaultDashboard(userId: string): Dashboard | null {
    return (
      Array.from(dashboards.values()).find(
        (d) => d.ownerId === userId && d.isDefault
      ) ?? null
    );
  }

  setDefaultDashboard(dashboardId: string, userId: string): boolean {
    const target = dashboards.get(dashboardId);
    if (!target || target.ownerId !== userId) return false;

    for (const d of dashboards.values()) {
      if (d.ownerId === userId && d.isDefault) d.isDefault = false;
    }
    target.isDefault = true;
    return true;
  }

  duplicateDashboard(
    id: string,
    newTitle: string,
    userId: string
  ): Dashboard | null {
    const original = dashboards.get(id);
    if (!original) return null;

    const newDashboard = this.createDashboard({
      title: newTitle,
      description: original.description,
      folderId: original.folderId,
      isPublic: false,
      theme: original.theme,
      tags: [...original.tags],
      refreshIntervalMs: original.refreshIntervalMs,
    });
    newDashboard.ownerId = userId;
    newDashboard.variables = original.variables.map((v) => ({
      ...v,
      id: crypto.randomUUID(),
    }));
    dashboards.set(newDashboard.id, newDashboard);
    return newDashboard;
  }

  // ─── Favorites ───────────────────────────────────────────────────────

  addFavorite(dashboardId: string, userId: string): DashboardFavorite | null {
    if (!dashboards.has(dashboardId)) return null;

    const existing = Array.from(favorites.values()).find(
      (f) => f.dashboardId === dashboardId && f.userId === userId
    );
    if (existing) return existing;

    const favorite: DashboardFavorite = {
      id: crypto.randomUUID(),
      dashboardId,
      userId,
      createdAt: new Date(),
    };
    favorites.set(favorite.id, favorite);
    return favorite;
  }

  removeFavorite(dashboardId: string, userId: string): boolean {
    for (const [key, f] of favorites) {
      if (f.dashboardId === dashboardId && f.userId === userId) {
        favorites.delete(key);
        return true;
      }
    }
    return false;
  }

  isFavorited(dashboardId: string, userId: string): boolean {
    return Array.from(favorites.values()).some(
      (f) => f.dashboardId === dashboardId && f.userId === userId
    );
  }

  getUserFavorites(userId: string): Dashboard[] {
    const favIds = Array.from(favorites.values())
      .filter((f) => f.userId === userId)
      .map((f) => f.dashboardId);
    return favIds
      .map((id) => dashboards.get(id))
      .filter((d): d is Dashboard => d !== null);
  }

  // ─── Sharing ─────────────────────────────────────────────────────────

  shareDashboard(
    dashboardId: string,
    input: {
      sharedWithUserId?: string;
      permissionLevel: DashboardPermissionLevel;
      expiresAt?: Date;
      createdBy: string;
    }
  ): DashboardShare | null {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;

    const share: DashboardShare = {
      id: crypto.randomUUID(),
      dashboardId,
      sharedWithUserId: input.sharedWithUserId ?? null,
      shareToken: input.sharedWithUserId ? null : crypto.randomUUID(),
      permissionLevel: input.permissionLevel,
      expiresAt: input.expiresAt ?? null,
      createdAt: new Date(),
      createdBy: input.createdBy,
    };

    shares.set(share.id, share);
    dashboard.shares.push(share);

    if (input.sharedWithUserId) {
      dashboard.permissions.push({
        id: crypto.randomUUID(),
        userId: input.sharedWithUserId,
        level: input.permissionLevel,
        grantedAt: new Date(),
        grantedBy: input.createdBy,
      });
    }

    return share;
  }

  revokeShare(shareId: string): boolean {
    const share = shares.get(shareId);
    if (!share) return false;

    const dashboard = dashboards.get(share.dashboardId);
    if (dashboard) {
      dashboard.shares = dashboard.shares.filter((s) => s.id !== shareId);
      if (share.sharedWithUserId) {
        dashboard.permissions = dashboard.permissions.filter(
          (p) => p.userId !== share.sharedWithUserId
        );
      }
    }

    shares.delete(shareId);
    return true;
  }

  getSharedWithUser(userId: string): Dashboard[] {
    const shareIds = Array.from(shares.values())
      .filter((s) => s.sharedWithUserId === userId)
      .map((s) => s.dashboardId);
    return [...new Set(shareIds)]
      .map((id) => dashboards.get(id))
      .filter((d): d is Dashboard => d !== null);
  }

  accessViaShareToken(token: string): Dashboard | null {
    const share = Array.from(shares.values()).find(
      (s) => s.shareToken === token
    );
    if (!share) return null;
    if (share.expiresAt && share.expiresAt < new Date()) return null;
    return dashboards.get(share.dashboardId) ?? null;
  }

  // ─── Permissions ─────────────────────────────────────────────────────

  checkPermission(
    dashboardId: string,
    userId: string,
    requiredLevel: DashboardPermissionLevel
  ): boolean {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return false;
    if (dashboard.ownerId === userId) return true;

    const levelHierarchy: Record<DashboardPermissionLevel, number> = {
      view: 0,
      edit: 1,
      admin: 2,
    };

    const permission = dashboard.permissions.find((p) => p.userId === userId);
    if (!permission) return dashboard.isPublic && requiredLevel === "view";

    return levelHierarchy[permission.level] >= levelHierarchy[requiredLevel];
  }

  grantPermission(
    dashboardId: string,
    userId: string,
    level: DashboardPermissionLevel,
    grantedBy: string
  ): DashboardPermission | null {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return null;

    const existing = dashboard.permissions.find((p) => p.userId === userId);
    if (existing) {
      existing.level = level;
      return existing;
    }

    const permission: DashboardPermission = {
      id: crypto.randomUUID(),
      userId,
      level,
      grantedAt: new Date(),
      grantedBy,
    };
    dashboard.permissions.push(permission);
    return permission;
  }

  revokePermission(dashboardId: string, userId: string): boolean {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return false;
    const before = dashboard.permissions.length;
    dashboard.permissions = dashboard.permissions.filter(
      (p) => p.userId !== userId
    );
    return dashboard.permissions.length < before;
  }

  // ─── Folders ─────────────────────────────────────────────────────────

  createFolder(
    input: Omit<DashboardFolder, "id" | "createdAt" | "updatedAt">
  ): DashboardFolder {
    const id = crypto.randomUUID();
    const now = new Date();
    const folder: DashboardFolder = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };
    folders.set(id, folder);
    return folder;
  }

  updateFolder(
    id: string,
    input: Partial<Pick<DashboardFolder, "name" | "parentId" | "color" | "icon" | "sortOrder">>
  ): DashboardFolder | null {
    const folder = folders.get(id);
    if (!folder) return null;
    const updated = { ...folder, ...input, updatedAt: new Date() };
    folders.set(id, updated);
    return updated;
  }

  deleteFolder(id: string): boolean {
    for (const d of dashboards.values()) {
      if (d.folderId === id) d.folderId = null;
    }
    for (const [key, f] of folders) {
      if (f.parentId === id) folders.delete(key);
    }
    return folders.delete(id);
  }

  getFolderTree(ownerId: string): DashboardFolder[] {
    return Array.from(folders.values())
      .filter((f) => f.ownerId === ownerId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getFolderDashboards(folderId: string): Dashboard[] {
    return Array.from(dashboards.values()).filter(
      (d) => d.folderId === folderId
    );
  }

  moveDashboard(dashboardId: string, folderId: string | null): boolean {
    const dashboard = dashboards.get(dashboardId);
    if (!dashboard) return false;
    if (folderId && !folders.has(folderId)) return false;
    dashboard.folderId = folderId;
    dashboard.updatedAt = new Date();
    return true;
  }

  // ─── Templates ───────────────────────────────────────────────────────

  createTemplate(
    input: Omit<
      DashboardTemplate,
      "id" | "createdAt" | "updatedAt" | "usageCount"
    >
  ): DashboardTemplate {
    const id = crypto.randomUUID();
    const now = new Date();
    const template: DashboardTemplate = {
      ...input,
      id,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    templates.set(id, template);
    return template;
  }

  getTemplate(id: string): DashboardTemplate | null {
    return templates.get(id) ?? null;
  }

  listTemplates(category?: string): DashboardTemplate[] {
    let results = Array.from(templates.values());
    if (category) results = results.filter((t) => t.category === category);
    return results.sort((a, b) => b.usageCount - a.usageCount);
  }

  deleteTemplate(id: string): boolean {
    return templates.delete(id);
  }

  createDashboardFromTemplate(
    templateId: string,
    title: string,
    userId: string
  ): Dashboard | null {
    const template = templates.get(templateId);
    if (!template) return null;

    template.usageCount += 1;

    const dashboard = this.createDashboard({
      title,
      templateId,
      tags: [...template.tags],
    });
    dashboard.ownerId = userId;
    dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

let defaultService: DashboardService | null = null;

export function getDashboardService(): DashboardService {
  if (!defaultService) defaultService = new DashboardService();
  return defaultService;
}

export function createDashboardService(): DashboardService {
  return new DashboardService();
}
