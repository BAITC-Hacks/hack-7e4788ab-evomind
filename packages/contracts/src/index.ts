import { z } from 'zod';

export const taskStatusSchema = z.enum(['draft', 'published']);
export const readinessLevelSchema = z.enum(['draft', 'workable', 'ready', 'priority']);
export const proposalStatusSchema = z.enum(['pending', 'accepted', 'rejected']);
export const clarificationModeSchema = z.enum(['ai', 'fallback']);

export const scoreBreakdownSchema = z.object({
  contextAndNeed: z.number().min(0).max(20),
  data: z.number().min(0).max(20),
  expectedResult: z.number().min(0).max(15),
  successCriteria: z.number().min(0).max(15),
  constraints: z.number().min(0).max(10),
  users: z.number().min(0).max(10),
  businessContact: z.number().min(0).max(10),
});

export const taskCardSchema = z.object({
  id: z.string().min(1),
  status: taskStatusSchema,
  title: z.string(),
  context: z.string(),
  need: z.string(),
  users: z.string(),
  data: z.string(),
  constraints: z.string(),
  expectedResult: z.string(),
  successCriteria: z.string(),
  contact: z.string(),
  interactionFormat: z.string(),
  topic: z.string(),
  score: z.number().int().min(0).max(100),
  readinessLevel: readinessLevelSchema,
  scoreBreakdown: scoreBreakdownSchema,
  missingFields: z.array(z.string()),
});

export const taskCardInputSchema = taskCardSchema.omit({
  id: true,
  score: true,
  readinessLevel: true,
  scoreBreakdown: true,
  missingFields: true,
}).partial({ status: true });

export const createTaskInputSchema = taskCardInputSchema.extend({
  title: z.string().trim().min(1, 'Название задачи обязательно'),
  context: z.string().trim().min(1, 'Контекст задачи обязателен'),
  need: z.string().trim().min(1, 'Бизнес-потребность обязательна'),
});

// Форма редактирования карточки на фронтенде: те же поля, что в
// taskCardInputSchema, но с человекочитаемыми сообщениями валидации для
// react-hook-form. Имена полей совпадают с taskCardSchema (канонической
// схемой backend), чтобы данные с формы напрямую соответствовали API.
export const taskEditorSchema = taskCardSchema.pick({
  title: true,
  context: true,
  need: true,
  users: true,
  data: true,
  constraints: true,
  expectedResult: true,
  successCriteria: true,
  contact: true,
  interactionFormat: true,
  topic: true,
}).extend({
  title: z.string().min(3, 'Добавьте понятное название'),
  context: z.string().min(10, 'Опишите контекст подробнее'),
  need: z.string().min(10, 'Сформулируйте потребность'),
  users: z.string().min(3, 'Укажите пользователей'),
  data: z.string().min(3, 'Опишите доступные данные'),
  constraints: z.string().min(3, 'Укажите ограничения'),
  expectedResult: z.string().min(5, 'Опишите ожидаемый результат'),
  successCriteria: z.string().min(5, 'Добавьте измеримый критерий'),
  contact: z.string().min(3, 'Укажите контакт'),
  interactionFormat: z.string().min(3, 'Укажите формат взаимодействия'),
  topic: z.string().min(2, 'Укажите тему'),
});

export const clarificationQuestionSchema = z.object({
  id: z.string(),
  field: taskEditorSchema.keyof(),
  text: z.string(),
  hint: z.string().optional(),
});

// Предложенный AI черновик карточки намеренно неполный (задача
// clarification — как раз выявить недостающие поля), поэтому все поля
// опциональны в отличие от taskCardInputSchema.
export const suggestedCardSchema = taskCardInputSchema.partial();

export const analyzeTaskInputSchema = z.object({
  description: z.string().trim().min(1),
  knownFields: suggestedCardSchema.optional().default({}),
});

export const updateTaskInputSchema = taskCardInputSchema.partial().omit({ status: true });

export const clarificationResultSchema = z.object({
  questions: z.array(clarificationQuestionSchema).min(3),
  suggestedCard: suggestedCardSchema,
  mode: clarificationModeSchema,
  warnings: z.array(z.string()),
});

export const proposalSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  teamId: z.string().min(1),
  solutionIdea: z.string().min(1),
  plan: z.string().min(1),
  timeline: z.string().min(1),
  prototypeUrl: z.string().url(),
  status: proposalStatusSchema,
});

export const proposalInputSchema = proposalSchema.pick({
  teamId: true,
  solutionIdea: true,
  plan: true,
  timeline: true,
  prototypeUrl: true,
}).extend({
  teamId: z.string().min(2, 'Укажите команду'),
  solutionIdea: z.string().min(10, 'Раскройте идею решения'),
  plan: z.string().min(10, 'Добавьте план работ'),
  timeline: z.string().min(2, 'Укажите срок'),
  prototypeUrl: z.union([z.literal(''), z.string().url('Введите корректную ссылку')]),
});

export const proposalStatusUpdateSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ReadinessLevel = z.infer<typeof readinessLevelSchema>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;
export type TaskCard = z.infer<typeof taskCardSchema>;
export type TaskCardInput = z.infer<typeof taskCardInputSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type SuggestedCard = z.infer<typeof suggestedCardSchema>;
export type AnalyzeTaskInput = z.infer<typeof analyzeTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
export type TaskEditorValues = z.infer<typeof taskEditorSchema>;
export type ClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;
export type ClarificationResult = z.infer<typeof clarificationResultSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalInput = z.infer<typeof proposalInputSchema>;
export type ProposalStatusUpdate = z.infer<typeof proposalStatusUpdateSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
