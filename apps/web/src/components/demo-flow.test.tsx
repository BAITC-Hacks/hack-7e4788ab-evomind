import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { mockApi } from "@/lib/mock-api";
import { DemoFlow } from "./demo-flow";

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><DemoFlow /></QueryClientProvider>);
}

describe("DemoFlow", () => {
  beforeEach(() => mockApi.reset());

  it("validates a weak brief", async () => {
    const user = userEvent.setup();
    renderFlow();
    const input = screen.getByLabelText("Описание задачи");
    await user.clear(input);
    await user.type(input, "Коротко");
    await user.click(screen.getByRole("button", { name: /найти пробелы/i }));
    expect(await screen.findByText("Добавьте хотя бы одно-два предложения")).toBeInTheDocument();
  });

  it("moves from brief through three clarification questions", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: /найти пробелы/i }));
    expect(await screen.findByText(/Три ответа/)).toBeInTheDocument();
    const answers = screen.getAllByPlaceholderText("Ваш ответ");
    await user.type(answers[0]!, "Операторы поддержки");
    await user.type(answers[1]!, "История обращений за год");
    await user.type(answers[2]!, "Сократить время на 30 процентов");
    await user.click(screen.getByRole("button", { name: /собрать карточку/i }));
    expect(await screen.findByText("Проверьте каждое утверждение")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
  });

  it("shows all catalog tasks and filters to an empty state", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: "Каталог задач" }));
    expect(await screen.findByText("Прогноз загрузки городских маршрутов")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Тема"), "HR");
    await user.selectOptions(screen.getByLabelText("Готовность"), "priority");
    expect(await screen.findByText("Ничего не найдено")).toBeInTheDocument();
  });

  it("completes publish, proposal and human decision flow", async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(screen.getByRole("button", { name: /найти пробелы/i }));
    const answers = await screen.findAllByPlaceholderText("Ваш ответ");
    await user.type(answers[0]!, "Операторы поддержки");
    await user.type(answers[1]!, "История обращений за год");
    await user.type(answers[2]!, "Сократить время обработки на 30 процентов");
    await user.click(screen.getByRole("button", { name: /собрать карточку/i }));

    await user.click(screen.getByRole("button", { name: /сохранить и обновить рейтинг/i }));
    expect(await screen.findByText("88")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /подтвердить и опубликовать/i }));

    const title = await screen.findByRole("heading", { name: "Помощник для разбора обращений клиентов" });
    const tile = title.closest("div.rounded-3xl") as HTMLElement;
    await user.click(within(tile).getByRole("button", { name: /предложить решение/i }));
    await user.click(screen.getByRole("button", { name: /отправить отклик/i }));
    expect(await screen.findByText("Решение остаётся за человеком")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Принять" }));
    expect(await screen.findByText("Предложение принято")).toBeInTheDocument();
  });
});
