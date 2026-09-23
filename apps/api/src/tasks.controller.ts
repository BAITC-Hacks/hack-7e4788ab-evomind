import { Body, Controller, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { taskCardInputSchema, type TaskCardInput } from '@evomind/contracts';
import { ZodValidationPipe } from './zod-validation.pipe';

const taskExample: TaskCardInput = {
  status: 'draft',
  title: 'Reduce delivery delays',
  context: 'A regional delivery service is missing promised time windows',
  need: 'Identify routes at risk before dispatch',
  users: 'Dispatchers',
  data: 'Synthetic route and timing history',
  constraints: 'No personal data',
  expectedResult: 'Risk dashboard prototype',
  successCriteria: '15% fewer late deliveries',
  contact: 'demo-business@example.test',
  interactionFormat: 'Weekly online review',
  topic: 'logistics',
};

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  @Post('validate')
  @ApiOperation({ summary: 'Validate a TaskCard input contract without persisting it' })
  @ApiBody({ schema: { type: 'object', example: taskExample } })
  @ApiCreatedResponse({ schema: { example: { valid: true, data: taskExample } } })
  @ApiBadRequestResponse({
    schema: { example: { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [] } } },
  })
  validate(@Body(new ZodValidationPipe(taskCardInputSchema)) body: TaskCardInput) {
    return { valid: true, data: body };
  }
}
