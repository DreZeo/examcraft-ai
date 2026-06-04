import { useEffect, useState } from "react";
import { useConfigStore } from "./stores/configStore";
import { usePaperStore } from "./stores/paperStore";
import { FirstLaunch } from "./components/layout/FirstLaunch";
import { TopBar } from "./components/layout/TopBar";
import { PaperCanvas } from "./components/paper/PaperCanvas";
import { AssistantDrawer } from "./components/assistant/AssistantDrawer";
import { SettingsModal } from "./components/settings/SettingsModal";

export default function App() {
  const { loaded, dataDir, init } = useConfigStore();
  const loadPaper = usePaperStore((s) => s.load);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (dataDir) void loadPaper();
  }, [dataDir, loadPaper]);

  // Esc closes the settings modal / collapses the drawer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (settingsOpen) setSettingsOpen(false);
        else setDrawerOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  if (!loaded) {
    return <div className="grid h-full place-items-center text-slate-400" />;
  }

  if (!dataDir) {
    return <FirstLaunch />;
  }

  return (
    <div className="flex h-full flex-col bg-slate-100 text-slate-800">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto">
          <PaperCanvas />
        </main>
        <AssistantDrawer
          open={drawerOpen}
          onToggle={() => setDrawerOpen((v) => !v)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
