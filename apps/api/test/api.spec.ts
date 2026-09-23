import 'reflect-metadata';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { teams } from '@evomind/db';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { DatabaseService } from '../src/database.service';

const databasePath = resolve('.test-api.sqlite');
const fullInput = {
  title: 'Delivery risk', context: 'Regional delivery service', need: 'Predict delays', users: 'Dispatchers',
  data: 'Synthetic routes', constraints: 'No PII', expectedResult: 'Prototype', successCriteria: '15% reduction',
  contact: 'demo@example.test', interactionFormat: 'Weekly call', topic: 'logistics',
};

describe('domain API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    rmSync(databasePath, { force: true });
    process.env.DATABASE_URL = databasePath;
    delete process.env.OPENAI_API_KEY;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    const database = moduleRef.get(DatabaseService);
    database.db.insert(teams).values([
      { id: 'team-a', name: 'Team A', description: 'Demo team A', contact: 'a@example.test', createdAt: new Date().toISOString() },
      { id: 'team-b', name: 'Team B', description: 'Demo team B', contact: 'b@example.test', createdAt: new Date().toISOString() },
    ]).run();
  });

  afterAll(async () => {
    await app.close();
    rmSync(databasePath, { force: true });
    delete process.env.DATABASE_URL;
  });

  it('serves health and OpenAPI for the critical endpoints', async () => {
    const health = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(health.body.status).toBe('ok');
    const openapi = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(openapi.body.paths).toHaveProperty('/api/tasks/analyze');
    expect(openapi.body.paths).toHaveProperty('/api/tasks/{id}/publish');
    expect(openapi.body.paths).toHaveProperty('/api/proposals/{id}/status');
  });

  it('returns at least three questions and does not invent fallback facts', async () => {
    const description = 'Нужно сократить задержки доставки';
    const response = await request(app.getHttpServer()).post('/api/tasks/analyze').send({ description }).expect(201);
    expect(response.body.mode).toBe('fallback');
    expect(response.body.questions.length).toBeGreaterThanOrEqual(3);
    expect(response.body.suggestedCard).toEqual({ context: description });
    expect(response.body.warnings.length).toBeGreaterThan(0);
  });

  it('creates, enriches and publishes a draft with a transparent recalculation', async () => {
    const weak = await request(app.getHttpServer()).post('/api/tasks').send({
      ...fullInput, data: '', constraints: '', expectedResult: '', successCriteria: '', users: '', contact: '', interactionFormat: '',
    }).expect(201);
    expect(weak.body.score).toBe(20);
    expect(weak.body.status).toBe('draft');
    expect(weak.body.missingFields).toContain('data');
    const enriched = await request(app.getHttpServer()).patch(`/api/tasks/${weak.body.id}`).send(fullInput).expect(200);
    expect(enriched.body.score).toBe(100);
    expect(Object.values(enriched.body.scoreBreakdown).reduce((sum: number, value) => sum + Number(value), 0)).toBe(100);
    expect(enriched.body.readinessLevel).toBe('priority');
    const published = await request(app.getHttpServer()).post(`/api/tasks/${weak.body.id}/publish`).expect(201);
    expect(published.body.status).toBe('published');
  });

  it('keeps low-score publications visible and supports sorting and filters', async () => {
    const low = await request(app.getHttpServer()).post('/api/tasks').send({
      ...fullInput, topic: 'retail', data: '', expectedResult: '', successCriteria: '', constraints: '', users: '', contact: '', interactionFormat: '',
    }).expect(201);
    expect(low.body.score).toBeLessThan(40);
    await request(app.getHttpServer()).post(`/api/tasks/${low.body.id}/publish`).expect(201);
    const catalog = await request(app.getHttpServer()).get('/api/tasks?sort=score_desc').expect(200);
    expect(catalog.body.some((task: { id: string }) => task.id === low.body.id)).toBe(true);
    expect(catalog.body[0].score).toBeGreaterThanOrEqual(catalog.body.at(-1).score);
    const topic = await request(app.getHttpServer()).get('/api/tasks?topic=retail').expect(200);
    expect(topic.body).toHaveLength(1);
    const readiness = await request(app.getHttpServer()).get('/api/tasks?readiness=draft').expect(200);
    expect(readiness.body.some((task: { id: string }) => task.id === low.body.id)).toBe(true);
  });

  it('creates multiple proposals and changes each status only by explicit request', async () => {
    const catalog = await request(app.getHttpServer()).get('/api/tasks').expect(200);
    const taskId = catalog.body[0].id as string;
    const proposal = (teamId: string, suffix: string) => ({
      teamId, solutionIdea: `Detailed solution idea ${suffix}`, plan: `Discovery and prototype plan ${suffix}`,
      timeline: '4 weeks', prototypeUrl: `https://example.test/${suffix}`,
    });
    const first = await request(app.getHttpServer()).post(`/api/tasks/${taskId}/proposals`).send(proposal('team-a', 'a')).expect(201);
    const second = await request(app.getHttpServer()).post(`/api/tasks/${taskId}/proposals`).send(proposal('team-b', 'b')).expect(201);
    expect(first.body.status).toBe('pending');
    expect(second.body.status).toBe('pending');
    const accepted = await request(app.getHttpServer()).patch(`/api/proposals/${first.body.id}/status`).send({ status: 'accepted' }).expect(200);
    const rejected = await request(app.getHttpServer()).patch(`/api/proposals/${second.body.id}/status`).send({ status: 'rejected' }).expect(200);
    expect(accepted.body.status).toBe('accepted');
    expect(rejected.body.status).toBe('rejected');
    const list = await request(app.getHttpServer()).get(`/api/tasks/${taskId}/proposals`).expect(200);
    expect(list.body).toHaveLength(2);
  });

  it('uses the canonical envelope for invalid input and missing resources', async () => {
    const invalid = await request(app.getHttpServer()).post('/api/tasks/analyze').send({ description: '' }).expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    const emptyTask = await request(app.getHttpServer()).post('/api/tasks').send({
      title: '', context: '', need: '', users: '', data: '', constraints: '', expectedResult: '',
      successCriteria: '', contact: '', interactionFormat: '', topic: '',
    }).expect(400);
    expect(emptyTask.body.error.code).toBe('VALIDATION_ERROR');
    const missing = await request(app.getHttpServer()).post('/api/tasks/not-found/publish').expect(404);
    expect(missing.body.error.code).toBe('TASK_NOT_FOUND');
  });
});
