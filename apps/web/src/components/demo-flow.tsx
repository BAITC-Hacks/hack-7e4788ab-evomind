"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  proposalInputSchema,
  taskEditorSchema,
  type ClarificationResult,
  type Proposal,
  type ProposalInput,
  type ReadinessLevel,
  type TaskCard,
  type TaskEditorValues,
} from "@evomind/contracts";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  Lightbulb,
  Loader2,
  RefreshCw,
  Rocket,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type Screen = "brief" | "questions" | "editor" | "catalog" | "proposal" | "decisions";

const briefSchema = z.object({ description: z.string().min(12, "Добавьте хотя бы одно-два предложения") });
type BriefValues = z.infer<typeof briefSchema>;

const steps = [
  ["brief", "Описание"],
  ["questions", "Уточнения"],
  ["editor", "Карточка"],
  ["catalog", "Каталог"],
  ["proposal", "Отклик"],
  ["decisions", "Решение"],
] as const;

const readinessLabels: Record<ReadinessLevel, string> = {
  draft: "Черновик",
  workable: "Можно обсуждать",
  ready: "Готова к работе",
  priority: "Приоритетная",
};

const fieldLabels: Record<keyof TaskEditorValues, string> = {
  title: "Название задачи",
  context: "Контекст",
  need: "Потребность",
  users: "Пользователи",
  data: "Доступные данные",
  constraints: "Ограничения",
  expectedResult: "Ожидаемый результат",
  successCriteria: "Критерии успеха",
  contact: "Контакт",
  interactionFormat: "Формат взаимодействия",
  topic: "Тема",
};

const longFields = new Set<keyof TaskEditorValues>(["context", "need", "data", "constraints", "expectedResult", "successCriteria"]);

export function DemoFlow() {
  const queryClient = useQueryClient();
  const [screen, setScreen] = useState<Screen>("brief");
  const [clarification, setClarification] = useState<ClarificationResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [task, setTask] = useState<TaskCard | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskCard | null>(null);

  const analyze = useMutation({
    mutationFn: (description: string) => api.analyze(description),
    onSuccess: (result) => {
      setClarification(result);
      setScreen("questions");
    },
  });

  const save = useMutation({
    mutationFn: (values: TaskEditorValues) => api.saveTask(values, task?.id || undefined),
    onSuccess: (saved) => {
      if (task?.id) setPreviousScore(task.score);
      setTask(saved);
    },
  });

  const publish = useMutation({
    mutationFn: api.publishTask,
    onSuccess: async (published) => {
      setTask(published);
      setSelectedTask(published);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setScreen("catalog");
    },
  });

  const goToEditor = () => {
    if (!clarification) return;
    const suggestion = { ...clarification.suggestedCard } as Partial<TaskEditorValues>;
    for (const question of clarification.questions) {
      if (answers[question.id]?.trim()) suggestion[question.field] = answers[question.id]!.trim();
    }
    setTask(createTransientDraft(suggestion));
    setScreen("editor");
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-ink/10 bg-cream/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-10">
          <button className="flex items-center gap-3" onClick={() => setScreen("brief")} aria-label="На главную">
            <span className="grid size-10 place-items-center rounded-2xl bg-ink text-lime"><Sparkles size={19} /></span>
            <span className="text-xl font-black tracking-tight">EvoMind</span>
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-semibold text-ink/60 md:flex">
            <span className="size-2 rounded-full bg-green-500" /> API-режим · данные сервера
          </div>
          <Button variant="outline" size="sm" onClick={() => setScreen("catalog")}>Каталог задач</Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-10 md:py-10">
        <ProgressNav screen={screen} onNavigate={setScreen} />
        {screen === "brief" && <BriefScreen mutation={analyze} />}
        {screen === "questions" && clarification && (
          <QuestionsScreen result={clarification} answers={answers} setAnswers={setAnswers} onBack={() => setScreen("brief")} onContinue={goToEditor} />
        )}
        {screen === "editor" && task && (
          <EditorScreen task={task} previousScore={previousScore} save={save} publish={publish} onBack={() => setScreen("questions")} />
        )}
        {screen === "catalog" && (
          <CatalogScreen onRespond={(card) => { setSelectedTask(card); setScreen("proposal"); }} />
        )}
        {screen === "proposal" && selectedTask && (
          <ProposalScreen task={selectedTask} onBack={() => setScreen("catalog")} onSubmitted={() => setScreen("decisions")} />
        )}
        {screen === "decisions" && selectedTask && (
          <DecisionsScreen task={selectedTask} onBack={() => setScreen("catalog")} />
        )}
      </div>
    </main>
  );
}

function ProgressNav({ screen, onNavigate }: { screen: Screen; onNavigate: (screen: Screen) => void }) {
  const current = steps.findIndex(([id]) => id === screen);
  return (
    <nav aria-label="Этапы" className="mb-8 overflow-x-auto pb-2">
      <ol className="flex min-w-[680px] items-center">
        {steps.map(([id, label], index) => (
          <li key={id} className="flex flex-1 items-center last:flex-none">
            <button onClick={() => index <= current && onNavigate(id)} disabled={index > current} className={cn("flex items-center gap-2 text-xs font-bold", index <= current ? "text-ink" : "text-ink/30")}>
              <span className={cn("grid size-7 place-items-center rounded-full border", index < current ? "border-ink bg-ink text-white" : index === current ? "border-ink bg-lime" : "border-ink/15 bg-white")}>
                {index < current ? <Check size={14} /> : index + 1}
              </span>
              {label}
            </button>
            {index < steps.length - 1 && <span className={cn("mx-3 h-px flex-1", index < current ? "bg-ink" : "bg-ink/10")} />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function BriefScreen({ mutation }: { mutation: ReturnType<typeof useMutation<ClarificationResult, Error, string>> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<BriefValues>({ resolver: zodResolver(briefSchema), defaultValues: { description: "Хотим быстрее разбирать обращения клиентов и понимать, что важнее." } });
  return (
    <section className="grid items-center gap-10 py-6 lg:grid-cols-[1.08fr_.92fr] lg:py-14">
      <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-xs font-bold uppercase tracking-widest"><Sparkles size={15} /> От идеи к задаче</div>
        <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.055em] md:text-7xl">Сформулируйте задачу, за которую хочется взяться.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/65">EvoMind найдёт пробелы, задаст точные вопросы и соберёт прозрачную карточку для студенческих команд.</p>
        <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-ink/65">
          <span className="flex items-center gap-2"><CheckCircle2 className="text-green-600" size={18} /> Никаких выдуманных фактов</span>
          <span className="flex items-center gap-2"><BarChart3 className="text-coral" size={18} /> Объяснимый рейтинг</span>
        </div>
      </div>
      <Card className="relative overflow-hidden">
        <div className="absolute right-0 top-0 size-32 translate-x-10 -translate-y-10 rounded-full bg-lime/70 blur-2xl" />
        <CardContent className="relative">
          <p className="text-xs font-black uppercase tracking-[.2em] text-ink/45">Шаг 1 · сырой бриф</p>
          <h2 className="mt-2 text-2xl font-black">Что вы хотите улучшить?</h2>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit((value) => mutation.mutate(value.description))}>
            <Textarea aria-label="Описание задачи" rows={7} {...register("description")} />
            {errors.description && <FieldError>{errors.description.message}</FieldError>}
            {mutation.isError && (
              <div role="alert" className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-800"><CircleAlert className="mt-0.5 shrink-0" size={18} /><span>{mutation.error.message}. Измените текст или попробуйте ещё раз.</span></div>
            )}
            <Button className="w-full" variant="accent" size="lg" disabled={mutation.isPending}>
              {mutation.isPending ? <><Loader2 className="animate-spin" size={18} /> Анализируем описание…</> : <>Найти пробелы <ArrowRight size={18} /></>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

function QuestionsScreen({ result, answers, setAnswers, onBack, onContinue }: { result: ClarificationResult; answers: Record<string, string>; setAnswers: (answers: Record<string, string>) => void; onBack: () => void; onContinue: () => void }) {
  const complete = result.questions.every((question) => Boolean(answers[question.id]?.trim()));
  return (
    <section className="mx-auto max-w-4xl py-4">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-ink/45">Шаг 2 · уточнения</p><h1 className="mt-2 text-4xl font-black tracking-tight">Три ответа — и задача станет конкретнее</h1></div>
        <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900">Fallback-режим · результат нужно проверить</span>
      </div>
      {result.warnings.map((warning) => <p key={warning} className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>)}
      <div className="mt-7 space-y-4">
        {result.questions.map((question, index) => (
          <Card key={question.id} className="shadow-none"><CardContent className="grid gap-4 md:grid-cols-[48px_1fr]">
            <span className="grid size-11 place-items-center rounded-2xl bg-mint font-black">{index + 1}</span>
            <div><Label htmlFor={question.id} className="text-base">{question.text}</Label><p className="mt-1 text-sm text-ink/45">{question.hint}</p><Input id={question.id} className="mt-3" value={answers[question.id] ?? ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} placeholder="Ваш ответ" /></div>
          </CardContent></Card>
        ))}
      </div>
      {!complete && <p className="mt-4 text-sm font-medium text-coral">Ответьте на все вопросы, чтобы продолжить.</p>}
      <div className="mt-7 flex justify-between"><Button variant="ghost" onClick={onBack}><ArrowLeft size={17} /> Назад</Button><Button variant="accent" disabled={!complete} onClick={onContinue}>Собрать карточку <ArrowRight size={17} /></Button></div>
    </section>
  );
}

function EditorScreen({ task, previousScore, save, publish, onBack }: { task: TaskCard; previousScore: number | null; save: ReturnType<typeof useMutation<TaskCard, Error, TaskEditorValues>>; publish: ReturnType<typeof useMutation<TaskCard, Error, TaskCard>>; onBack: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<TaskEditorValues>({ resolver: zodResolver(taskEditorSchema), defaultValues: pickEditorValues(task) });
  const displayed = save.data ?? task;
  const submit = (values: TaskEditorValues) => save.mutate(values, { onSuccess: (result) => reset(pickEditorValues(result)) });
  return (
    <section className="py-2">
      <div className="mb-7"><p className="text-xs font-black uppercase tracking-[.2em] text-ink/45">Шаг 3 · редактор</p><h1 className="mt-2 text-4xl font-black tracking-tight">Проверьте каждое утверждение</h1><p className="mt-2 text-ink/55">Рейтинг приходит готовым с сервера и меняется только после сохранения подтверждённых данных.</p></div>
      <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <Card><CardContent><form id="editor-form" className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit(submit)}>
          {(Object.keys(fieldLabels) as (keyof TaskEditorValues)[]).map((name) => (
            <div key={name} className={cn(longFields.has(name) && "md:col-span-2")}><Label htmlFor={name}>{fieldLabels[name]}</Label>
              {longFields.has(name) ? <Textarea id={name} className="mt-2 min-h-24" {...register(name)} /> : <Input id={name} className="mt-2" {...register(name)} />}
              {errors[name] && <FieldError>{errors[name]?.message}</FieldError>}
            </div>
          ))}
        </form></CardContent></Card>
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {save.data ? <ScoreCard task={displayed} previousScore={previousScore} /> : <Card className="shadow-none"><CardContent><BarChart3 className="text-coral" /><h2 className="mt-4 text-xl font-black">Рейтинг рассчитает сервер</h2><p className="mt-2 text-sm leading-6 text-ink/55">Сохраните подтверждённые данные — мы покажем полученный score, breakdown и рекомендации.</p></CardContent></Card>}
          {save.isError && <ErrorBox message={save.error.message} />}
          {publish.isError && <ErrorBox message={publish.error.message} />}
          <Button form="editor-form" className="w-full" disabled={save.isPending}>{save.isPending ? <><Loader2 className="animate-spin" size={17} /> Сохраняем…</> : <><RefreshCw size={17} /> Сохранить и обновить рейтинг</>}</Button>
          <Button variant="accent" className="w-full" disabled={!save.data || isDirty || publish.isPending} onClick={() => publish.mutate(displayed)}>
            {publish.isPending ? <><Loader2 className="animate-spin" size={17} /> Публикуем…</> : <><Rocket size={17} /> Подтвердить и опубликовать</>}
          </Button>
          {!save.data && <p className="text-center text-xs text-ink/45">Сначала сохраните карточку и проверьте новый рейтинг</p>}
          <Button variant="ghost" className="w-full" onClick={onBack}><ArrowLeft size={16} /> К вопросам</Button>
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ task, previousScore }: { task: TaskCard; previousScore: number | null }) {
  const breakdownLabels: Record<keyof TaskCard["scoreBreakdown"], string> = { contextAndNeed: "Контекст и потребность", data: "Данные", expectedResult: "Результат", successCriteria: "Критерии", constraints: "Ограничения", users: "Пользователи", businessContact: "Связь с бизнесом" };
  const max: Record<keyof TaskCard["scoreBreakdown"], number> = { contextAndNeed: 20, data: 20, expectedResult: 15, successCriteria: 15, constraints: 10, users: 10, businessContact: 10 };
  return (
    <Card className="overflow-hidden"><div className="bg-ink p-6 text-white"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-white/50">Рейтинг готовности</p><p className="mt-2 text-6xl font-black">{task.score}<span className="text-xl text-white/35">/100</span></p></div><span className="rounded-full bg-lime px-3 py-2 text-xs font-black text-ink">{readinessLabels[task.readinessLevel]}</span></div></div>
      <CardContent className="space-y-3 p-6">{previousScore !== null && <p className="rounded-xl bg-mint px-3 py-2 text-xs font-bold">Предыдущий рейтинг сервера: {previousScore}</p>}{Object.entries(task.scoreBreakdown).map(([key, value]) => <div key={key}><div className="mb-1 flex justify-between text-xs font-semibold"><span>{breakdownLabels[key as keyof typeof breakdownLabels]}</span><span>{value}/{max[key as keyof typeof max]}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-coral" style={{ width: `${(value / max[key as keyof typeof max]) * 100}%` }} /></div></div>)}
        {task.missingFields.length > 0 && <div className="mt-4 rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-amber-900">Что улучшить</p><ul className="mt-2 space-y-1 text-xs text-amber-900">{task.missingFields.map((field) => <li key={field}>• {field}</li>)}</ul></div>}
      </CardContent>
    </Card>
  );
}

function CatalogScreen({ onRespond }: { onRespond: (task: TaskCard) => void }) {
  const [topic, setTopic] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [sort, setSort] = useState("score_desc");
  const query = {
    topic: topic === "all" ? undefined : topic,
    readiness: readiness === "all" ? undefined : readiness as ReadinessLevel,
    sort: sort as "score_asc" | "score_desc",
  };
  const tasks = useQuery({ queryKey: ["tasks", query], queryFn: () => api.listTasks(query) });
  const visible = tasks.data ?? [];
  const topics = ["Клиентский сервис", "Транспорт", "Энергетика", "Ритейл", "HR", "Агротех"];
  return (
    <section><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-ink/45">Шаг 4 · каталог</p><h1 className="mt-2 text-4xl font-black tracking-tight">Задачи, которым нужны команды</h1><p className="mt-2 text-ink/55">Низкий рейтинг не скрывает задачу — он показывает, что стоит уточнить.</p></div><div className="flex items-center gap-2 text-sm font-bold"><Users size={17} /> {visible.length} задач</div></div>
      <div className="mt-7 grid gap-3 rounded-3xl border border-ink/10 bg-white p-4 md:grid-cols-3"><SelectControl label="Тема" icon={<Filter size={15} />} value={topic} onChange={setTopic} options={topics.map((item) => [item, item] as const)} /><SelectControl label="Готовность" value={readiness} onChange={setReadiness} options={Object.entries(readinessLabels)} /><SelectControl label="Сортировка" includeAll={false} value={sort} onChange={setSort} options={[["score_desc", "Сначала высокий рейтинг"], ["score_asc", "Сначала низкий рейтинг"]]} /></div>
      {tasks.isPending ? <LoadingCards /> : tasks.isError ? <div className="mt-7"><ErrorBox message="Не удалось загрузить каталог" /><Button className="mt-4" onClick={() => tasks.refetch()}>Повторить</Button></div> : visible.length === 0 ? <EmptyState onReset={() => { setTopic("all"); setReadiness("all"); }} /> : <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{visible.map((card) => <TaskTile key={card.id} task={card} onRespond={() => onRespond(card)} />)}</div>}
    </section>
  );
}

function TaskTile({ task, onRespond }: { task: TaskCard; onRespond: () => void }) {
  return <Card className="flex flex-col shadow-none transition hover:-translate-y-1 hover:shadow-soft"><CardContent className="flex h-full flex-col"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold">{task.topic}</span><span className="text-3xl font-black">{task.score}</span></div><h2 className="mt-5 text-xl font-black leading-tight">{task.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/55">{task.need}</p><div className="mt-5 flex items-center gap-2 text-xs font-semibold text-ink/50"><span className="size-2 rounded-full bg-coral" /> {readinessLabels[task.readinessLevel]}</div><Button className="mt-6 w-full" variant="outline" onClick={onRespond}>Предложить решение <ChevronRight size={16} /></Button></CardContent></Card>;
}

function ProposalScreen({ task, onBack, onSubmitted }: { task: TaskCard; onBack: () => void; onSubmitted: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ProposalInput>({ resolver: zodResolver(proposalInputSchema), defaultValues: { teamId: "Команда Orbit", solutionIdea: "Классификатор с подтверждением оператора и объяснением уверенности.", plan: "Аудит данных, baseline, интерфейс проверки, пилот и оценка метрик.", timeline: "4 недели", prototypeUrl: "https://example.com/prototype" } });
  const create = useMutation({ mutationFn: (values: ProposalInput) => api.createProposal(task.id, values), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["proposals", task.id] }); onSubmitted(); } });
  return <section className="mx-auto max-w-5xl"><Button variant="ghost" onClick={onBack}><ArrowLeft size={16} /> К каталогу</Button><div className="mt-4 grid gap-7 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-black uppercase tracking-[.2em] text-ink/45">Шаг 5 · отклик</p><h1 className="mt-2 text-3xl font-black">{task.title}</h1><p className="mt-4 leading-7 text-ink/60">{task.need}</p><div className="mt-5 rounded-3xl bg-ink p-6 text-white"><p className="text-sm font-bold text-white/50">Рейтинг задачи</p><p className="mt-1 text-5xl font-black">{task.score}</p><p className="mt-2 text-sm text-lime">{readinessLabels[task.readinessLevel]}</p></div></div><Card><CardContent><h2 className="text-2xl font-black">Расскажите, как решите задачу</h2><form className="mt-6 space-y-4" onSubmit={handleSubmit((values) => create.mutate(values))}><FormField label="Команда" error={errors.teamId?.message}><Input {...register("teamId")} /></FormField><FormField label="Идея решения" error={errors.solutionIdea?.message}><Textarea {...register("solutionIdea")} /></FormField><FormField label="План" error={errors.plan?.message}><Textarea {...register("plan")} /></FormField><div className="grid gap-4 md:grid-cols-2"><FormField label="Срок" error={errors.timeline?.message}><Input {...register("timeline")} /></FormField><FormField label="Прототип (необязательно)" error={errors.prototypeUrl?.message}><Input {...register("prototypeUrl")} /></FormField></div>{create.isError && <ErrorBox message={create.error.message} />}<Button className="w-full" variant="accent" disabled={create.isPending}>{create.isPending ? <><Loader2 className="animate-spin" size={17} /> Отправляем…</> : <><Send size={17} /> Отправить отклик</>}</Button></form></CardContent></Card></div></section>;
}

function DecisionsScreen({ task, onBack }: { task: TaskCard; onBack: () => void }) {
  const queryClient = useQueryClient();
  const proposals = useQuery({ queryKey: ["proposals", task.id], queryFn: () => api.listProposals(task.id) });
  const decide = useMutation({ mutationFn: ({ id, status }: { id: string; status: "accepted" | "rejected" }) => api.setProposalStatus(id, status), onSuccess: (updated) => queryClient.setQueryData<Proposal[]>(["proposals", task.id], (old = []) => old.map((item) => item.id === updated.id ? updated : item)) });
  return <section className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-ink/45">Шаг 6 · решение бизнеса</p><h1 className="mt-2 text-4xl font-black">Решение остаётся за человеком</h1><p className="mt-2 text-ink/55">EvoMind не назначает команду автоматически. Можно принять несколько предложений.</p></div><Button variant="outline" onClick={onBack}>Вернуться в каталог</Button></div>{proposals.isPending ? <LoadingCards /> : proposals.isError ? <div className="mt-7"><ErrorBox message="Не удалось загрузить отклики" /><Button className="mt-4" onClick={() => proposals.refetch()}>Повторить</Button></div> : proposals.data?.length === 0 ? <EmptyState /> : <div className="mt-7 space-y-5">{decide.isError && <ErrorBox message={decide.error.message} />}{proposals.data?.map((proposal) => <Card key={proposal.id} className="shadow-none"><CardContent><div className="flex flex-col justify-between gap-5 md:flex-row"><div className="max-w-2xl"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-mint"><Users size={19} /></span><div><h2 className="font-black">{proposal.teamId}</h2><p className="text-xs text-ink/45">Отклик на «{task.title}»</p></div></div><p className="mt-5 font-semibold">{proposal.solutionIdea}</p><p className="mt-3 text-sm leading-6 text-ink/55">{proposal.plan}</p><div className="mt-4 flex gap-5 text-xs font-bold text-ink/50"><span className="flex items-center gap-1"><Clock3 size={14} /> {proposal.timeline}</span>{proposal.prototypeUrl && <a className="underline" href={proposal.prototypeUrl}>Прототип</a>}</div></div><div className="min-w-48">{proposal.status === "pending" ? <div className="space-y-2"><Button className="w-full" variant="accent" disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, status: "accepted" })}>Принять</Button><Button className="w-full" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: proposal.id, status: "rejected" })}>Отклонить</Button></div> : <div role="status" className={cn("rounded-2xl p-4 text-center text-sm font-black", proposal.status === "accepted" ? "bg-green-100 text-green-800" : "bg-red-50 text-red-700")}>{proposal.status === "accepted" ? "Предложение принято" : "Предложение отклонено"}</div>}</div></div></CardContent></Card>)}</div>}</section>;
}

function SelectControl({ label, icon, value, onChange, options, includeAll = true }: { label: string; icon?: React.ReactNode; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[]; includeAll?: boolean }) {
  return <label className="flex items-center gap-3 rounded-2xl bg-cream px-4 py-2"><span className="text-ink/40">{icon}</span><span className="sr-only">{label}</span><select aria-label={label} className="w-full bg-transparent py-2 text-sm font-bold outline-none" value={value} onChange={(event) => onChange(event.target.value)}>{includeAll && <option value="all">Все · {label.toLowerCase()}</option>}{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div><Label>{label}</Label><div className="mt-2">{children}</div>{error && <FieldError>{error}</FieldError>}</div>; }
function FieldError({ children }: { children?: React.ReactNode }) { return <p role="alert" className="mt-1 text-xs font-semibold text-red-700">{children}</p>; }
function ErrorBox({ message }: { message: string }) { return <div role="alert" className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800"><CircleAlert size={17} /> {message}</div>; }
function LoadingCards() { return <div aria-label="Загрузка" className="mt-7 grid gap-5 md:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-3xl bg-white/70" />)}</div>; }
function EmptyState({ onReset }: { onReset?: () => void }) { return <div className="mt-8 rounded-3xl border border-dashed border-ink/20 bg-white/50 p-12 text-center"><Search className="mx-auto text-ink/30" /><h2 className="mt-4 text-xl font-black">Ничего не найдено</h2><p className="mt-2 text-sm text-ink/50">Измените фильтры или вернитесь позже.</p>{onReset && <Button className="mt-5" variant="outline" onClick={onReset}>Сбросить фильтры</Button>}</div>; }

function pickEditorValues(task: TaskCard): TaskEditorValues {
  const { title, context, need, users, data, constraints, expectedResult, successCriteria, contact, interactionFormat, topic } = task;
  return { title, context, need, users, data, constraints, expectedResult, successCriteria, contact, interactionFormat, topic };
}

function createTransientDraft(values: Partial<TaskEditorValues>): TaskCard {
  return {
    id: "",
    status: "draft",
    title: values.title ?? "",
    context: values.context ?? "",
    need: values.need ?? "",
    users: values.users ?? "",
    data: values.data ?? "",
    constraints: values.constraints ?? "",
    expectedResult: values.expectedResult ?? "",
    successCriteria: values.successCriteria ?? "",
    contact: values.contact ?? "",
    interactionFormat: values.interactionFormat ?? "",
    topic: values.topic ?? "",
    score: 0,
    readinessLevel: "draft",
    scoreBreakdown: { contextAndNeed: 0, data: 0, expectedResult: 0, successCriteria: 0, constraints: 0, users: 0, businessContact: 0 },
    missingFields: [],
  };
}
