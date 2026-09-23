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

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
let catalog = [...taskFixtures];
let proposals: Proposal[] = [];

export const mockApi = {
  async analyze(description: string) {
    await wait();
    if (description.toLowerCase().includes("ошибка")) throw new Error("Сервис анализа временно недоступен");
    return clarificationResultSchema.parse(clarificationFixture);
  },
  async saveTask(values: TaskEditorValues) {
    await wait();
    return taskCardSchema.parse({ ...strongDraft, ...values });
  },
  async publishTask(task: TaskCard) {
    await wait();
    const published = taskCardSchema.parse({ ...task, status: "published" });
    catalog = [published, ...catalog.filter((item) => item.id !== published.id)];
    return published;
  },
  async listTasks() {
    await wait(250);
    return taskCardSchema.array().parse(catalog);
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
