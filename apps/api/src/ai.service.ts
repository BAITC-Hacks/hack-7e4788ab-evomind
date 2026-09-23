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
    const url = process.env.AI_API_URL;
    if (!url) throw new Error('AI_API_URL is not configured');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(process.env.AI_API_KEY ? { authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}`);
    return response.json();
  }
}

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
