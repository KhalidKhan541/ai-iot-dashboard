import { DashboardService, WidgetService } from '@/services/dashboard-service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService();
  });

  describe('create', () => {
    it('should create a dashboard with valid input', () => {
      const dashboard = service.create({
        name: 'Main Dashboard',
        description: 'Primary monitoring view',
        ownerId: 'user-1',
        shared: false,
        tags: ['monitoring', 'production'],
      });

      expect(dashboard).toBeDefined();
      expect(dashboard.id).toBeDefined();
      expect(dashboard.name).toBe('Main Dashboard');
      expect(dashboard.description).toBe('Primary monitoring view');
      expect(dashboard.ownerId).toBe('user-1');
      expect(dashboard.shared).toBe(false);
      expect(dashboard.tags).toEqual(['monitoring', 'production']);
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
      expect(dashboard.layout.gap).toBe(16);
    });

    it('should use default values for optional fields', () => {
      const dashboard = service.create({
        name: 'Minimal Dashboard',
        ownerId: 'user-1',
      });

      expect(dashboard.description).toBe('');
      expect(dashboard.shared).toBe(false);
      expect(dashboard.tags).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return dashboard by ID', () => {
      const created = service.create({
        name: 'Test',
        ownerId: 'user-1',
      });

      const found = service.getById(created.id);
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent ID', () => {
      const found = service.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      service.create({ name: 'D1', ownerId: 'user-1', shared: true, tags: ['prod'] });
      service.create({ name: 'D2', ownerId: 'user-2', shared: false, tags: ['dev'] });
      service.create({ name: 'D3', ownerId: 'user-1', shared: true, tags: ['prod', 'dev'] });
    });

    it('should return all dashboards', () => {
      const dashboards = service.getAll();
      expect(dashboards).toHaveLength(3);
    });

    it('should filter by owner ID', () => {
      const dashboards = service.getAll({ ownerId: 'user-1' });
      expect(dashboards).toHaveLength(2);
    });

    it('should filter by shared status', () => {
      const dashboards = service.getAll({ shared: true });
      expect(dashboards).toHaveLength(2);
    });

    it('should filter by tags', () => {
      const dashboards = service.getAll({ tags: ['prod'] });
      expect(dashboards).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update dashboard fields', () => {
      const created = service.create({
        name: 'Original',
        ownerId: 'user-1',
      });

      const updated = service.update(created.id, {
        name: 'Updated',
        description: 'New description',
        shared: true,
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
      expect(updated?.shared).toBe(true);
    });

    it('should return undefined for non-existent dashboard', () => {
      const result = service.update('non-existent', { name: 'New' });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete dashboard', () => {
      const created = service.create({
        name: 'To Delete',
        ownerId: 'user-1',
      });

      const result = service.delete(created.id);
      expect(result).toBe(true);
      expect(service.getById(created.id)).toBeUndefined();
    });

    it('should return false for non-existent dashboard', () => {
      const result = service.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('duplicate', () => {
    it('should duplicate dashboard with new name', () => {
      const original = service.create({
        name: 'Original',
        ownerId: 'user-1',
        tags: ['prod'],
      });

      const copy = service.duplicate(original.id, 'Copy', 'user-2');

      expect(copy).toBeDefined();
      expect(copy?.name).toBe('Copy');
      expect(copy?.ownerId).toBe('user-2');
      expect(copy?.shared).toBe(false);
      expect(copy?.tags).toEqual(['prod']);
    });

    it('should return undefined for non-existent dashboard', () => {
      const result = service.duplicate('non-existent', 'Copy', 'user-1');
      expect(result).toBeUndefined();
    });
  });

  describe('addWidget', () => {
    it('should add widget to dashboard', () => {
      const dashboard = service.create({
        name: 'Dashboard',
        ownerId: 'user-1',
      });

      const widget = service.addWidget({
        dashboardId: dashboard.id,
        type: 'chart',
        title: 'Temperature Chart',
        config: { deviceId: 'd1', metric: 'temperature', chartType: 'line' },
      });

      expect(widget).toBeDefined();
      expect(widget.dashboardId).toBe(dashboard.id);
      expect(widget.type).toBe('chart');
    });
  });

  describe('removeWidget', () => {
    it('should remove widget from dashboard', () => {
      const dashboard = service.create({
        name: 'Dashboard',
        ownerId: 'user-1',
      });

      const widget = service.addWidget({
        dashboardId: dashboard.id,
        type: 'chart',
        title: 'Chart',
        config: {},
      });

      const result = service.removeWidget(dashboard.id, widget.id);
      expect(result).toBe(true);
    });

    it('should return false for non-existent widget', () => {
      const dashboard = service.create({
        name: 'Dashboard',
        ownerId: 'user-1',
      });

      const result = service.removeWidget(dashboard.id, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should calculate dashboard statistics', () => {
      const d1 = service.create({ name: 'D1', ownerId: 'user-1' });
      const d2 = service.create({ name: 'D2', ownerId: 'user-2' });

      service.addWidget({ dashboardId: d1.id, type: 'chart', title: 'C1', config: {} });
      service.addWidget({ dashboardId: d1.id, type: 'gauge', title: 'G1', config: {} });
      service.addWidget({ dashboardId: d2.id, type: 'chart', title: 'C2', config: {} });

      const stats = service.getStats();

      expect(stats.totalDashboards).toBe(2);
      expect(stats.totalWidgets).toBe(3);
      expect(stats.avgWidgetsPerDashboard).toBe(1.5);
      expect(stats.byType.chart).toBe(2);
      expect(stats.byType.gauge).toBe(1);
    });
  });

  describe('clear', () => {
    it('should reset all dashboards', () => {
      service.create({ name: 'D1', ownerId: 'user-1' });
      service.create({ name: 'D2', ownerId: 'user-2' });

      service.clear();
      expect(service.count()).toBe(0);
    });
  });
});

describe('WidgetService', () => {
  let service: WidgetService;

  beforeEach(() => {
    service = new WidgetService();
  });

  describe('create', () => {
    it('should create a widget with valid input', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'chart',
        title: 'Temperature Chart',
        config: { deviceId: 'd1', metric: 'temperature', chartType: 'line' },
        position: { x: 0, y: 0, w: 6, h: 4 },
        refreshIntervalMs: 5000,
      });

      expect(widget).toBeDefined();
      expect(widget.id).toBeDefined();
      expect(widget.dashboardId).toBe('dash-1');
      expect(widget.type).toBe('chart');
      expect(widget.title).toBe('Temperature Chart');
      expect(widget.config.deviceId).toBe('d1');
      expect(widget.position).toEqual({ x: 0, y: 0, w: 6, h: 4 });
      expect(widget.refreshIntervalMs).toBe(5000);
    });

    it('should use default values for optional fields', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'gauge',
        title: 'Gauge',
        config: {},
      });

      expect(widget.position).toEqual({ x: 0, y: 0, w: 6, h: 4 });
      expect(widget.refreshIntervalMs).toBe(30000);
    });
  });

  describe('getById', () => {
    it('should return widget by ID', () => {
      const created = service.create({
        dashboardId: 'dash-1',
        type: 'chart',
        title: 'Chart',
        config: {},
      });

      const found = service.getById(created.id);
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent ID', () => {
      const found = service.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByDashboardId', () => {
    it('should return widgets for a dashboard', () => {
      service.create({ dashboardId: 'd1', type: 'chart', title: 'C1', config: {} });
      service.create({ dashboardId: 'd1', type: 'gauge', title: 'G1', config: {} });
      service.create({ dashboardId: 'd2', type: 'chart', title: 'C2', config: {} });

      const widgets = service.getByDashboardId('d1');
      expect(widgets).toHaveLength(2);
    });
  });

  describe('getAll', () => {
    beforeEach(() => {
      service.create({ dashboardId: 'd1', type: 'chart', title: 'C1', config: {} });
      service.create({ dashboardId: 'd1', type: 'gauge', title: 'G1', config: {} });
      service.create({ dashboardId: 'd2', type: 'table', title: 'T1', config: {} });
    });

    it('should return all widgets', () => {
      const widgets = service.getAll();
      expect(widgets).toHaveLength(3);
    });

    it('should filter by type', () => {
      const charts = service.getAll({ type: 'chart' });
      expect(charts).toHaveLength(1);
    });

    it('should filter by dashboard ID', () => {
      const d1Widgets = service.getAll({ dashboardId: 'd1' });
      expect(d1Widgets).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update widget fields', () => {
      const created = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Original',
        config: { deviceId: 'd1' },
      });

      const updated = service.update(created.id, {
        title: 'Updated',
        config: { deviceId: 'd2' },
      });

      expect(updated?.title).toBe('Updated');
      expect(updated?.config.deviceId).toBe('d2');
    });

    it('should return undefined for non-existent widget', () => {
      const result = service.update('non-existent', { title: 'New' });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete widget', () => {
      const created = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'To Delete',
        config: {},
      });

      const result = service.delete(created.id);
      expect(result).toBe(true);
      expect(service.getById(created.id)).toBeUndefined();
    });

    it('should return false for non-existent widget', () => {
      const result = service.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('updatePosition', () => {
    it('should update widget position', () => {
      const created = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Chart',
        config: {},
      });

      const updated = service.updatePosition(created.id, {
        x: 4,
        y: 8,
        w: 8,
        h: 6,
      });

      expect(updated?.position).toEqual({ x: 4, y: 8, w: 8, h: 6 });
    });
  });

  describe('reorder', () => {
    it('should reorder widgets', () => {
      const w1 = service.create({ dashboardId: 'd1', type: 'chart', title: 'C1', config: {} });
      const w2 = service.create({ dashboardId: 'd1', type: 'gauge', title: 'G1', config: {} });
      const w3 = service.create({ dashboardId: 'd1', type: 'table', title: 'T1', config: {} });

      service.reorder('d1', [w3.id, w1.id, w2.id]);

      const widgets = service.getByDashboardId('d1');
      expect(widgets[0].id).toBe(w3.id);
      expect(widgets[1].id).toBe(w1.id);
      expect(widgets[2].id).toBe(w2.id);
    });
  });

  describe('clear', () => {
    it('should reset all widgets', () => {
      service.create({ dashboardId: 'd1', type: 'chart', title: 'C1', config: {} });
      service.create({ dashboardId: 'd2', type: 'gauge', title: 'G1', config: {} });

      service.clear();
      expect(service.count()).toBe(0);
    });
  });
});
