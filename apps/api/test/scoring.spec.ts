import { describe, expect, it } from 'vitest';
import { calculateTaskScore, readinessForScore } from '../src/scoring';

describe('readiness boundaries', () => {
  it.each([
    [0, 'draft'], [39, 'draft'], [40, 'workable'], [69, 'workable'],
    [70, 'ready'], [89, 'ready'], [90, 'priority'], [100, 'priority'],
  ] as const)('maps %i to %s', (score, expected) => {
    expect(readinessForScore(score)).toBe(expected);
  });

  it('awards only complete confirmed criteria and sums to 100', () => {
    const result = calculateTaskScore({
      title: 'Task', context: 'Context', need: 'Need', users: 'Users', data: 'Data', constraints: 'None',
      expectedResult: 'Prototype', successCriteria: 'Metric', contact: 'Contact', interactionFormat: 'Weekly', topic: 'Topic',
    });
    expect(result.score).toBe(100);
    expect(Object.values(result.scoreBreakdown).reduce((sum, value) => sum + value, 0)).toBe(result.score);
    expect(result.missingFields).toEqual([]);
  });

  it('does not award a grouped criterion when one confirmed value is absent', () => {
    const result = calculateTaskScore({
      title: '', context: 'Context', need: '', users: '', data: '', constraints: '', expectedResult: '',
      successCriteria: '', contact: 'Contact', interactionFormat: '', topic: '',
    });
    expect(result.scoreBreakdown.contextAndNeed).toBe(0);
    expect(result.scoreBreakdown.businessContact).toBe(0);
    expect(result.score).toBe(0);
  });
});
