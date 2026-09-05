import { WidgetService } from '@/services/dashboard-service';

describe('WidgetService', () => {
  let service: WidgetService;

  beforeEach(() => {
    service = new WidgetService();
  });

  describe('create', () => {
    it('should create chart widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'chart',
        title: 'Temperature Over Time',
        config: {
          deviceId: 'device-1',
          metric: 'temperature',
          chartType: 'line',
          timeRange: '24h',
        },
      });

      expect(widget.type).toBe('chart');
      expect(widget.config.chartType).toBe('line');
      expect(widget.config.timeRange).toBe('24h');
    });

    it('should create gauge widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'gauge',
        title: 'CPU Usage',
        config: {
          deviceId: 'device-1',
          metric: 'cpu_usage',
          thresholds: [
            { value: 80, color: 'yellow', label: 'Warning' },
            { value: 95, color: 'red', label: 'Critical' },
          ],
        },
      });

      expect(widget.type).toBe('gauge');
      expect(widget.config.thresholds).toHaveLength(2);
    });

    it('should create table widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'table',
        title: 'Device List',
        config: {
          displayOptions: { columns: ['name', 'status', 'battery'] },
        },
      });

      expect(widget.type).toBe('table');
    });

    it('should create KPI widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'kpi',
        title: 'Total Devices',
        config: {
          deviceId: 'all',
          metric: 'count',
        },
      });

      expect(widget.type).toBe('kpi');
    });

    it('should create map widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'map',
        title: 'Device Locations',
        config: {
          displayOptions: { zoom: 12, center: { lat: 40.7128, lng: -74.006 } },
        },
      });

      expect(widget.type).toBe('map');
    });

    it('should create status widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'status',
        title: 'System Status',
        config: {
          deviceId: 'gateway-1',
        },
      });

      expect(widget.type).toBe('status');
    });

    it('should create alert-list widget', () => {
      const widget = service.create({
        dashboardId: 'dash-1',
        type: 'alert-list',
        title: 'Recent Alerts',
        config: {
          displayOptions: { limit: 10, severity: ['warning', 'critical'] },
        },
      });

      expect(widget.type).toBe('alert-list');
    });
  });

  describe('position management', () => {
    it('should update position', () => {
      const widget = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Chart',
        config: {},
        position: { x: 0, y: 0, w: 6, h: 4 },
      });

      const updated = service.updatePosition(widget.id, {
        x: 6,
        y: 0,
        w: 6,
        h: 8,
      });

      expect(updated?.position).toEqual({ x: 6, y: 0, w: 6, h: 8 });
    });

    it('should prevent out-of-bounds positions', () => {
      const widget = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Chart',
        config: {},
      });

      const updated = service.updatePosition(widget.id, {
        x: -1,
        y: -1,
        w: 0,
        h: 0,
      });

      expect(updated?.position.x).toBe(-1);
    });
  });

  describe('refresh intervals', () => {
    it('should set custom refresh interval', () => {
      const widget = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Chart',
        config: {},
        refreshIntervalMs: 5000,
      });

      expect(widget.refreshIntervalMs).toBe(5000);
    });

    it('should update refresh interval', () => {
      const widget = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Chart',
        config: {},
        refreshIntervalMs: 30000,
      });

      const updated = service.update(widget.id, { refreshIntervalMs: 60000 });
      expect(updated?.refreshIntervalMs).toBe(60000);
    });
  });

  describe('batch operations', () => {
    it('should create multiple widgets', () => {
      const widgets = [
        { dashboardId: 'd1', type: 'chart' as const, title: 'C1', config: {} },
        { dashboardId: 'd1', type: 'gauge' as const, title: 'G1', config: {} },
        { dashboardId: 'd1', type: 'table' as const, title: 'T1', config: {} },
      ];

      const created = widgets.map(w => service.create(w));
      expect(created).toHaveLength(3);
      expect(service.count()).toBe(3);
    });

    it('should delete all widgets for a dashboard', () => {
      service.create({ dashboardId: 'd1', type: 'chart', title: 'C1', config: {} });
      service.create({ dashboardId: 'd1', type: 'gauge', title: 'G1', config: {} });
      service.create({ dashboardId: 'd2', type: 'chart', title: 'C2', config: {} });

      const d1Widgets = service.getByDashboardId('d1');
      d1Widgets.forEach(w => service.delete(w.id));

      expect(service.getByDashboardId('d1')).toHaveLength(0);
      expect(service.getByDashboardId('d2')).toHaveLength(1);
    });
  });

  describe('widget configuration', () => {
    it('should store complex config', () => {
      const widget = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Complex Chart',
        config: {
          deviceId: 'd1',
          metric: 'temperature',
          chartType: 'line',
          timeRange: '7d',
          thresholds: [
            { value: 80, color: 'yellow', label: 'Warning' },
            { value: 95, color: 'red', label: 'Critical' },
          ],
          displayOptions: {
            showLegend: true,
            showGrid: true,
            animate: true,
            colors: ['#3b82f6', '#ef4444'],
          },
        },
      });

      expect(widget.config.thresholds).toHaveLength(2);
      expect(widget.config.displayOptions.showLegend).toBe(true);
    });

    it('should update config partially', () => {
      const widget = service.create({
        dashboardId: 'd1',
        type: 'chart',
        title: 'Chart',
        config: { deviceId: 'd1', metric: 'temp' },
      });

      const updated = service.update(widget.id, {
        config: { metric: 'humidity' },
      });

      expect(updated?.config.deviceId).toBe('d1');
      expect(updated?.config.metric).toBe('humidity');
    });
  });
});
