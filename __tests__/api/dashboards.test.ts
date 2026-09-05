import { DashboardService, WidgetService } from '@/services/dashboard-service';

describe('Dashboards API Integration', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
  });

  describe('GET /api/dashboards', () => {
    it('should return empty list when no dashboards', () => {
      const dashboards = service.getAll();
      expect(dashboards).toHaveLength(0);
    });

    it('should return all dashboards', () => {
      service.create({ name: 'D1', ownerId: 'user-1' });
      service.create({ name: 'D2', ownerId: 'user-2' });

      const dashboards = service.getAll();
      expect(dashboards).toHaveLength(2);
    });

    it('should filter dashboards by owner', () => {
      service.create({ name: 'D1', ownerId: 'user-1' });
      service.create({ name: 'D2', ownerId: 'user-2' });
      service.create({ name: 'D3', ownerId: 'user-1' });

      const user1Dashboards = service.getAll({ ownerId: 'user-1' });
      expect(user1Dashboards).toHaveLength(2);
    });

    it('should filter dashboards by shared status', () => {
      service.create({ name: 'D1', ownerId: 'user-1', shared: true });
      service.create({ name: 'D2', ownerId: 'user-2', shared: false });

      const sharedDashboards = service.getAll({ shared: true });
      expect(sharedDashboards).toHaveLength(1);
    });

    it('should filter dashboards by tags', () => {
      service.create({ name: 'D1', ownerId: 'user-1', tags: ['prod', 'monitoring'] });
      service.create({ name: 'D2', ownerId: 'user-2', tags: ['dev'] });

      const prodDashboards = service.getAll({ tags: ['prod'] });
      expect(prodDashboards).toHaveLength(1);
    });

    it('should return dashboard statistics', () => {
      const d1 = service.create({ name: 'D1', ownerId: 'user-1' });
      service.addWidget({
        dashboardId: d1.id,
        type: 'chart',
        title: 'Chart 1',
        config: {},
      });

      const stats = service.getStats();
      expect(stats.totalDashboards).toBe(1);
      expect(stats.totalWidgets).toBe(1);
    });
  });

  describe('POST /api/dashboards', () => {
    it('should create a dashboard', () => {
      const dashboard = service.create({
        name: 'New Dashboard',
        description: 'Test dashboard',
        ownerId: 'user-1',
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('New Dashboard');
      expect(dashboard.layout).toEqual({ columns: 12, rowHeight: 80, gap: 16 });
    });

    it('should create dashboard with custom layout', () => {
      const dashboard = service.create({
        name: 'Custom Dashboard',
        ownerId: 'user-1',
        layout: { columns: 6, rowHeight: 100 },
      });

      expect(dashboard.layout.columns).toBe(6);
      expect(dashboard.layout.rowHeight).toBe(100);
    });

    it('should create dashboard with widgets', () => {
      const dashboard = service.create({
        name: 'Dashboard with Widgets',
        ownerId: 'user-1',
      });

      service.addWidget({
        dashboardId: dashboard.id,
        type: 'chart',
        title: 'Temperature Chart',
        config: { deviceId: 'd1', metric: 'temperature' },
      });

      service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        title: 'CPU Usage',
        config: { deviceId: 'd1', metric: 'cpu' },
      });

      const widgets = service.getById(dashboard.id)?.widgets;
      expect(widgets).toHaveLength(2);
    });
  });

  describe('PUT /api/dashboards', () => {
    it('should update dashboard', () => {
      const created = service.create({
        name: 'Original',
        ownerId: 'user-1',
      });

      const updated = service.update(created.id, {
        name: 'Updated',
        description: 'New description',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
    });

    it('should return undefined for non-existent dashboard', () => {
      const result = service.update('non-existent', { name: 'New' });
      expect(result).toBeUndefined();
    });
  });

  describe('DELETE /api/dashboards', () => {
    it('should delete dashboard', () => {
      const created = service.create({
        name: 'To Delete',
        ownerId: 'user-1',
      });

      const result = service.delete(created.id);
      expect(result).toBe(true);
      expect(service.getById(created.id)).toBeUndefined();
    });

    it('should delete associated widgets', () => {
      const dashboard = service.create({
        name: 'Dashboard',
        ownerId: 'user-1',
      });

      service.addWidget({
        dashboardId: dashboard.id,
        type: 'chart',
        title: 'Chart',
        config: {},
      });

      service.delete(dashboard.id);

      expect(service.getById(dashboard.id)).toBeUndefined();
    });
  });

  describe('Dashboard with Widgets Integration', () => {
    it('should manage widget lifecycle', () => {
      const dashboard = service.create({
        name: 'Widget Test',
        ownerId: 'user-1',
      });

      // Add widgets
      const w1 = service.addWidget({
        dashboardId: dashboard.id,
        type: 'chart',
        title: 'Chart 1',
        config: { deviceId: 'd1' },
      });

      const w2 = service.addWidget({
        dashboardId: dashboard.id,
        type: 'gauge',
        title: 'Gauge 1',
        config: { deviceId: 'd1' },
      });

      expect(service.getById(dashboard.id)?.widgets).toHaveLength(2);

      // Remove widget
      service.removeWidget(dashboard.id, w1.id);
      expect(service.getById(dashboard.id)?.widgets).toHaveLength(1);

      // Verify remaining widget
      const remaining = service.getById(dashboard.id)?.widgets;
      expect(remaining?.[0].id).toBe(w2.id);
    });

    it('should duplicate dashboard with widgets', () => {
      const original = service.create({
        name: 'Original',
        ownerId: 'user-1',
        tags: ['prod'],
      });

      service.addWidget({
        dashboardId: original.id,
        type: 'chart',
        title: 'Chart',
        config: {},
      });

      const copy = service.duplicate(original.id, 'Copy', 'user-2');

      expect(copy).toBeDefined();
      expect(copy?.name).toBe('Copy');
      expect(copy?.ownerId).toBe('user-2');
      expect(copy?.tags).toEqual(['prod']);
    });
  });
});
