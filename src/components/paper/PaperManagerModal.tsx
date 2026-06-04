import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Copy,
  FileText,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { usePaperStore } from "../../stores/paperStore";
import { iconBtn, inputCls, primaryBtn, secondaryBtn } from "../../lib/ui/styles";

interface PaperManagerModalProps {
  onClose: () => void;
}

/** Paper library manager with settings-modal-like structure and paper actions. */
export function PaperManagerModal({ onClose }: PaperManagerModalProps) {
  const { t } = useTranslation();
  const papers = usePaperStore((s) => s.papers);
  const activePaperId = usePaperStore((s) => s.activePaperId);
  const newPaper = usePaperStore((s) => s.newPaper);
  const openPaper = usePaperStore((s) => s.openPaper);
  const renamePaper = usePaperStore((s) => s.renamePaper);
  const duplicatePaper = usePaperStore((s) => s.duplicatePaper);
  const deletePaper = usePaperStore((s) => s.deletePaper);
  const [selectedId, setSelectedId] = useState(activePaperId);
  const [titleDraft, setTitleDraft] = useState(
    papers.find((paper) => paper.id === activePaperId)?.title ?? "",
  );

  const selected =
    papers.find((paper) => paper.id === selectedId) ?? papers[0] ?? null;

  useEffect(() => {
    const next = papers.find((paper) => paper.id === selectedId) ?? papers[0] ?? null;
    if (!next) {
      setSelectedId(null);
      setTitleDraft("");
      return;
    }
    if (next.id !== selectedId) {
      setSelectedId(next.id);
      setTitleDraft(next.title);
    }
  }, [papers, selectedId]);

  function selectPaper(id: string) {
    const paper = papers.find((item) => item.id === id);
    setSelectedId(id);
    setTitleDraft(paper?.title ?? "");
  }

  async function createAndSelect() {
    await newPaper();
    const active = usePaperStore.getState().activePaperId;
    if (active) selectPaper(active);
  }

  async function openSelected() {
    if (!selected) return;
    await openPaper(selected.id);
    onClose();
  }

  async function saveTitle() {
    if (!selected) return;
    await renamePaper(selected.id, titleDraft);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("paperLibrary.title")}
        className="flex h-[86vh] max-h-[42rem] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <FolderOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {t("paperLibrary.title")}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                {t("paperLibrary.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("settings.cancel")}
            title={t("settings.cancel")}
            onClick={onClose}
            className={iconBtn}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] sm:grid-cols-[18rem_minmax(0,1fr)] sm:grid-rows-1">
          <aside className="flex min-h-0 flex-col border-b border-border bg-muted/35 p-3 sm:border-b-0 sm:border-r">
            <button
              type="button"
              onClick={() => void createAndSelect()}
              className={primaryBtn}
            >
              <Plus className="h-4 w-4" />
              {t("paperLibrary.newPaper")}
            </button>
            <div className="mt-3 min-h-0 flex-1 overflow-auto">
              <ul className="space-y-1">
                {papers.map((paper) => (
                  <li key={paper.id}>
                    <button
                      type="button"
                      onClick={() => selectPaper(paper.id)}
                      className={
                        paper.id === selected?.id
                          ? "flex w-full items-center gap-2 rounded-md bg-card px-3 py-2 text-left text-sm text-foreground shadow-sm ring-1 ring-border transition-colors cursor-pointer"
                          : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      }
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {paper.title}
                      </span>
                      {paper.id === activePaperId && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="min-h-0 overflow-auto p-4 sm:p-6">
            {selected ? (
              <div className="space-y-5">
                <div className="rounded-md border border-border bg-background p-4">
                  <label className="block text-sm font-medium text-foreground">
                    {t("paperLibrary.paperTitle")}
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.currentTarget.value)}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => void saveTitle()}
                      className={secondaryBtn}
                    >
                      <Pencil className="h-4 w-4" />
                      {t("settings.save")}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Info label={t("paperLibrary.questions")} value={String(selected.questionCount)} />
                  <Info label={t("paperLibrary.createdAt")} value={formatDate(selected.createdAt)} />
                  <Info label={t("paperLibrary.updatedAt")} value={formatDate(selected.updatedAt)} />
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => void openSelected()}
                    className={primaryBtn}
                  >
                    <FolderOpen className="h-4 w-4" />
                    {t("paperLibrary.open")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void duplicatePaper(selected.id)}
                    className={secondaryBtn}
                  >
                    <Copy className="h-4 w-4" />
                    {t("paperLibrary.duplicate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePaper(selected.id)}
                    className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("settings.delete")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
                <div>
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("paperLibrary.empty")}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
