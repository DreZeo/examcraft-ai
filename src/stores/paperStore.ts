import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  ExamPaperSchema,
  type ExamPaper,
  type Question,
  type QuestionType,
} from "../lib/types/exam";
import {
  appendQuestions,
  removeQuestion,
  moveQuestion,
  updateQuestion,
  replaceById,
} from "../lib/exam/merge";
import { createBlankQuestion } from "../lib/exam/blankQuestion";
import * as storage from "../lib/storage/tauri";
import { useConfigStore } from "./configStore";

function emptyPaper(): ExamPaper {
  return ExamPaperSchema.parse({ title: "", questions: [] });
}

type ViewMode = "teacher" | "student";

interface PaperState {
  paper: ExamPaper;
  view: ViewMode;
  saveStatus: "saved" | "saving" | "unsaved";
  /** Snapshot pushed before an AI-apply, enabling single-level undo. */
  undoSnapshot: ExamPaper | null;

  load: () => Promise<void>;
  newPaper: () => void;
  /** Replace the entire paper (e.g. JSON project import). Clears undo. */
  replacePaper: (paper: ExamPaper) => void;
  setTitle: (title: string) => void;
  setView: (view: ViewMode) => void;

  applyAiQuestions: (questions: Question[], mode: "append" | "replace") => void;
  undoApply: () => void;

  editQuestion: (question: Question) => void;
  /** Append a blank question (default single-choice) and return its new id. */
  addBlankQuestion: (type?: QuestionType) => string;
  deleteQuestion: (id: string) => void;
  reorder: (id: string, direction: "up" | "down") => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const usePaperStore = create<PaperState>((set, get) => {
  /** Debounced auto-save honoring the autoSave setting. */
  function scheduleSave() {
    const { config, dataDir } = useConfigStore.getState();
    if (!config.settings.autoSave || !dataDir) {
      set({ saveStatus: "unsaved" });
      return;
    }
    set({ saveStatus: "saving" });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await storage.saveWorkingPaper(dataDir, get().paper);
        set({ saveStatus: "saved" });
      } catch {
        set({ saveStatus: "unsaved" });
      }
    }, 500);
  }

  function mutate(next: ExamPaper, extra: Partial<PaperState> = {}) {
    set({ paper: next, ...extra });
    scheduleSave();
  }

  return {
    paper: emptyPaper(),
    view: "teacher",
    saveStatus: "saved",
    undoSnapshot: null,

    load: async () => {
      const { dataDir } = useConfigStore.getState();
      if (!dataDir) return;
      const loaded = await storage.loadWorkingPaper(dataDir);
      if (loaded) set({ paper: loaded, saveStatus: "saved" });
    },

    newPaper: () => mutate(emptyPaper(), { undoSnapshot: null }),

    replacePaper: (paper) => mutate(paper, { undoSnapshot: null }),

    setTitle: (title) => mutate({ ...get().paper, title }),

    setView: (view) => set({ view }),

    applyAiQuestions: (questions, mode) => {
      const current = get().paper;
      const next =
        mode === "append"
          ? appendQuestions(current, questions)
          : replaceById(current, questions);
      mutate(next, { undoSnapshot: current });
    },

    undoApply: () => {
      const snapshot = get().undoSnapshot;
      if (snapshot) mutate(snapshot, { undoSnapshot: null });
    },

    editQuestion: (question) => mutate(updateQuestion(get().paper, question)),

    addBlankQuestion: (type = "single-choice") => {
      const question = createBlankQuestion(type, uuid());
      mutate(appendQuestions(get().paper, [question]));
      return question.id;
    },

    deleteQuestion: (id) => mutate(removeQuestion(get().paper, id)),

    reorder: (id, direction) =>
      mutate(moveQuestion(get().paper, id, direction)),
  };
});
