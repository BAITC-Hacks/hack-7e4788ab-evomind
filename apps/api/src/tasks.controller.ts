import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  analyzeTaskInputSchema,
  readinessLevelSchema,
  taskCardInputSchema,
  updateTaskInputSchema,
  type AnalyzeTaskInput,
  type ReadinessLevel,
  type TaskCardInput,
  type UpdateTaskInput,
} from '@evomind/contracts';
import { AiService } from './ai.service';
import { TasksService } from './tasks.service';
import { ZodValidationPipe } from './zod-validation.pipe';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(AiService) private readonly ai: AiService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze user-provided facts and return clarification questions' })
  analyze(@Body(new ZodValidationPipe(analyzeTaskInputSchema)) input: AnalyzeTaskInput) {
    return this.ai.analyze(input);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft and calculate its score' })
  @ApiBadRequestResponse({ description: 'Input does not match TaskCardInput' })
  create(@Body(new ZodValidationPipe(taskCardInputSchema)) input: TaskCardInput) {
    return this.tasks.create(input);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update confirmed task fields and recalculate the score' })
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateTaskInputSchema)) input: UpdateTaskInput) {
    return this.tasks.update(id, input);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish a task by explicit business confirmation' })
  publish(@Param('id') id: string) {
    return this.tasks.publish(id);
  }

  @Get()
  @ApiOperation({ summary: 'List every published task, including low-scoring tasks' })
  @ApiQuery({ name: 'topic', required: false })
  @ApiQuery({ name: 'readiness', required: false, enum: ['draft', 'workable', 'ready', 'priority'] })
  @ApiQuery({ name: 'sort', required: false, enum: ['score_desc', 'score_asc'] })
  list(@Query('topic') topic?: string, @Query('readiness') readiness?: string, @Query('sort') sort?: string) {
    let parsedReadiness: ReadinessLevel | undefined;
    if (readiness) {
      const parsed = readinessLevelSchema.safeParse(readiness);
      if (!parsed.success) throw new BadRequestException({ code: 'INVALID_READINESS', message: 'Unknown readiness filter' });
      parsedReadiness = parsed.data;
    }
    if (sort && !['score_desc', 'score_asc'].includes(sort)) {
      throw new BadRequestException({ code: 'INVALID_SORT', message: 'Unknown sort option' });
    }
    return this.tasks.list({ topic, readiness: parsedReadiness, sort });
  }
}
