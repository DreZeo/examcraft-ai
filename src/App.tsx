import { useEffect, useRef, useState } from "react";
import { useConfigStore } from "./stores/configStore";
import { usePaperStore } from "./stores/paperStore";
import { useTheme } from "./hooks/useTheme";
import { FirstLaunch } from "./components/layout/FirstLaunch";
import { TopBar } from "./components/layout/TopBar";
import { PaperOutline } from "./components/paper/PaperOutline";
import { PaperCanvas } from "./components/paper/PaperCanvas";
import { AssistantDrawer } from "./components/assistant/AssistantDrawer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PaperManagerModal } from "./components/paper/PaperManagerModal";
import { useAssistantStore } from "./stores/assistantStore";

export default function App() {
  const { loaded, dataDir, init } = useConfigStore();
  const paper = usePaperStore((s) => s.paper);
  const activePaperId = usePaperStore((s) => s.activePaperId);
  const loadPaper = usePaperStore((s) => s.load);
  const loadAssistantForPaper = useAssistantStore((s) => s.loadForPaper);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paperManagerOpen, setPaperManagerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const paperScrollRef = useRef<HTMLElement | null>(null);

  useTheme();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (dataDir) void loadPaper();
  }, [dataDir, loadPaper]);

  useEffect(() => {
    if (activePaperId) void loadAssistantForPaper(activePaperId);
  }, [activePaperId, loadAssistantForPaper]);

  useEffect(() => {
    if (paper.questions.length === 0) {
      setActiveQuestionId(null);
      return;
    }
    setActiveQuestionId((current) =>
      current && paper.questions.some((question) => question.id === current)
        ? current
        : paper.questions[0].id,
    );
  }, [paper.questions]);

  // Esc closes the settings modal / collapses the drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (paperManagerOpen) setPaperManagerOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else setDrawerOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, paperManagerOpen]);

  if (!loaded) {
    return <div className="grid h-full place-items-center bg-background text-muted-foreground" />;
  }

  if (!dataDir) {
    return <FirstLaunch />;
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <TopBar
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPaperManager={() => setPaperManagerOpen(true)}
      />
      <div className="flex min-h-0 flex-1">
        <PaperOutline
          questions={paper.questions}
          activeQuestionId={activeQuestionId}
          open={outlineOpen}
          onToggle={() => setOutlineOpen((value) => !value)}
          onActiveQuestionChange={setActiveQuestionId}
        />
        <main ref={paperScrollRef} className="min-w-0 flex-1 overflow-auto">
          <PaperCanvas
            scrollRootRef={paperScrollRef}
            onActiveQuestionChange={setActiveQuestionId}
          />
        </main>
        <AssistantDrawer
          open={drawerOpen}
          onToggle={() => setDrawerOpen((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {paperManagerOpen && (
        <PaperManagerModal onClose={() => setPaperManagerOpen(false)} />
      )}
    </div>
  );
}
