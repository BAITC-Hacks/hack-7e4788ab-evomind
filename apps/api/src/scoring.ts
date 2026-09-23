import type { ReadinessLevel, ScoreBreakdown, TaskCardInput } from '@evomind/contracts';

const present = (value: string | undefined) => Boolean(value?.trim());

export const scoreWeights: ScoreBreakdown = {
  contextAndNeed: 20,
  data: 20,
  expectedResult: 15,
  successCriteria: 15,
  constraints: 10,
  users: 10,
  businessContact: 10,
};

export function readinessForScore(score: number): ReadinessLevel {
  if (score >= 90) return 'priority';
  if (score >= 70) return 'ready';
  if (score >= 40) return 'workable';
  return 'draft';
}

export function calculateTaskScore(input: TaskCardInput) {
  const scoreBreakdown: ScoreBreakdown = {
    contextAndNeed: present(input.context) && present(input.need) ? scoreWeights.contextAndNeed : 0,
    data: present(input.data) ? scoreWeights.data : 0,
    expectedResult: present(input.expectedResult) ? scoreWeights.expectedResult : 0,
    successCriteria: present(input.successCriteria) ? scoreWeights.successCriteria : 0,
    constraints: present(input.constraints) ? scoreWeights.constraints : 0,
    users: present(input.users) ? scoreWeights.users : 0,
    businessContact: present(input.contact) && present(input.interactionFormat) ? scoreWeights.businessContact : 0,
  };
  const score = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);
  const missingFields = [
    'title', 'context', 'need', 'users', 'data', 'constraints', 'expectedResult',
    'successCriteria', 'contact', 'interactionFormat', 'topic',
  ].filter((field) => !present(input[field as keyof TaskCardInput]));
  return { score, scoreBreakdown, readinessLevel: readinessForScore(score), missingFields };
}
