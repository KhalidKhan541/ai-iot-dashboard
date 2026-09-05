import { AlertService, AlertCreateInput } from '@/services/alert-service';

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    service = new AlertService();
  });

  describe('create', () => {
    it('should create an alert with valid input', () => {
      const input: AlertCreateInput = {
        deviceId: 'device-1',
        title: 'High Temperature',
        message: 'Temperature exceeded threshold',
        severity: 'warning',
        category: 'threshold',
        metric: 'temperature',
        currentValue: 85,
        threshold: 75,
      };

      const alert = service.create(input);

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.deviceId).toBe('device-1');
      expect(alert.title).toBe('High Temperature');
      expect(alert.message).toBe('Temperature exceeded threshold');
      expect(alert.severity).toBe('warning');
      expect(alert.status).toBe('active');
      expect(alert.category).toBe('threshold');
      expect(alert.metric).toBe('temperature');
      expect(alert.currentValue).toBe(85);
      expect(alert.threshold).toBe(75);
      expect(alert.metadata).toEqual({});
    });

    it('should create alert with metadata', () => {
      const input: AlertCreateInput = {
        deviceId: 'device-1',
        title: 'Error',
        message: 'Something failed',
        severity: 'critical',
        category: 'system',
        metadata: { source: 'monitoring', code: 500 },
      };

      const alert = service.create(input);
      expect(alert.metadata).toEqual({ source: 'monitoring', code: 500 });
    });
  });

  describe('getById', () => {
    it('should return alert by ID', () => {
      const created = service.create({
        deviceId: 'd1',
        title: 'Test',
        message: 'Test alert',
        severity: 'info',
        category: 'system',
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
      service.create({
        deviceId: 'd1',
        title: 'Alert 3',
        message: 'Msg',
        severity: 'info',
        category: 'system',
      });
    });

    it('should return all alerts', () => {
      const alerts = service.getAll();
      expect(alerts).toHaveLength(3);
    });

    it('should filter by status', () => {
      const alerts = service.getAll({ status: ['active'] });
      expect(alerts).toHaveLength(3);
    });

    it('should filter by severity', () => {
      const alerts = service.getAll({ severity: ['warning'] });
      expect(alerts).toHaveLength(1);
    });

    it('should filter by device ID', () => {
      const alerts = service.getAll({ deviceId: 'd1' });
      expect(alerts).toHaveLength(2);
    });

    it('should filter by category', () => {
      const alerts = service.getAll({ category: 'anomaly' });
      expect(alerts).toHaveLength(1);
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge an active alert', () => {
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
      expect(acked?.acknowledgedAt).toBeDefined();
    });

    it('should not acknowledge non-active alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      service.resolve(alert.id);
      const acked = service.acknowledge(alert.id, 'user-1');

      expect(acked).toBeUndefined();
    });

    it('should return undefined for non-existent alert', () => {
      const result = service.acknowledge('non-existent', 'user-1');
      expect(result).toBeUndefined();
    });
  });

  describe('resolve', () => {
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

    it('should not resolve already resolved alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      service.resolve(alert.id);
      const result = service.resolve(alert.id);

      expect(result).toBeUndefined();
    });
  });

  describe('suppress', () => {
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

    it('should not suppress resolved alert', () => {
      const alert = service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      service.resolve(alert.id);
      const result = service.suppress(alert.id);

      expect(result).toBeUndefined();
    });
  });

  describe('addRule', () => {
    it('should add an alert rule', () => {
      const rule = service.addRule({
        name: 'High Temp Rule',
        deviceId: 'd1',
        metric: 'temperature',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 60000,
        enabled: true,
      });

      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('High Temp Rule');
      expect(rule.enabled).toBe(true);
    });

    it('should return all rules', () => {
      service.addRule({
        name: 'Rule 1',
        deviceId: 'd1',
        metric: 'temp',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 60000,
        enabled: true,
      });

      const rules = service.getRules();
      expect(rules).toHaveLength(1);
    });
  });

  describe('evaluateRules', () => {
    it('should trigger alerts when conditions are met', () => {
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

    it('should not trigger when conditions are not met', () => {
      service.addRule({
        name: 'High Temp',
        deviceId: 'd1',
        metric: 'temperature',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 0,
        enabled: true,
      });

      const alerts = service.evaluateRules('d1', 'temperature', 65);
      expect(alerts).toHaveLength(0);
    });

    it('should respect cooldown period', () => {
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

    it('should not trigger disabled rules', () => {
      service.addRule({
        name: 'Disabled Rule',
        deviceId: 'd1',
        metric: 'temperature',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 0,
        enabled: false,
      });

      const alerts = service.evaluateRules('d1', 'temperature', 85);
      expect(alerts).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should calculate alert statistics', () => {
      service.create({
        deviceId: 'd1',
        title: 'A1',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });
      service.create({
        deviceId: 'd2',
        title: 'A2',
        message: 'Msg',
        severity: 'critical',
        category: 'anomaly',
      });

      const stats = service.getStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.acknowledged).toBe(0);
      expect(stats.resolved).toBe(0);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
      expect(stats.byCategory.threshold).toBe(1);
      expect(stats.byCategory.anomaly).toBe(1);
    });
  });

  describe('delete', () => {
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

  describe('deleteRule', () => {
    it('should delete a rule', () => {
      const rule = service.addRule({
        name: 'Rule',
        deviceId: 'd1',
        metric: 'temp',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 60000,
        enabled: true,
      });

      const result = service.deleteRule(rule.id);
      expect(result).toBe(true);
      expect(service.getRules()).toHaveLength(0);
    });
  });

  describe('getActiveAlertCount', () => {
    it('should return count of active alerts', () => {
      service.create({
        deviceId: 'd1',
        title: 'A1',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });

      expect(service.getActiveAlertCount()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should reset all data', () => {
      service.create({
        deviceId: 'd1',
        title: 'Alert',
        message: 'Msg',
        severity: 'warning',
        category: 'threshold',
      });
      service.addRule({
        name: 'Rule',
        deviceId: 'd1',
        metric: 'temp',
        condition: { operator: '>', value: 75 },
        severity: 'warning',
        cooldownMs: 60000,
        enabled: true,
      });

      service.clear();
      expect(service.count()).toBe(0);
      expect(service.getRules()).toHaveLength(0);
    });
  });
});
