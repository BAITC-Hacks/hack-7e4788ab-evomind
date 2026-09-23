import {
  clarificationResultSchema,
  proposalSchema,
  taskCardSchema,
  type Proposal,
  type ProposalInput,
  type TaskCard,
  type TaskEditorValues,
} from "@evomind/contracts";
import { clarificationFixture, initialProposal, strongDraft, taskFixtures, weakDraft } from "./fixtures";
import type { EvoMindApi, TaskQuery } from "./api-client";

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
let catalog = [...taskFixtures];
let proposals: Proposal[] = [];

export const mockApi: EvoMindApi & { reset(): void; getInitialDraft(): TaskCard } = {
  async analyze(description: string) {
    await wait();
    if (description.toLowerCase().includes("ошибка")) throw new Error("Сервис анализа временно недоступен");
    return clarificationResultSchema.parse(clarificationFixture);
  },
  async saveTask(values: TaskEditorValues, taskId?: string) {
    await wait();
    return taskCardSchema.parse({ ...strongDraft, ...values, id: taskId ?? strongDraft.id });
  },
  async publishTask(task: TaskCard) {
    await wait();
    const published = taskCardSchema.parse({ ...task, status: "published" });
    catalog = [published, ...catalog.filter((item) => item.id !== published.id)];
    return published;
  },
  async listTasks(query: TaskQuery = {}) {
    await wait(250);
    const result = catalog
      .filter((task) => !query.topic || task.topic === query.topic)
      .filter((task) => !query.readiness || task.readinessLevel === query.readiness)
      .sort((a, b) => query.sort === "score_asc" ? a.score - b.score : b.score - a.score);
    return taskCardSchema.array().parse(result);
  },
  async createProposal(taskId: string, values: ProposalInput) {
    await wait();
    const proposal = proposalSchema.parse({ ...initialProposal, ...values, taskId, id: `proposal-${proposals.length + 1}`, status: "pending" });
    proposals = [proposal, ...proposals];
    return proposal;
  },
  async listProposals(taskId: string) {
    await wait(250);
    return proposalSchema.array().parse(proposals.filter((proposal) => proposal.taskId === taskId));
  },
  async setProposalStatus(id: string, status: "accepted" | "rejected") {
    await wait();
    proposals = proposals.map((proposal) => proposal.id === id ? { ...proposal, status } : proposal);
    const updated = proposals.find((proposal) => proposal.id === id);
    if (!updated) throw new Error("Отклик не найден");
    return proposalSchema.parse(updated);
  },
  reset() {
    catalog = [...taskFixtures];
    proposals = [];
  },
  getInitialDraft() {
    return taskCardSchema.parse(weakDraft);
  },
};
