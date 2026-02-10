import { useEffect, useMemo, useState } from "react";
import questionsRaw from "./data/questions.json";
import type { LearnStatus, ProgressMap, QuestionItem } from "./types";
import { loadProgress, resetProgress, setStatus } from "./storage";
import { makeTopics, normalize, shuffle, STATUS_LABEL } from "./utils";

type Mode = "list" | "train";

const ALL_TOPICS_ID = "__all__";

function getStatus(progress: ProgressMap, id: string): LearnStatus {
  return progress[id] ?? "unlearned";
}

function statusBadge(status: LearnStatus) {
  return <span className="badge">{STATUS_LABEL[status]}</span>;
}

export default function App() {
  const questions = questionsRaw as QuestionItem[];

  const [progress, setProgress] = useState<ProgressMap>({});
  const [selectedTopicId, setSelectedTopicId] = useState<string>(ALL_TOPICS_ID);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LearnStatus | "all">("all");

  const [mode, setMode] = useState<Mode>("list");

  // list mode: раскрытые ответы
  const [openAnswer, setOpenAnswer] = useState<Record<string, boolean>>({});

  // training mode state
  const [trainOrder, setTrainOrder] = useState<string[]>([]);
  const [trainIndex, setTrainIndex] = useState(0);
  const [trainShowAnswer, setTrainShowAnswer] = useState(false);
  const [trainShuffle, setTrainShuffle] = useState(true);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const topics = useMemo(() => makeTopics(questions, progress), [questions, progress]);

  const overall = useMemo(() => {
    const total = questions.length;
    let learned = 0;
    for (const q of questions) if (getStatus(progress, q.id) === "learned") learned++;
    const percent = total === 0 ? 0 : Math.round((learned / total) * 100);
    return { total, learned, percent };
  }, [questions, progress]);

  const selectedTopicTitle = useMemo(() => {
    if (selectedTopicId === ALL_TOPICS_ID) return "Все темы";
    const t = topics.find((x) => x.id === selectedTopicId);
    return t?.title ?? "Тема";
  }, [selectedTopicId, topics]);

  const filteredQuestions = useMemo(() => {
    const q = normalize(search);

    return questions.filter((item) => {
      if (selectedTopicId !== ALL_TOPICS_ID && item.topicId !== selectedTopicId) return false;

      if (q) {
        const inQuestion = normalize(item.question).includes(q);
        const inTags = (item.tags ?? []).some((t) => normalize(t).includes(q));
        if (!inQuestion && !inTags) return false;
      }

      const st = getStatus(progress, item.id);
      if (statusFilter !== "all" && st !== statusFilter) return false;

      return true;
    });
  }, [questions, selectedTopicId, search, statusFilter, progress]);

  const startTraining = () => {
    const ids = filteredQuestions.map((x) => x.id);
    const order = trainShuffle ? shuffle(ids) : ids;
    setTrainOrder(order);
    setTrainIndex(0);
    setTrainShowAnswer(false);
    setMode("train");
  };

  const currentTrainItem = useMemo(() => {
    if (mode !== "train") return null;
    const id = trainOrder[trainIndex];
    return questions.find((q) => q.id === id) ?? null;
  }, [mode, trainOrder, trainIndex, questions]);

  const setQuestionStatus = (id: string, status: LearnStatus) => {
    setProgress((prev) => setStatus(prev, id, status));
  };

  const onReset = () => {
    const ok = confirm("Сбросить прогресс? Это удалит статусы из localStorage.");
    if (!ok) return;
    setProgress(resetProgress());
    setOpenAnswer({});
    setMode("list");
  };

  const renderList = () => {
    if (filteredQuestions.length === 0) {
      return (
        <div className="card">
          <div className="muted">Ничего не найдено по текущим фильтрам.</div>
        </div>
      );
    }

    return filteredQuestions.map((q) => {
      const st = getStatus(progress, q.id);
      const isOpen = !!openAnswer[q.id];

      return (
        <div className="card" key={q.id}>
          <div className="cardTop">
            <div>
              <p className="qTitle">{q.question}</p>
              <div className="muted small">
                {q.topicTitle} • {statusBadge(st)}
                {q.tags?.length ? <> • tags: {q.tags.join(", ")}</> : null}
              </div>
            </div>

            <button
              className="button"
              onClick={() => setOpenAnswer((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
            >
              {isOpen ? "Скрыть ответ" : "Показать ответ"}
            </button>
          </div>

          {isOpen && <div className="answer">{q.answer}</div>}

          <div className="actions">
            <button className="button" onClick={() => setQuestionStatus(q.id, "unlearned")}>
              Не выучено
            </button>
            <button className="button" onClick={() => setQuestionStatus(q.id, "learning")}>
              В процессе
            </button>
            <button className="button" onClick={() => setQuestionStatus(q.id, "learned")}>
              Выучено
            </button>
          </div>
        </div>
      );
    });
  };

  const renderTraining = () => {
    if (!currentTrainItem) {
      return (
        <div className="card">
          <p className="qTitle">Тренировка завершена 🎉</p>
          <div className="actions">
            <button className="button" onClick={() => setMode("list")}>
              Назад к списку
            </button>
            <button className="button primary" onClick={startTraining} disabled={filteredQuestions.length === 0}>
              Начать заново
            </button>
          </div>
        </div>
      );
    }

    const st = getStatus(progress, currentTrainItem.id);
    const total = trainOrder.length;
    const idxHuman = trainIndex + 1;

    const next = () => {
      setTrainShowAnswer(false);
      setTrainIndex((i) => {
        const ni = i + 1;
        return ni >= trainOrder.length ? i : ni;
      });
    };

    const prev = () => {
      setTrainShowAnswer(false);
      setTrainIndex((i) => Math.max(0, i - 1));
    };

    const markAndNext = (status: LearnStatus) => {
      setQuestionStatus(currentTrainItem.id, status);
      if (trainIndex < trainOrder.length - 1) {
        setTrainIndex((i) => i + 1);
        setTrainShowAnswer(false);
      }
    };

    return (
      <div className="card">
        <div className="cardTop">
          <div>
            <p className="qTitle">{currentTrainItem.question}</p>
            <div className="muted small">
              {currentTrainItem.topicTitle} • {statusBadge(st)} • {idxHuman}/{total}
            </div>
          </div>

          <button className="button" onClick={() => setTrainShowAnswer((s) => !s)}>
            {trainShowAnswer ? "Скрыть ответ" : "Показать ответ"}
          </button>
        </div>

        {trainShowAnswer && <div className="answer">{currentTrainItem.answer}</div>}

        <div className="actions">
          <button className="button" onClick={prev} disabled={trainIndex === 0}>
            Назад
          </button>
          <button className="button" onClick={next} disabled={trainIndex >= trainOrder.length - 1}>
            Дальше
          </button>

          <span className="badge">Отметить:</span>
          <button className="button" onClick={() => markAndNext("unlearned")}>
            Не выучено
          </button>
          <button className="button" onClick={() => markAndNext("learning")}>
            В процессе
          </button>
          <button className="button" onClick={() => markAndNext("learned")}>
            Выучено
          </button>

          <button className="button" onClick={() => setMode("list")}>
            Выйти из тренировки
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h1 className="h1">QA Trainer</h1>

        <div className="card">
          <div className="topicRow">
            <div>
              <div className="muted small">Всего</div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>
                {overall.learned}/{overall.total}
              </div>
            </div>
            <span className="badge">{overall.percent}%</span>
          </div>
          <div className="progressLine">
            <div className="progressFill" style={{ width: `${overall.percent}%` }} />
          </div>
        </div>

        <div
          className={`topicItem ${selectedTopicId === ALL_TOPICS_ID ? "active" : ""}`}
          onClick={() => setSelectedTopicId(ALL_TOPICS_ID)}
          role="button"
          tabIndex={0}
        >
          <div className="topicRow">
            <div style={{ fontWeight: 800 }}>Все темы</div>
            <span className="badge">{overall.percent}%</span>
          </div>
          <div className="muted small">{questions.length} вопросов</div>
        </div>

        {topics.map((t) => (
          <div
            key={t.id}
            className={`topicItem ${selectedTopicId === t.id ? "active" : ""}`}
            onClick={() => setSelectedTopicId(t.id)}
            role="button"
            tabIndex={0}
          >
            <div className="topicRow">
              <div style={{ fontWeight: 800 }}>{t.title}</div>
              <span className="badge">{t.percentLearned}%</span>
            </div>
            <div className="muted small">
              {t.learned}/{t.total} выучено • {t.learning} в процессе
            </div>
            <div className="progressLine">
              <div className="progressFill" style={{ width: `${t.percentLearned}%` }} />
            </div>
          </div>
        ))}
      </aside>

      {/* Main */}
      <section className="main">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Поиск по вопросам (или тегам)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LearnStatus | "all")}
          >
            <option value="all">Все статусы</option>
            <option value="unlearned">Не выучено</option>
            <option value="learning">В процессе</option>
            <option value="learned">Выучено</option>
          </select>

          <label className="badge" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={trainShuffle}
              onChange={(e) => setTrainShuffle(e.target.checked)}
            />
            Рандом
          </label>

          <button className="button primary" onClick={startTraining} disabled={filteredQuestions.length === 0}>
            Тренировка
          </button>

          <button className="button danger" onClick={onReset}>
            Сброс прогресса
          </button>

          <span className="badge">
            {selectedTopicTitle} • {filteredQuestions.length} шт.
          </span>
          <span className="badge">{mode === "train" ? "Режим: тренировка" : "Режим: список"}</span>
        </div>

        <div className="content">{mode === "train" ? renderTraining() : renderList()}</div>
      </section>
    </div>
  );
}
