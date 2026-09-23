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

export const clarificationResultSchema = z.object({
  questions: z.array(z.string().min(1)).min(3),
  suggestedCard: taskCardInputSchema,
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
export type ClarificationResult = z.infer<typeof clarificationResultSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
