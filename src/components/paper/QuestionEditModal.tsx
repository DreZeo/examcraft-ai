import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  QuestionSchema,
  type Question,
  type QuestionType,
} from "../../lib/types/exam";
import { changeQuestionType } from "../../lib/exam/blankQuestion";
import { usePaperStore } from "../../stores/paperStore";
import { Markdown } from "./Markdown";
import { Field, TextArea, inputCls } from "./editFields";
import { TypeFields } from "./TypeFields";

interface QuestionEditModalProps {
  /** The question to edit (a copy is taken as the local draft). */
  question: Question;
  onClose: () => void;
}

const TYPE_KEYS: QuestionType[] = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "fill-in-blank",
  "short-answer",
  "essay",
  "calculation",
];

/**
 * Block-level editor for a single question. Edits a local draft; validates
 * against QuestionSchema before saving via paperStore.editQuestion. Cancel or
 * Esc discards. All mutations flow through the store's single JSON path.
 */
export function QuestionEditModal({
  question,
  onClose,
}: QuestionEditModalProps) {
  const { t } = useTranslation();
  const editQuestion = usePaperStore((s) => s.editQuestion);
  const [draft, setDraft] = useState<Question>(question);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Capture phase + stop propagation so closing the modal doesn't also
        // trigger the app-level Esc handler (which collapses the AI drawer).
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  function save() {
    const result = QuestionSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        result.error.issues.map(
          (i) => `${i.path.join(".") || "—"}: ${i.message}`,
        ),
      );
      return;
    }
    editQuestion(result.data);
    onClose();
  }

  // Every question variant supports an optional explanation, so always offer the
  // field (a blank/just-added question has no `explanation` key yet).
  const explanation = draft.explanation ?? "";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("paper.editTitle")}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-800">
            {t("paper.editTitle")}
          </h2>
          <button
            type="button"
            aria-label={t("settings.cancel")}
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Field label={t("paper.typeLabel")}>
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft(
                        changeQuestionType(
                          draft,
                          e.currentTarget.value as QuestionType,
                        ),
                      )
                    }
                    className={inputCls}
                  >
                    {TYPE_KEYS.map((tp) => (
                      <option key={tp} value={tp}>
                        {t(`questionType.${tp}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="w-28 shrink-0">
                  <Field label={t("paper.scoreLabel")}>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={draft.score}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          score: Number(e.currentTarget.value),
                        })
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              <Field label={t("paper.contentLabel")}>
                <TextArea
                  value={draft.content}
                  rows={5}
                  placeholder={t("paper.contentPlaceholder")}
                  onChange={(content) => setDraft({ ...draft, content })}
                />
              </Field>

              <TypeFields draft={draft} onChange={setDraft} />

              <Field label={t("paper.explanation")}>
                <TextArea
                  value={explanation}
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      explanation: v || undefined,
                    } as Question)
                  }
                />
              </Field>
            </div>

            <div className="space-y-1">
              <span className="block text-sm font-medium text-slate-700">
                {t("paper.preview")}
              </span>
              <div className="min-h-[8rem] rounded-md border border-slate-200 bg-slate-50/60 p-3">
                <Markdown>{draft.content || "_" + t("paper.emptyPreview") + "_"}</Markdown>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <ul className="mt-4 space-y-1 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 text-sm">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("settings.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
          >
            {t("settings.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
