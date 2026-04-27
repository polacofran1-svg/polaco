import { useState, useMemo } from "react";
import { useNavigate } from "@/lib/router";
import { useDialog } from "../context/DialogContext";
import {
  Hexagon,
  Bot,
  LayoutTemplate,
  CircleDot,
  Check,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react";

const DISMISS_KEY = "paperclip:getting-started-dismissed";

interface ChecklistProps {
  companyId: string;
  hasProjects: boolean;
  hasAgents: boolean;
  hasTemplates: boolean;
  hasIssues: boolean;
}

interface Step {
  id: string;
  label: string;
  icon: typeof Hexagon;
  done: boolean;
  action: () => void;
}

export function GettingStartedChecklist({
  companyId,
  hasProjects,
  hasAgents,
  hasTemplates,
  hasIssues,
}: ChecklistProps) {
  const navigate = useNavigate();
  const { openNewProject, openNewAgent, openNewIssue } = useDialog();

  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return parsed[companyId] === true;
    } catch {
      return false;
    }
  });

  const [expanded, setExpanded] = useState(false);

  const steps: Step[] = useMemo(
    () => [
      {
        id: "project",
        label: "Create a project",
        icon: Hexagon,
        done: hasProjects,
        action: openNewProject,
      },
      {
        id: "agent",
        label: "Add an agent",
        icon: Bot,
        done: hasAgents,
        action: openNewAgent,
      },
      {
        id: "template",
        label: "Create a template",
        icon: LayoutTemplate,
        done: hasTemplates,
        action: () => navigate("/company/templates"),
      },
      {
        id: "issue",
        label: "Assign your first task",
        icon: CircleDot,
        done: hasIssues,
        action: () => openNewIssue(),
      },
    ],
    [hasProjects, hasAgents, hasTemplates, hasIssues, openNewProject, openNewAgent, openNewIssue, navigate],
  );

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  // Find next incomplete step for the inline hint
  const nextStep = steps.find((s) => !s.done);

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      const state = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      state[companyId] = true;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(state));
    } catch { /* noop */ }
    setDismissed(true);
  }

  return (
    <div className="animate-scale-in rounded-xl border border-border/70 bg-card/80">
      {/* Compact bar — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/5"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {steps.map((step) => (
            <span
              key={step.id}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                step.done
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{completedCount}/{steps.length}</span>
          {nextStep && (
            <span className="ml-1.5 hidden sm:inline">
              — Next: {nextStep.label}
            </span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded p-0.5 text-muted-foreground/40 transition-colors hover:bg-accent/50 hover:text-muted-foreground"
            title="Dismiss getting started"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </button>

      {/* Expandable detail panel */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap gap-1.5 border-t border-border/50 px-4 py-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={step.done ? undefined : step.action}
                  disabled={step.done}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150 ${
                    step.done
                      ? "border-transparent bg-emerald-500/8 text-emerald-700 dark:text-emerald-400"
                      : "border-border bg-background text-muted-foreground hover:border-accent/40 hover:bg-accent/5 hover:text-foreground"
                  }`}
                >
                  {step.done ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                  <span className={step.done ? "line-through decoration-emerald-500/40" : ""}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
