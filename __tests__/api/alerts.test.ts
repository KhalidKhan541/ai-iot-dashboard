import { AlertService } from '@/services/alert-service';

describe('Alerts API Integration', () => {
  let service: AlertService;

  beforeEach(() => {
    service = new AlertService();
  });

  describe('GET /api/alerts', () => {
    it('should return empty list when no alerts', () => {
      const alerts = service.getAll();
      expect(alerts).toHaveLength(0);
    });

    it('should return all alerts', () => {
      service.create({
        deviceId: 'd1',
        title: 'Alert 1',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });
      service.create({
        deviceId: 'd2',
        title: 'Alert 2',
        message: 'Msg',
        severity: 'critical',
        category: 'anomaly',
      });

      const alerts = service.getAll();
      expect(alerts).toHaveLength(2);
    });

    it('should filter alerts by severity', () => {
      service.create({
        deviceId: 'd1',
        title: 'Warning',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });
      service.create({
        deviceId: 'd2',
        title: 'Critical',
        message: 'Msg',
        severity: 'critical',
        category: 'threshold',
      });

      const warnings = service.getAll({ severity: ['warning'] });
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe('warning');
    });

    it('should filter alerts by status', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      service.acknowledge(alert.id, 'user-1');

      const active = service.getAll({ status: ['active'] });
      expect(active).toHaveLength(0);

      const acknowledged = service.getAll({ status: ['acknowledged'] });
      expect(acknowledged).toHaveLength(1);
    });

    it('should filter alerts by device', () => {
      service.create({
        deviceId: 'd1',
        title: 'Alert 1',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });
      service.create({
        deviceId: 'd2',
        title: 'Alert 2',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      const d1Alerts = service.getAll({ deviceId: 'd1' });
      expect(d1Alerts).toHaveLength(1);
      expect(d1Alerts[0].deviceId).toBe('d1');
    });

    it('should return alert statistics', () => {
      service.create({
        deviceId: 'd1',
        title: 'A1',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      const stats = service.getStats();
      expect(stats.total).toBe(1);
      expect(stats.active).toBe(1);
    });
  });

  describe('POST /api/alerts', () => {
    it('should create an alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'High Temperature',
        message: 'Temperature exceeded threshold',
        severity: 'warning',
        category: 'threshold',
        metric: 'temperature',
        currentValue: 85,
        threshold: 75,
      });

      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('active');
      expect(alert.severity).toBe('warning');
    });

    it('should create alert with metadata', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'System Alert',
        message: 'System failure',
        severity: 'critical',
        category: 'system',
        metadata: { source: 'monitoring', code: 500 },
      });

      expect(alert.metadata.source).toBe('monitoring');
    });
  });

  describe('PATCH /api/alerts', () => {
    it('should acknowledge an alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      const acked = service.acknowledge(alert.id, 'user-1');

      expect(acked?.status).toBe('acknowledged');
      expect(acked?.acknowledgedBy).toBe('user-1');
    });

    it('should resolve an alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      const resolved = service.resolve(alert.id);

      expect(resolved?.status).toBe('resolved');
      expect(resolved?.resolvedAt).toBeDefined();
    });

    it('should suppress an alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      const suppressed = service.suppress(alert.id);

      expect(suppressed?.status).toBe('suppressed');
    });

    it('should not acknowledge resolved alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      service.resolve(alert.id);
      const result = service.acknowledge(alert.id, 'user-1');

      expect(result).toBeUndefined();
    });
  });

  describe('DELETE /api/alerts', () => {
    it('should delete an alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      const result = service.delete(alert.id);
      expect(result).toBe(true);
      expect(service.getById(alert.id)).toBeUndefined();
    });
  });

  describe('Alert Rules Integration', () => {
    it('should evaluate rules and create alerts', () => {
      service.addRule({
        name: 'High Temp',
        deviceId: 'd1',
        metric: 'temperature',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 0,
        enabled: true,
      });

      const alerts = service.evaluateRules('d1', 'temperature', 85);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('warning');
    });

    it('should respect cooldown periods', () => {
      service.addRule({
        name: 'High Temp',
        deviceId: 'd1',
        metric: 'temperature',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 60000,
        enabled: true,
      });

      const first = service.evaluateRules('d1', 'temperature', 85);
      const second = service.evaluateRules('d1', 'temperature', 85);

      expect(first).toHaveLength(1);
      expect(second).toHaveLength(0);
    });
  });

  describe('Alert Lifecycle', () => {
    it('should handle full alert lifecycle', () => {
      // Create
      const alert = service.create({
        deviceId: 'd1',
        title: 'Temperature Alert',
        message: 'High temperature detected',
        severity: 'warning',
        category: 'threshold',
      });
      expect(alert.status).toBe('active');

      // Acknowledge
      service.acknowledge(alert.id, 'user-1');
      expect(service.getById(alert.id)?.status).toBe('acknowledged');

      // Resolve
      service.resolve(alert.id);
      expect(service.getById(alert.id)?.status).toBe('resolved');
    });

    it('should track alert statistics through lifecycle', () => {
      const a1 = service.create({
        deviceId: 'd1',
        title: 'A1',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });
      const a2 = service.create({
        deviceId: 'd2',
        title: 'A2',
        message: 'Msg',
        severity: 'critical',
        category: 'anomaly',
      });

      service.acknowledge(a1.id, 'user-1');
      service.resolve(a2.id);

      const stats = service.getStats();
      expect(stats.active).toBe(0);
      expect(stats.acknowledged).toBe(1);
      expect(stats.resolved).toBe(1);
    });
  });
});
