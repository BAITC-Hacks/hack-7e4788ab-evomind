import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const taskCards = sqliteTable('task_cards', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  title: text('title').notNull(),
  context: text('context').notNull(),
  need: text('need').notNull(),
  users: text('users').notNull(),
  data: text('data').notNull(),
  constraints: text('constraints').notNull(),
  expectedResult: text('expected_result').notNull(),
  successCriteria: text('success_criteria').notNull(),
  contact: text('contact').notNull(),
  interactionFormat: text('interaction_format').notNull(),
  topic: text('topic').notNull(),
  score: integer('score').notNull(),
  readinessLevel: text('readiness_level', {
    enum: ['draft', 'workable', 'ready', 'priority'],
  }).notNull(),
  scoreBreakdown: text('score_breakdown', { mode: 'json' }).notNull(),
  missingFields: text('missing_fields', { mode: 'json' }).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  contact: text('contact').notNull(),
  createdAt: text('created_at').notNull(),
});

export const proposals = sqliteTable('proposals', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => taskCards.id),
  teamId: text('team_id').notNull().references(() => teams.id),
  solutionIdea: text('solution_idea').notNull(),
  plan: text('plan').notNull(),
  timeline: text('timeline').notNull(),
  prototypeUrl: text('prototype_url').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
