import {
  apiErrorSchema,
  clarificationResultSchema,
  proposalSchema,
  taskCardSchema,
  type ClarificationResult,
  type Proposal,
  type ProposalInput,
  type ReadinessLevel,
  type TaskCard,
  type TaskEditorValues,
} from "@evomind/contracts";

export type TaskQuery = {
  topic?: string;
  readiness?: ReadinessLevel;
  sort?: "score_asc" | "score_desc";
};

export interface EvoMindApi {
  analyze(description: string): Promise<ClarificationResult>;
  saveTask(values: TaskEditorValues, taskId?: string): Promise<TaskCard>;
  publishTask(task: TaskCard): Promise<TaskCard>;
  listTasks(query?: TaskQuery): Promise<TaskCard[]>;
  createProposal(taskId: string, values: ProposalInput): Promise<Proposal>;
  listProposals(taskId: string): Promise<Proposal[]>;
  setProposalStatus(id: string, status: "accepted" | "rejected"): Promise<Proposal>;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiRequestError("API недоступен. Проверьте соединение и повторите попытку.", "NETWORK_ERROR", 0);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      throw new ApiRequestError(parsed.data.error.message, parsed.data.error.code, response.status, parsed.data.error.details);
    }
    if (response.status >= 500) {
      throw new ApiRequestError("Сервис временно недоступен. Повторите попытку.", "SERVICE_UNAVAILABLE", response.status, payload);
    }
    throw new ApiRequestError(`Сервер вернул ошибку ${response.status}`, "HTTP_ERROR", response.status, payload);
  }
  return payload;
}

export const httpApi: EvoMindApi = {
  async analyze(description) {
    return clarificationResultSchema.parse(await request("/api/tasks/analyze", {
      method: "POST",
      body: JSON.stringify({ description }),
    }));
  },

  async saveTask(values, taskId) {
    return taskCardSchema.parse(await request(taskId ? `/api/tasks/${taskId}` : "/api/tasks", {
      method: taskId ? "PATCH" : "POST",
      body: JSON.stringify(values),
    }));
  },

  async publishTask(task) {
    return taskCardSchema.parse(await request(`/api/tasks/${task.id}/publish`, { method: "POST" }));
  },

  async listTasks(query = {}) {
    const params = new URLSearchParams();
    if (query.topic) params.set("topic", query.topic);
    if (query.readiness) params.set("readiness", query.readiness);
    params.set("sort", query.sort ?? "score_desc");
    return taskCardSchema.array().parse(await request(`/api/tasks?${params.toString()}`));
  },

  async createProposal(taskId, values) {
    return proposalSchema.parse(await request(`/api/tasks/${taskId}/proposals`, {
      method: "POST",
      body: JSON.stringify(values),
    }));
  },

  async listProposals(taskId) {
    return proposalSchema.array().parse(await request(`/api/tasks/${taskId}/proposals`));
  },

  async setProposalStatus(id, status) {
    return proposalSchema.parse(await request(`/api/proposals/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }));
  },
};
