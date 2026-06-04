import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Check,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useConfigStore } from "../../stores/configStore";
import type { AgentConfig } from "../../lib/types/config";
import { ghostBtn, inputCls, primaryBtn, secondaryBtn } from "../../lib/ui/styles";

type EditingAgent = "new" | AgentConfig | null;

/** AI agent list and editor for global assistant persona instructions. */
export function AgentSection() {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  const setActiveAgent = useConfigStore((s) => s.setActiveAgent);
  const deleteAgent = useConfigStore((s) => s.deleteAgent);
  const [editing, setEditing] = useState<EditingAgent>(null);

  if (editing) {
    return (
      <AgentForm
        agent={editing === "new" ? null : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex min-h-[24rem] flex-col space-y-3 text-sm">
      <div className="rounded-md border border-border bg-background p-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {config.activeAgentId
                ? t("agents.activeHint")
                : t("agents.inactiveHint")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {t("agents.description")}
            </p>
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {config.agents.map((agent) => {
          const active = agent.id === config.activeAgentId;
          return (
            <li
              key={agent.id}
              className={
                active
                  ? "flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-3"
                  : "flex items-center gap-3 rounded-md border border-border bg-background px-3 py-3 transition-colors hover:bg-accent/60"
              }
            >
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground sm:inline-flex">
                <Bot className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium text-foreground">
                  {agent.name}
                  {active && (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      <Check className="h-3.5 w-3.5" />
                      {t("settings.active")}
                    </span>
                  )}
                  {agent.builtIn && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {t("agents.builtIn")}
                    </span>
                  )}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {agent.description || t("agents.noDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void setActiveAgent(active ? null : agent.id)}
                className={ghostBtn}
              >
                {active ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {active ? t("agents.disable") : t("agents.enable")}
                </span>
              </button>
              <button
                type="button"
                aria-label={t("paper.edit")}
                title={t("paper.edit")}
                onClick={() => setEditing(agent)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t("settings.delete")}
                title={t("settings.delete")}
                onClick={() => void deleteAgent(agent.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className={primaryBtn + " mt-auto sm:mt-1"}
      >
        <Plus className="h-4 w-4" />
        {t("agents.add")}
      </button>
    </div>
  );
}

function AgentForm({
  agent,
  onDone,
}: {
  agent: AgentConfig | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const addAgent = useConfigStore((s) => s.addAgent);
  const updateAgent = useConfigStore((s) => s.updateAgent);
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [instructions, setInstructions] = useState(agent?.instructions ?? "");
  const canSave = name.trim().length > 0 && instructions.trim().length > 0;

  async function save() {
    if (!canSave) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
    };
    if (agent) {
      await updateAgent(agent.id, payload);
    } else {
      await addAgent(payload);
    }
    onDone();
  }

  return (
    <div className="min-h-[24rem] space-y-4 text-sm">
      <label className="block space-y-1.5">
        <span className="font-medium text-foreground">{t("agents.name")}</span>
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          className={inputCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="font-medium text-foreground">
          {t("agents.agentDescription")}
        </span>
        <input
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          className={inputCls}
        />
      </label>

      <label className="block space-y-1.5">
        <span className="font-medium text-foreground">
          {t("agents.instructions")}
        </span>
        <textarea
          rows={8}
          value={instructions}
          onChange={(e) => setInstructions(e.currentTarget.value)}
          className={inputCls + " resize-none"}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={secondaryBtn}>
          {t("settings.cancel")}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave}
          className={primaryBtn}
        >
          <Check className="h-4 w-4" />
          {t("settings.save")}
        </button>
      </div>
    </div>
  );
}
