import { Inject, Injectable } from '@nestjs/common';
import {
  clarificationResultSchema,
  type AnalyzeTaskInput,
  type ClarificationQuestion,
  type ClarificationResult,
  type SuggestedCard,
} from '@evomind/contracts';

@Injectable()
export class EnvironmentAiProvider {
  async analyze(input: AnalyzeTaskInput): Promise<unknown> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: [
              'Ты бизнес-аналитик. Сформируй от 3 до 6 коротких уточняющих вопросов на русском языке.',
              'Не добавляй факты, которых нет во вводе пользователя.',
              'В suggestedCard копируй только дословно подтверждённые значения; неизвестные поля оставляй пустыми.',
            ].join(' '),
          },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'clarification_result',
            strict: true,
            schema: clarificationJsonSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
    const payload = await response.json() as ChatCompletionResponse;
    const message = payload.choices?.[0]?.message;
    if (message?.refusal) throw new Error(`OpenAI refused the request: ${message.refusal}`);
    if (!message?.content) throw new Error('OpenAI returned no structured content');
    return JSON.parse(message.content) as unknown;
  }
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }>;
};

const cardProperties = Object.fromEntries([
  'title', 'context', 'need', 'users', 'data', 'constraints', 'expectedResult',
  'successCriteria', 'contact', 'interactionFormat', 'topic',
].map((field) => [field, { type: 'string' }]));

const clarificationJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['questions', 'suggestedCard', 'mode', 'warnings'],
  properties: {
    questions: {
      type: 'array',
      minItems: 3,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'field', 'text'],
        properties: {
          id: { type: 'string' },
          field: {
            type: 'string',
            enum: ['title', 'context', 'need', 'users', 'data', 'constraints', 'expectedResult', 'successCriteria', 'contact', 'interactionFormat', 'topic'],
          },
          text: { type: 'string' },
        },
      },
    },
    suggestedCard: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(cardProperties),
      properties: cardProperties,
    },
    mode: { type: 'string', enum: ['ai'] },
    warnings: { type: 'array', items: { type: 'string' } },
  },
};

const questionBank: ClarificationQuestion[] = [
  { id: 'q-data', field: 'data', text: 'Какие данные уже доступны для решения задачи?', hint: 'Формат, объём и ограничения доступа' },
  { id: 'q-success', field: 'successCriteria', text: 'По какому измеримому критерию вы оцените успех?' },
  { id: 'q-users', field: 'users', text: 'Кто будет основным пользователем результата?' },
  { id: 'q-constraints', field: 'constraints', text: 'Какие сроки, бюджетные или правовые ограничения важны?' },
  { id: 'q-result', field: 'expectedResult', text: 'Какой результат или прототип вы ожидаете получить?' },
  { id: 'q-need', field: 'need', text: 'Какую конкретную бизнес-потребность должна закрыть задача?' },
  { id: 'q-contact', field: 'contact', text: 'Кто со стороны бизнеса сможет подтверждать требования?' },
  { id: 'q-format', field: 'interactionFormat', text: 'В каком формате команда сможет взаимодействовать с бизнесом?' },
  { id: 'q-topic', field: 'topic', text: 'К какой предметной теме относится задача?' },
];

const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

@Injectable()
export class AiService {
  constructor(@Inject(EnvironmentAiProvider) private readonly provider: EnvironmentAiProvider) {}

  async analyze(input: AnalyzeTaskInput): Promise<ClarificationResult> {
    try {
      const raw = await this.provider.analyze(input);
      const parsed = clarificationResultSchema.safeParse(raw);
      if (!parsed.success) throw new Error('AI response does not match ClarificationResult');
      const { suggestedCard, removed } = this.sanitizeSuggestedCard(parsed.data.suggestedCard, input);
      return {
        ...parsed.data,
        mode: 'ai',
        suggestedCard,
        warnings: [...parsed.data.warnings, ...(removed ? ['Неподтверждённые AI-поля удалены из черновика.'] : [])],
      };
    } catch (error) {
      return this.fallback(input, error instanceof Error ? error.message : 'AI provider unavailable');
    }
  }

  private fallback(input: AnalyzeTaskInput, reason: string): ClarificationResult {
    const suggestedCard: SuggestedCard = { ...input.knownFields };
    if (!hasText(suggestedCard.context)) suggestedCard.context = input.description;
    const missing = new Set(Object.entries(suggestedCard).filter(([, value]) => !hasText(value)).map(([field]) => field));
    const prioritized = questionBank.filter((question) => missing.has(question.field));
    const questions = [...prioritized, ...questionBank.filter((question) => !prioritized.includes(question))].slice(0, 3);
    return {
      questions,
      suggestedCard,
      mode: 'fallback',
      warnings: [`Использован детерминированный анализ: ${reason}`],
    };
  }

  private sanitizeSuggestedCard(card: SuggestedCard, input: AnalyzeTaskInput) {
    const sanitized: SuggestedCard = { ...input.knownFields };
    let removed = false;
    for (const [field, value] of Object.entries(card)) {
      if (!hasText(value)) continue;
      const known = input.knownFields[field as keyof SuggestedCard];
      const confirmed = value === known || input.description.toLocaleLowerCase().includes(value.toLocaleLowerCase());
      if (confirmed) sanitized[field as keyof SuggestedCard] = value as never;
      else removed = true;
    }
    if (!hasText(sanitized.context)) sanitized.context = input.description;
    return { suggestedCard: sanitized, removed };
  }
}
