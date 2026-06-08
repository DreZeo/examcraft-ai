import { useEffect, useRef, useState } from "react";
import { useConfigStore } from "./stores/configStore";
import { usePaperStore } from "./stores/paperStore";
import { useTheme } from "./hooks/useTheme";
import { useGlobalFont } from "./hooks/useGlobalFont";
import { FirstLaunch } from "./components/layout/FirstLaunch";
import { TopBar } from "./components/layout/TopBar";
import { PaperToolbar } from "./components/layout/PaperToolbar";
import { MarkdownFormatProvider } from "./components/layout/MarkdownFormatContext";
import { PaperOutline } from "./components/paper/PaperOutline";
import { PaperCanvas } from "./components/paper/PaperCanvas";
import { PaperErrorBoundary } from "./components/paper/PaperErrorBoundary";
import { AssistantDrawer } from "./components/assistant/AssistantDrawer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { PaperManagerModal } from "./components/paper/PaperManagerModal";
import { useAssistantStore } from "./stores/assistantStore";

const WORKBENCH_BASE_WIDTH = 1280;
const WORKBENCH_BASE_HEIGHT = 800;

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
  const viewportSize = useViewportSize();
  const workbenchScale = computeWorkbenchScale(
    viewportSize.width,
    viewportSize.height,
  );
  const workbenchStyle = getWorkbenchStyle(workbenchScale, viewportSize);

  useTheme();
  useGlobalFont();

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
    <MarkdownFormatProvider>
      <div className="h-full w-full overflow-hidden bg-background">
        <div
          className="origin-top-left bg-background text-foreground"
          style={workbenchStyle}
        >
          <div className="flex h-full flex-col bg-background text-foreground">
            <TopBar
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenPaperManager={() => setPaperManagerOpen(true)}
            />
            <PaperToolbar />
            <div className="flex min-h-0 flex-1">
              <PaperOutline
                questions={paper.questions}
                activeQuestionId={activeQuestionId}
                open={outlineOpen}
                onToggle={() => setOutlineOpen((value) => !value)}
                onActiveQuestionChange={setActiveQuestionId}
              />
              <main ref={paperScrollRef} className="min-w-0 flex-1 overflow-auto">
                <PaperErrorBoundary key={activePaperId ?? "none"}>
                  <PaperCanvas
                    scrollRootRef={paperScrollRef}
                    onActiveQuestionChange={setActiveQuestionId}
                  />
                </PaperErrorBoundary>
              </main>
              <AssistantDrawer
                open={drawerOpen}
                onToggle={() => setDrawerOpen((v) => !v)}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>
            {settingsOpen && (
              <SettingsModal onClose={() => setSettingsOpen(false)} />
            )}
            {paperManagerOpen && (
              <PaperManagerModal onClose={() => setPaperManagerOpen(false)} />
            )}
          </div>
        </div>
      </div>
    </MarkdownFormatProvider>
  );
}

export function getWorkbenchStyle(
  scale: number,
  viewport: { width: number; height: number },
): {
  width: number | "100%";
  height: number | "100%";
  transform?: string;
} {
  if (scale >= 0.999) {
    return { width: "100%", height: "100%" };
  }
  return {
    width: WORKBENCH_BASE_WIDTH,
    height: Math.max(WORKBENCH_BASE_HEIGHT, viewport.height / scale),
    transform: `scale(${scale})`,
  };
}

export function computeWorkbenchScale(
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (viewportWidth <= 0 || viewportHeight <= 0) return 1;
  return Math.min(
    1,
    viewportWidth / WORKBENCH_BASE_WIDTH,
    viewportHeight / WORKBENCH_BASE_HEIGHT,
  );
}

function readViewportSize(): { width: number; height: number } {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState(() =>
    typeof window === "undefined"
      ? { width: WORKBENCH_BASE_WIDTH, height: WORKBENCH_BASE_HEIGHT }
      : readViewportSize(),
  );

  useEffect(() => {
    function updateSize() {
      const next = readViewportSize();
      setSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    window.visualViewport?.addEventListener("resize", updateSize);
    return () => {
      window.removeEventListener("resize", updateSize);
      window.visualViewport?.removeEventListener("resize", updateSize);
    };
  }, []);

  return size;
}
