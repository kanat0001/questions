export type LearnStatus = "unlearned" | "learning" | "learned";

export type QuestionItem = {
  id: string;
  topicId: string;
  topicTitle: string;
  question: string;
  answer: string;
  tags?: string[];
};

export type ProgressMap = Record<string, LearnStatus>;

export type Topic = {
  id: string;
  title: string;
  total: number;
  learned: number;
  learning: number;
  unlearned: number;
  percentLearned: number; // 0..100
};
