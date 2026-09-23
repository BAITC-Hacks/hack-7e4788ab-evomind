import { afterEach, describe, expect, it, vi } from "vitest";
import { clarificationFixture, strongDraft } from "./fixtures";
import { httpApi } from "./api-client";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("httpApi", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the brief to the analyze endpoint and validates the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(clarificationFixture));
    vi.stubGlobal("fetch", fetchMock);

    await expect(httpApi.analyze("Нужно быстрее разбирать обращения")).resolves.toEqual(clarificationFixture);
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/analyze", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ description: "Нужно быстрее разбирать обращения" }),
    }));
  });

  it("passes catalog filters and sorting to the server", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([strongDraft]));
    vi.stubGlobal("fetch", fetchMock);

    await httpApi.listTasks({ topic: "Клиентский сервис", readiness: "ready", sort: "score_asc" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tasks?topic=%D0%9A%D0%BB%D0%B8%D0%B5%D0%BD%D1%82%D1%81%D0%BA%D0%B8%D0%B9+%D1%81%D0%B5%D1%80%D0%B2%D0%B8%D1%81&readiness=ready&sort=score_asc",
      expect.any(Object),
    );
  });

  it("surfaces canonical API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      error: { code: "VALIDATION_ERROR", message: "Проверьте поля", details: ["title"] },
    }, 400)));

    const request = httpApi.listTasks();
    await expect(request).rejects.toMatchObject({
      name: "ApiRequestError",
      code: "VALIDATION_ERROR",
      status: 400,
      message: "Проверьте поля",
    });
  });

  it("returns a retryable network error when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("connection refused")));

    await expect(httpApi.listTasks()).rejects.toEqual(expect.objectContaining({
      code: "NETWORK_ERROR",
      status: 0,
    }));
  });
});
