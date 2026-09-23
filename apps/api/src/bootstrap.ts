import { type INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiExceptionFilter } from './api-exception.filter';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('EvoMind API')
    .setDescription('Backend contracts and infrastructure for the EvoMind MVP')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    TaskCard: {
      type: 'object',
      description: 'Editable business task with a server-calculated readiness score.',
      example: {
        id: 'task-1', status: 'published', title: 'Reduce delivery delays',
        context: 'Regional delivery service', need: 'Predict delays', users: 'Dispatchers',
        data: 'Synthetic route history', constraints: 'No personal data', expectedResult: 'Risk dashboard',
        successCriteria: '15% fewer late deliveries', contact: 'demo@example.test',
        interactionFormat: 'Weekly online review', topic: 'logistics', score: 80, readinessLevel: 'ready',
        scoreBreakdown: { contextAndNeed: 20, data: 15, expectedResult: 15, successCriteria: 15, constraints: 10, users: 10, businessContact: 5 },
        missingFields: [],
      },
    },
    ClarificationResult: {
      type: 'object',
      example: {
        questions: ['Who uses the result?', 'Which data is available?', 'How is success measured?'],
        suggestedCard: { title: 'Delivery improvement', topic: 'logistics' }, mode: 'fallback', warnings: [],
      },
    },
    Proposal: {
      type: 'object',
      example: {
        id: 'proposal-1', taskId: 'task-1', teamId: 'team-1', solutionIdea: 'Route risk model',
        plan: 'Discovery, prototype, validation', timeline: '4 weeks',
        prototypeUrl: 'https://example.test/prototypes/1', status: 'pending',
      },
    },
    ApiError: {
      type: 'object',
      example: { error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: [] } },
    },
  };
  SwaggerModule.setup('api/docs', app, document);
  return app;
}
