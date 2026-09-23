import { count } from 'drizzle-orm';
import { createDatabase, defaultDatabasePath } from './client';
import { proposals, taskCards, teams } from './schema';

const now = '2026-09-23T13:00:00.000Z';
const breakdown = { contextAndNeed: 20, data: 15, expectedResult: 15, successCriteria: 15, constraints: 10, users: 10, businessContact: 5 };
const taskTopics = ['retail', 'logistics', 'education', 'healthcare', 'energy'];
const taskRows = taskTopics.map((topic, index) => ({
  id: `task-${index + 1}`,
  status: 'published' as const,
  title: `Demo task ${index + 1}: ${topic}`,
  context: `Synthetic ${topic} business context for the reproducible demo`,
  need: `Improve a measurable ${topic} workflow`,
  users: 'Operations team and managers',
  data: 'Anonymized synthetic tabular records',
  constraints: 'Four-week pilot without personal data',
  expectedResult: 'Working prototype and evaluation report',
  successCriteria: 'At least 15% improvement on the agreed metric',
  contact: `demo-business-${index + 1}@example.test`,
  interactionFormat: 'Weekly online review',
  topic,
  score: 80 + index,
  readinessLevel: 'ready' as const,
  scoreBreakdown: breakdown,
  missingFields: [] as string[],
  createdAt: now,
  updatedAt: now,
}));
const teamRows = Array.from({ length: 5 }, (_, index) => ({
  id: `team-${index + 1}`,
  name: `Demo Team ${index + 1}`,
  description: 'Synthetic student team created for the EvoMind demo',
  contact: `demo-team-${index + 1}@example.test`,
  createdAt: now,
}));
const proposalRows = Array.from({ length: 5 }, (_, index) => ({
  id: `proposal-${index + 1}`,
  taskId: `task-${index + 1}`,
  teamId: `team-${index + 1}`,
  solutionIdea: `Synthetic solution idea ${index + 1}`,
  plan: 'Discovery, prototype, validation and handoff',
  timeline: '4 weeks',
  prototypeUrl: `https://example.test/prototypes/${index + 1}`,
  status: 'pending' as const,
  createdAt: now,
  updatedAt: now,
}));

const { db, sqlite } = createDatabase(process.env.DATABASE_URL ?? defaultDatabasePath);
db.transaction((tx) => {
  tx.insert(taskCards).values(taskRows).onConflictDoNothing().run();
  tx.insert(teams).values(teamRows).onConflictDoNothing().run();
  tx.insert(proposals).values(proposalRows).onConflictDoNothing().run();
});
const counts = {
  tasks: db.select({ value: count() }).from(taskCards).get()?.value ?? 0,
  teams: db.select({ value: count() }).from(teams).get()?.value ?? 0,
  proposals: db.select({ value: count() }).from(proposals).get()?.value ?? 0,
};
sqlite.close();
if (Object.values(counts).some((value) => value < 5)) throw new Error(`Seed verification failed: ${JSON.stringify(counts)}`);
console.log(`Seed complete: ${JSON.stringify(counts)}`);
