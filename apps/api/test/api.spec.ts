import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

describe('API foundation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => app.close());

  it('serves health status', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'evomind-api' });
  });

  it('accepts a valid shared TaskCard input', async () => {
    const input = {
      title: 'Delivery risk', context: 'Regional delivery service', need: 'Predict delays', users: 'Dispatchers',
      data: 'Synthetic routes', constraints: 'No PII', expectedResult: 'Prototype', successCriteria: '15% reduction',
      contact: 'demo@example.test', interactionFormat: 'Weekly call', topic: 'logistics',
    };
    const response = await request(app.getHttpServer()).post('/api/tasks/validate').send(input).expect(201);
    expect(response.body).toEqual({ valid: true, data: input });
  });

  it('returns the canonical error for an invalid DTO', async () => {
    const response = await request(app.getHttpServer()).post('/api/tasks/validate').send({ title: 42 }).expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Request validation failed');
    expect(response.body.error.details).toBeInstanceOf(Array);
  });

  it('returns the canonical error for an unknown endpoint', async () => {
    const response = await request(app.getHttpServer()).get('/api/missing').expect(404);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('publishes an OpenAPI document', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(response.body.paths).toHaveProperty('/api/health');
    expect(response.body.paths).toHaveProperty('/api/tasks/validate');
    expect(response.body.components.schemas).toHaveProperty('TaskCard');
    expect(response.body.components.schemas).toHaveProperty('ClarificationResult');
    expect(response.body.components.schemas).toHaveProperty('Proposal');
    expect(response.body.components.schemas).toHaveProperty('ApiError');
  });
});
