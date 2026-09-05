import { RuleEngine, Rule, RuleContext } from '@/services/rule-engine';

describe('RuleEngine', () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine({
      maxRules: 100,
      maxConditionsPerRule: 5,
      evaluationTimeoutMs: 5000,
      enableCaching: true,
      cacheTtlMs: 5000,
    });
  });

  describe('addRule', () => {
    it('should add a rule with valid input', () => {
      const rule = engine.addRule({
        name: 'High Temperature Alert',
        description: 'Alert when temperature exceeds 75°C',
        enabled: true,
        priority: 1,
        conditions: [
          { field: 'metric', operator: 'equals', value: 'temperature' },
          { field: 'value', operator: 'greater_than', value: 75 },
        ],
        actions: [
          { type: 'alert', config: { severity: 'warning' } },
        ],
        metadata: {},
      });

      expect(rule).toBeDefined();
      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('High Temperature Alert');
      expect(rule.enabled).toBe(true);
      expect(rule.priority).toBe(1);
      expect(rule.conditions).toHaveLength(2);
      expect(rule.actions).toHaveLength(1);
      expect(rule.triggerCount).toBe(0);
    });

    it('should reject rules exceeding max conditions', () => {
      const conditions = Array.from({ length: 6 }, (_, i) => ({
        field: `field${i}`,
        operator: 'equals' as const,
        value: `value${i}`,
      }));

      expect(() =>
        engine.addRule({
          name: 'Too Many Conditions',
          description: '',
          enabled: true,
          priority: 1,
          conditions,
          actions: [],
          metadata: {},
        })
      ).toThrow();
    });

    it('should reject when max rules exceeded', () => {
      const smallEngine = new RuleEngine({ maxRules: 2 });

      smallEngine.addRule({
        name: 'Rule 1',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });
      smallEngine.addRule({
        name: 'Rule 2',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });

      expect(() =>
        smallEngine.addRule({
          name: 'Rule 3',
          description: '',
          enabled: true,
          priority: 1,
          conditions: [],
          actions: [],
          metadata: {},
        })
      ).toThrow();
    });
  });

  describe('getRule', () => {
    it('should return rule by ID', () => {
      const rule = engine.addRule({
        name: 'Test Rule',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });

      const found = engine.getRule(rule.id);
      expect(found?.id).toBe(rule.id);
    });

    it('should return undefined for non-existent ID', () => {
      const found = engine.getRule('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllRules', () => {
    beforeEach(() => {
      engine.addRule({
        name: 'Rule 1',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });
      engine.addRule({
        name: 'Rule 2',
        description: '',
        enabled: false,
        priority: 2,
        conditions: [],
        actions: [],
        metadata: {},
      });
      engine.addRule({
        name: 'Rule 3',
        description: '',
        enabled: true,
        priority: 3,
        conditions: [],
        actions: [],
        metadata: {},
      });
    });

    it('should return all rules', () => {
      const rules = engine.getAllRules();
      expect(rules).toHaveLength(3);
    });

    it('should filter by enabled status', () => {
      const rules = engine.getAllRules({ enabled: true });
      expect(rules).toHaveLength(2);
    });

    it('should filter by priority', () => {
      const rules = engine.getAllRules({ priority: 1 });
      expect(rules).toHaveLength(1);
    });

    it('should sort by priority descending', () => {
      const rules = engine.getAllRules();
      expect(rules[0].priority).toBe(3);
      expect(rules[1].priority).toBe(2);
      expect(rules[2].priority).toBe(1);
    });
  });

  describe('updateRule', () => {
    it('should update rule fields', () => {
      const rule = engine.addRule({
        name: 'Original',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });

      const updated = engine.updateRule(rule.id, {
        name: 'Updated',
        enabled: false,
        priority: 5,
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.enabled).toBe(false);
      expect(updated?.priority).toBe(5);
    });

    it('should return undefined for non-existent rule', () => {
      const result = engine.updateRule('non-existent', { name: 'New' });
      expect(result).toBeUndefined();
    });
  });

  describe('deleteRule', () => {
    it('should delete rule', () => {
      const rule = engine.addRule({
        name: 'To Delete',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });

      const result = engine.deleteRule(rule.id);
      expect(result).toBe(true);
      expect(engine.getRule(rule.id)).toBeUndefined();
    });

    it('should return false for non-existent rule', () => {
      const result = engine.deleteRule('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('should trigger rule when conditions are met', () => {
      engine.addRule({
        name: 'High Temp',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [
          { field: 'metric', operator: 'equals', value: 'temperature' },
          { field: 'value', operator: 'greater_than', value: 75 },
        ],
        actions: [
          { type: 'alert', config: { severity: 'warning' } },
        ],
        metadata: {},
      });

      const context: RuleContext = {
        deviceId: 'd1',
        metric: 'temperature',
        value: 85,
        timestamp: new Date(),
        metadata: {},
        deviceMetadata: {},
      };

      const results = engine.evaluate(context);

      expect(results).toHaveLength(1);
      expect(results[0].triggered).toBe(true);
      expect(results[0].matchedConditions).toBe(2);
      expect(results[0].actions).toHaveLength(1);
    });

    it('should not trigger when conditions are not met', () => {
      engine.addRule({
        name: 'High Temp',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [
          { field: 'value', operator: 'greater_than', value: 75 },
        ],
        actions: [
          { type: 'alert', config: {} },
        ],
        metadata: {},
      });

      const context: RuleContext = {
        deviceId: 'd1',
        metric: 'temperature',
        value: 65,
        timestamp: new Date(),
        metadata: {},
        deviceMetadata: {},
      };

      const results = engine.evaluate(context);

      expect(results).toHaveLength(1);
      expect(results[0].triggered).toBe(false);
      expect(results[0].matchedConditions).toBe(0);
    });

    it('should not trigger disabled rules', () => {
      engine.addRule({
        name: 'Disabled Rule',
        description: '',
        enabled: false,
        priority: 1,
        conditions: [
          { field: 'value', operator: 'greater_than', value: 0 },
        ],
        actions: [],
        metadata: {},
      });

      const context: RuleContext = {
        deviceId: 'd1',
        metric: 'temperature',
        value: 100,
        timestamp: new Date(),
        metadata: {},
        deviceMetadata: {},
      };

      const results = engine.evaluate(context);
      expect(results).toHaveLength(0);
    });

    it('should evaluate multiple rules in priority order', () => {
      engine.addRule({
        name: 'Low Priority',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [{ field: 'value', operator: 'greater_than', value: 0 }],
        actions: [{ type: 'log', config: {} }],
        metadata: {},
      });
      engine.addRule({
        name: 'High Priority',
        description: '',
        enabled: true,
        priority: 10,
        conditions: [{ field: 'value', operator: 'greater_than', value: 0 }],
        actions: [{ type: 'alert', config: {} }],
        metadata: {},
      });

      const context: RuleContext = {
        deviceId: 'd1',
        metric: 'temp',
        value: 50,
        timestamp: new Date(),
        metadata: {},
        deviceMetadata: {},
      };

      const results = engine.evaluate(context);

      expect(results).toHaveLength(2);
      expect(results[0].ruleId).toBeDefined();
    });
  });

  describe('evaluateComposite', () => {
    it('should evaluate AND operator', () => {
      expect(engine.evaluateComposite('and', [true, true])).toBe(true);
      expect(engine.evaluateComposite('and', [true, false])).toBe(false);
    });

    it('should evaluate OR operator', () => {
      expect(engine.evaluateComposite('or', [false, true])).toBe(true);
      expect(engine.evaluateComposite('or', [false, false])).toBe(false);
    });

    it('should evaluate NOT operator', () => {
      expect(engine.evaluateComposite('not', [true])).toBe(false);
      expect(engine.evaluateComposite('not', [false])).toBe(true);
    });
  });

  describe('condition operators', () => {
    const testCases = [
      { operator: 'equals' as const, value: 10, test: 10, expected: true },
      { operator: 'equals' as const, value: 10, test: 20, expected: false },
      { operator: 'not_equals' as const, value: 10, test: 20, expected: true },
      { operator: 'greater_than' as const, value: 10, test: 20, expected: true },
      { operator: 'less_than' as const, value: 10, test: 5, expected: true },
      { operator: 'greater_equal' as const, value: 10, test: 10, expected: true },
      { operator: 'less_equal' as const, value: 10, test: 10, expected: true },
      { operator: 'between' as const, value: 5, value2: 15, test: 10, expected: true },
      { operator: 'between' as const, value: 5, value2: 8, test: 10, expected: false },
    ];

    testCases.forEach(({ operator, value, value2, test, expected }) => {
      it(`should handle ${operator} operator`, () => {
        engine.addRule({
          name: 'Test',
          description: '',
          enabled: true,
          priority: 1,
          conditions: [{ field: 'value', operator, value, value2 }],
          actions: [],
          metadata: {},
        });

        const context: RuleContext = {
          deviceId: 'd1',
          metric: 'temp',
          value: test,
          timestamp: new Date(),
          metadata: {},
          deviceMetadata: {},
        };

        const results = engine.evaluate(context);
        expect(results[0].triggered).toBe(expected);
      });
    });
  });

  describe('getStats', () => {
    it('should calculate rule statistics', () => {
      engine.addRule({
        name: 'Rule 1',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [{ field: 'v', operator: '>', value: 0 }],
        actions: [],
        metadata: {},
      });
      engine.addRule({
        name: 'Rule 2',
        description: '',
        enabled: false,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });

      const stats = engine.getStats();

      expect(stats.total).toBe(2);
      expect(stats.enabled).toBe(1);
      expect(stats.disabled).toBe(1);
      expect(stats.totalTriggers).toBe(0);
      expect(stats.avgConditionsPerRule).toBe(0.5);
    });
  });

  describe('clear', () => {
    it('should reset all rules and cache', () => {
      engine.addRule({
        name: 'Rule',
        description: '',
        enabled: true,
        priority: 1,
        conditions: [],
        actions: [],
        metadata: {},
      });

      engine.clear();
      expect(engine.count()).toBe(0);
    });
  });
});
