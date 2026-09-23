import { z } from "zod";

export const readinessLevels = ["draft", "workable", "ready", "priority"] as const;
export const taskStatuses = ["draft", "published"] as const;
export const proposalStatuses = ["pending", "accepted", "rejected"] as const;

export const scoreBreakdownSchema = z.object({
  context: z.number().min(0).max(20),
  need: z.number().min(0).max(20),
  data: z.number().min(0).max(20),
  expectedResult: z.number().min(0).max(15),
  successCriteria: z.number().min(0).max(15),
  constraints: z.number().min(0).max(10),
  usersAndContact: z.number().min(0).max(10),
});

export const taskCardSchema = z.object({
  id: z.string(),
  status: z.enum(taskStatuses),
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
  score: z.number().min(0).max(100),
  readinessLevel: z.enum(readinessLevels),
  scoreBreakdown: scoreBreakdownSchema,
  missingFields: z.array(z.string()),
});

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
  title: z.string().min(3, "Добавьте понятное название"),
  context: z.string().min(10, "Опишите контекст подробнее"),
  need: z.string().min(10, "Сформулируйте потребность"),
  users: z.string().min(3, "Укажите пользователей"),
  data: z.string().min(3, "Опишите доступные данные"),
  constraints: z.string().min(3, "Укажите ограничения"),
  expectedResult: z.string().min(5, "Опишите ожидаемый результат"),
  successCriteria: z.string().min(5, "Добавьте измеримый критерий"),
  contact: z.string().min(3, "Укажите контакт"),
  interactionFormat: z.string().min(3, "Укажите формат взаимодействия"),
  topic: z.string().min(2, "Укажите тему"),
});

export const clarificationQuestionSchema = z.object({
  id: z.string(),
  field: taskEditorSchema.keyof(),
  text: z.string(),
  hint: z.string().optional(),
});

export const clarificationResultSchema = z.object({
  questions: z.array(clarificationQuestionSchema).min(3),
  suggestedCard: taskEditorSchema.partial(),
  mode: z.enum(["ai", "fallback"]),
  warnings: z.array(z.string()),
});

export const proposalSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  teamId: z.string(),
  solutionIdea: z.string(),
  plan: z.string(),
  timeline: z.string(),
  prototypeUrl: z.string(),
  status: z.enum(proposalStatuses),
});

export const proposalInputSchema = proposalSchema.pick({
  teamId: true,
  solutionIdea: true,
  plan: true,
  timeline: true,
  prototypeUrl: true,
}).extend({
  teamId: z.string().min(2, "Укажите команду"),
  solutionIdea: z.string().min(10, "Раскройте идею решения"),
  plan: z.string().min(10, "Добавьте план работ"),
  timeline: z.string().min(2, "Укажите срок"),
  prototypeUrl: z.union([z.literal(""), z.string().url("Введите корректную ссылку")]),
});

export type TaskCard = z.infer<typeof taskCardSchema>;
export type TaskEditorValues = z.infer<typeof taskEditorSchema>;
export type ClarificationResult = z.infer<typeof clarificationResultSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalInput = z.infer<typeof proposalInputSchema>;
export type ReadinessLevel = (typeof readinessLevels)[number];
