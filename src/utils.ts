import type { LearnStatus, QuestionItem, Topic } from "./types";

export const STATUS_LABEL: Record<LearnStatus, string> = {
  unlearned: "Не выучено",
  learning: "В процессе",
  learned: "Выучено",
};

export const STATUS_ORDER: LearnStatus[] = ["unlearned", "learning", "learned"];

export function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function makeTopics(items: QuestionItem[], statusById: Record<string, LearnStatus | undefined>): Topic[] {
  const map = new Map<string, { id: string; title: string; ids: string[] }>();

  for (const q of items) {
    const key = q.topicId;
    if (!map.has(key)) map.set(key, { id: q.topicId, title: q.topicTitle, ids: [] });
    map.get(key)!.ids.push(q.id);
  }

  const topics: Topic[] = [];
  for (const [, t] of map) {
    let learned = 0;
    let learning = 0;
    let unlearned = 0;

    for (const id of t.ids) {
      const st = statusById[id] ?? "unlearned";
      if (st === "learned") learned++;
      else if (st === "learning") learning++;
      else unlearned++;
    }

    const total = t.ids.length;
    const percentLearned = total === 0 ? 0 : Math.round((learned / total) * 100);

    topics.push({
      id: t.id,
      title: t.title,
      total,
      learned,
      learning,
      unlearned,
      percentLearned,
    });
  }

  // сортировка по названию
  topics.sort((a, b) => a.title.localeCompare(b.title));
  return topics;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
