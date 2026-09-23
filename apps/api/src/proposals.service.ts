import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { proposals, teams } from '@evomind/db';
import { proposalSchema, type Proposal, type ProposalInput, type ProposalStatusUpdate } from '@evomind/contracts';
import { DatabaseService } from './database.service';
import { TasksService } from './tasks.service';

@Injectable()
export class ProposalsService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  create(taskId: string, input: ProposalInput): Proposal {
    this.tasks.getById(taskId);
    const team = this.database.db.select({ id: teams.id }).from(teams).where(eq(teams.id, input.teamId)).get();
    if (!team) throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: `Team ${input.teamId} was not found` });
    const id = randomUUID();
    const now = new Date().toISOString();
    this.database.db.insert(proposals).values({ ...input, id, taskId, status: 'pending', createdAt: now, updatedAt: now }).run();
    return this.getById(id);
  }

  list(taskId: string): Proposal[] {
    this.tasks.getById(taskId);
    return this.database.db.select().from(proposals).where(eq(proposals.taskId, taskId)).all().map(mapProposal);
  }

  updateStatus(id: string, input: ProposalStatusUpdate): Proposal {
    this.getById(id);
    this.database.db.update(proposals).set({ status: input.status, updatedAt: new Date().toISOString() })
      .where(eq(proposals.id, id)).run();
    return this.getById(id);
  }

  private getById(id: string): Proposal {
    const row = this.database.db.select().from(proposals).where(eq(proposals.id, id)).get();
    if (!row) throw new NotFoundException({ code: 'PROPOSAL_NOT_FOUND', message: `Proposal ${id} was not found` });
    return mapProposal(row);
  }
}

const mapProposal = (row: typeof proposals.$inferSelect) => proposalSchema.parse(row);
