
import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('utils', () => {
  describe('cn function', () => {
    it('merges class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      const condition = true;
      const result = cn('class1', condition ? 'class2' : '');
      expect(result).toBe('class1 class2');
    });

    it('filters out falsy values', () => {
      const result = cn('class1', false && 'class2', null, undefined, 0, '');
      expect(result).toBe('class1');
    });
  });
});
