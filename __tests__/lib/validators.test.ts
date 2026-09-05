import {
  validateOrThrow,
  validateSafe,
  sanitizeString,
  isValidJson,
  debounce,
  throttle,
  deviceNameSchema,
  batteryLevelSchema,
  firmwareVersionSchema,
  metricNameSchema,
  emailSchema,
  passwordSchema,
  usernameSchema,
  paginationSchema,
  timeRangeSchema,
} from '@/lib/validators';

describe('Validators', () => {
  describe('deviceNameSchema', () => {
    it('should accept valid device names', () => {
      expect(deviceNameSchema.parse('Temperature Sensor')).toBe('Temperature Sensor');
      expect(deviceNameSchema.parse('Device-01')).toBe('Device-01');
      expect(deviceNameSchema.parse('Sensor_1')).toBe('Sensor_1');
    });

    it('should reject empty names', () => {
      expect(() => deviceNameSchema.parse('')).toThrow();
    });

    it('should reject names exceeding 100 characters', () => {
      expect(() => deviceNameSchema.parse('a'.repeat(101))).toThrow();
    });

    it('should reject names with invalid characters', () => {
      expect(() => deviceNameSchema.parse('Device @#$%')).toThrow();
    });
  });

  describe('batteryLevelSchema', () => {
    it('should accept valid battery levels', () => {
      expect(batteryLevelSchema.parse(0)).toBe(0);
      expect(batteryLevelSchema.parse(50)).toBe(50);
      expect(batteryLevelSchema.parse(100)).toBe(100);
    });

    it('should reject negative values', () => {
      expect(() => batteryLevelSchema.parse(-1)).toThrow();
    });

    it('should reject values above 100', () => {
      expect(() => batteryLevelSchema.parse(101)).toThrow();
    });
  });

  describe('firmwareVersionSchema', () => {
    it('should accept valid semver formats', () => {
      expect(firmwareVersionSchema.parse('1.0.0')).toBe('1.0.0');
      expect(firmwareVersionSchema.parse('2.1.3')).toBe('2.1.3');
    });

    it('should reject invalid formats', () => {
      expect(() => firmwareVersionSchema.parse('v1.0.0')).toThrow();
      expect(() => firmwareVersionSchema.parse('1.0')).toThrow();
      expect(() => firmwareVersionSchema.parse('latest')).toThrow();
    });
  });

  describe('metricNameSchema', () => {
    it('should accept valid metric names', () => {
      expect(metricNameSchema.parse('temperature')).toBe('temperature');
      expect(metricNameSchema.parse('cpu_usage')).toBe('cpu_usage');
      expect(metricNameSchema.parse('Metric123')).toBe('Metric123');
    });

    it('should reject names with special characters', () => {
      expect(() => metricNameSchema.parse('temp-value')).toThrow();
      expect(() => metricNameSchema.parse('temp value')).toThrow();
    });
  });

  describe('emailSchema', () => {
    it('should accept valid emails', () => {
      expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
      expect(emailSchema.parse('test.user@domain.co')).toBe('test.user@domain.co');
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('@domain.com')).toThrow();
      expect(() => emailSchema.parse('user@')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      expect(passwordSchema.parse('StrongPass1!')).toBe('StrongPass1!');
      expect(passwordSchema.parse('MyP@ssw0rd')).toBe('MyP@ssw0rd');
    });

    it('should reject short passwords', () => {
      expect(() => passwordSchema.parse('Ab1!')).toThrow();
    });

    it('should reject passwords without uppercase', () => {
      expect(() => passwordSchema.parse('lowercase1!')).toThrow();
    });

    it('should reject passwords without lowercase', () => {
      expect(() => passwordSchema.parse('UPPERCASE1!')).toThrow();
    });

    it('should reject passwords without numbers', () => {
      expect(() => passwordSchema.parse('NoNumbers!')).toThrow();
    });

    it('should reject passwords without special characters', () => {
      expect(() => passwordSchema.parse('NoSpecial1')).toThrow();
    });
  });

  describe('usernameSchema', () => {
    it('should accept valid usernames', () => {
      expect(usernameSchema.parse('user123')).toBe('user123');
      expect(usernameSchema.parse('john_doe')).toBe('john_doe');
    });

    it('should reject short usernames', () => {
      expect(() => usernameSchema.parse('ab')).toThrow();
    });

    it('should reject usernames with special characters', () => {
      expect(() => usernameSchema.parse('user@name')).toThrow();
    });
  });

  describe('paginationSchema', () => {
    it('should apply default values', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('asc');
    });

    it('should accept valid pagination', () => {
      const result = paginationSchema.parse({
        page: 2,
        limit: 50,
        sortBy: 'name',
        sortOrder: 'desc',
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });
  });

  describe('timeRangeSchema', () => {
    it('should accept valid time range', () => {
      const result = timeRangeSchema.parse({
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-02T00:00:00Z',
      });
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should reject start after end', () => {
      expect(() =>
        timeRangeSchema.parse({
          start: '2024-01-02T00:00:00Z',
          end: '2024-01-01T00:00:00Z',
        })
      ).toThrow();
    });
  });

  describe('validateOrThrow', () => {
    it('should return validated data on success', () => {
      const result = validateOrThrow(deviceNameSchema, 'Valid Name');
      expect(result).toBe('Valid Name');
    });

    it('should throw on validation failure', () => {
      expect(() => validateOrThrow(deviceNameSchema, '')).toThrow('Validation failed');
    });
  });

  describe('validateSafe', () => {
    it('should return success result', () => {
      const result = validateSafe(deviceNameSchema, 'Valid');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('Valid');
      }
    });

    it('should return error result', () => {
      const result = validateSafe(deviceNameSchema, '');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('should remove javascript protocol', () => {
      expect(sanitizeString('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert(1)')).toBe('alert(1)');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });
  });

  describe('isValidJson', () => {
    it('should return true for valid JSON', () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
      expect(isValidJson('[1, 2, 3]')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(isValidJson('{key: value}')).toBe(false);
      expect(isValidJson('not json')).toBe(false);
    });
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });

  describe('throttle', () => {
    it('should limit function execution', () => {
      jest.useFakeTimers();
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});
