import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiService, EnvironmentAiProvider } from '../src/ai.service';

const questions = [
  { id: '1', field: 'data', text: 'Data?' },
  { id: '2', field: 'users', text: 'Users?' },
  { id: '3', field: 'successCriteria', text: 'Metric?' },
];

describe('AI adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

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

  it('calls OpenAI Chat Completions with a strict JSON schema', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'test-model';
    const openAiResult = {
      questions,
      suggestedCard: {
        title: '', context: 'User supplied text', need: '', users: '', data: '', constraints: '',
        expectedResult: '', successCriteria: '', contact: '', interactionFormat: '', topic: '',
      },
      mode: 'ai',
      warnings: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(openAiResult) } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new EnvironmentAiProvider().analyze({ description: 'User supplied text', knownFields: {} });
    expect(result).toEqual(openAiResult);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers).toMatchObject({ authorization: 'Bearer test-key' });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('test-model');
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[1].content).toContain('User supplied text');
  });

  it('falls back when OpenAI rejects the key', async () => {
    process.env.OPENAI_API_KEY = 'invalid-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const result = await new AiService(new EnvironmentAiProvider()).analyze({
      description: 'User supplied text',
      knownFields: {},
    });
    expect(result.mode).toBe('fallback');
    expect(result.questions).toHaveLength(3);
    expect(result.warnings[0]).toContain('OpenAI returned HTTP 401');
  });
});
