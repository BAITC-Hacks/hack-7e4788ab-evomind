import { describe, expect, it } from 'vitest';
import { AiService, type EnvironmentAiProvider } from '../src/ai.service';

const questions = [
  { id: '1', field: 'data', text: 'Data?' },
  { id: '2', field: 'users', text: 'Users?' },
  { id: '3', field: 'successCriteria', text: 'Metric?' },
];

describe('AI adapter', () => {
  it('falls back on an invalid provider response', async () => {
    const provider = { analyze: async () => ({ invalid: true }) } as unknown as EnvironmentAiProvider;
    const result = await new AiService(provider).analyze({ description: 'User supplied text', knownFields: {} });
    expect(result.mode).toBe('fallback');
    expect(result.questions).toHaveLength(3);
    expect(result.suggestedCard).toEqual({ context: 'User supplied text' });
  });

  it('removes facts that are absent from user input', async () => {
    const provider = {
      analyze: async () => ({
        questions, mode: 'ai', warnings: [],
        suggestedCard: { context: 'User supplied text', data: 'Invented private dataset' },
      }),
    } as unknown as EnvironmentAiProvider;
    const result = await new AiService(provider).analyze({ description: 'User supplied text', knownFields: {} });
    expect(result.mode).toBe('ai');
    expect(result.suggestedCard).toEqual({ context: 'User supplied text' });
    expect(result.warnings).toContain('Неподтверждённые AI-поля удалены из черновика.');
  });
});
