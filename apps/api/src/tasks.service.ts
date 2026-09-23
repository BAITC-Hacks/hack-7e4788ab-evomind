import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { taskCards } from '@evomind/db';
import {
  scoreBreakdownSchema,
  taskCardSchema,
  type ReadinessLevel,
  type TaskCard,
  type TaskCardInput,
  type UpdateTaskInput,
} from '@evomind/contracts';
import { DatabaseService } from './database.service';
import { calculateTaskScore } from './scoring';

type TaskRow = typeof taskCards.$inferSelect;

@Injectable()
export class TasksService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  create(input: TaskCardInput): TaskCard {
    const id = randomUUID();
    const now = new Date().toISOString();
    const scored = calculateTaskScore(input);
    this.database.db.insert(taskCards).values({
      ...input, ...scored, id, status: 'draft', createdAt: now, updatedAt: now,
    }).run();
    return this.getById(id);
  }

  update(id: string, patch: UpdateTaskInput): TaskCard {
    const current = this.getById(id);
    const input: TaskCardInput = {
      title: current.title, context: current.context, need: current.need, users: current.users,
      data: current.data, constraints: current.constraints, expectedResult: current.expectedResult,
      successCriteria: current.successCriteria, contact: current.contact,
      interactionFormat: current.interactionFormat, topic: current.topic,
      ...patch,
    };
    const scored = calculateTaskScore(input);
    this.database.db.update(taskCards).set({ ...patch, ...scored, updatedAt: new Date().toISOString() })
      .where(eq(taskCards.id, id)).run();
    return this.getById(id);
  }

  publish(id: string): TaskCard {
    this.getById(id);
    this.database.db.update(taskCards).set({ status: 'published', updatedAt: new Date().toISOString() })
      .where(eq(taskCards.id, id)).run();
    return this.getById(id);
  }

  list(filters: { topic?: string; readiness?: ReadinessLevel; sort?: string }): TaskCard[] {
    const conditions = [eq(taskCards.status, 'published')];
    if (filters.topic) conditions.push(eq(taskCards.topic, filters.topic));
    if (filters.readiness) conditions.push(eq(taskCards.readinessLevel, filters.readiness));
    const ordering = filters.sort === 'score_asc' ? asc(taskCards.score) : desc(taskCards.score);
    return this.database.db.select().from(taskCards).where(and(...conditions)).orderBy(ordering).all().map(mapTask);
  }

  getById(id: string): TaskCard {
    const row = this.database.db.select().from(taskCards).where(eq(taskCards.id, id)).get();
    if (!row) throw new NotFoundException({ code: 'TASK_NOT_FOUND', message: `Task ${id} was not found` });
    return mapTask(row);
  }
}

function mapTask(row: TaskRow): TaskCard {
  return taskCardSchema.parse({
    ...row,
    scoreBreakdown: scoreBreakdownSchema.parse(row.scoreBreakdown),
    missingFields: Array.isArray(row.missingFields) ? row.missingFields : [],
  });
}
