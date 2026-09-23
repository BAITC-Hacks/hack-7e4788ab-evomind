import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { TasksController } from './tasks.controller';
import { ProposalsController } from './proposals.controller';
import { DatabaseService } from './database.service';
import { TasksService } from './tasks.service';
import { ProposalsService } from './proposals.service';
import { AiService, EnvironmentAiProvider } from './ai.service';

@Module({
  controllers: [HealthController, TasksController, ProposalsController],
  providers: [DatabaseService, TasksService, ProposalsService, AiService, EnvironmentAiProvider],
})
export class AppModule {}
