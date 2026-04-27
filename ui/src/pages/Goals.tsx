import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useDialog } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { GoalTree } from "../components/GoalTree";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers3, Plus, Target, Users, Zap } from "lucide-react";

const goalLevelCopy: Record<string, { label: string; description: string }> = {
  company: {
    label: "Company",
    description: "Top-level direction that defines what Saturn is trying to achieve overall.",
  },
  team: {
    label: "Team",
    description: "Shared objectives for groups, functions, or major workstreams.",
  },
  agent: {
    label: "Agent",
    description: "Goals assigned to a specific operator or specialist inside the company.",
  },
  task: {
    label: "Task",
    description: "Concrete execution targets that keep larger goals moving.",
  },
};

export function Goals() {
  const { selectedCompanyId } = useCompany();
  const { openNewGoal } = useDialog();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Goals" }]);
  }, [setBreadcrumbs]);

  const { data: goals, isLoading, error } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!),
    queryFn: () => goalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const goalStats = useMemo(() => {
    const allGoals = goals ?? [];
    const planned = allGoals.filter((goal) => goal.status === "planned").length;
    const active = allGoals.filter((goal) => goal.status === "active").length;
    const achieved = allGoals.filter((goal) => goal.status === "achieved").length;
    const rootIds = new Set(allGoals.map((goal) => goal.id));
    const roots = allGoals.filter((goal) => !goal.parentId || !rootIds.has(goal.parentId)).length;
    return { planned, active, achieved, roots };
  }, [goals]);

  const goalsByLevel = useMemo(() => {
    const entries = goals ?? [];
    return Object.entries(goalLevelCopy).map(([level, meta]) => ({
      level,
      ...meta,
      count: entries.filter((goal) => goal.level === level).length,
    }));
  }, [goals]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Target} message="Select a company to view goals." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="space-y-6">
        <section className="saturn-surface rounded-[2rem] p-6">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Direction Layer
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Goals give Saturn a hierarchy of intent, not just a queue of tasks
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Use company, team, agent, and task goals to define what matters, how work ladders up, and what the system should optimize for over time.
              </p>
            </div>
            <Button onClick={() => openNewGoal()}>
              <Plus className="mr-2 h-4 w-4" />
              Create first goal
            </Button>
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-4">
          {goalsByLevel.map((entry) => (
            <div key={entry.level} className="rounded-[1.5rem] border border-border/70 bg-background px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{entry.label}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.description}</p>
            </div>
          ))}
        </section>

        <EmptyState
          icon={Target}
          message="No goals yet. Start with one company-level outcome and let Saturn break it down."
          action="Add Goal"
          onAction={() => openNewGoal()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      <section className="saturn-surface rounded-[2rem] p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Direction Layer
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Define what matters, then let work ladder up cleanly
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Goals create hierarchy across the company. They help Saturn distinguish strategy, team focus, operator intent, and execution-level outcomes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[420px] xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Roots</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{goalStats.roots}</p>
              <p className="mt-1 text-xs text-muted-foreground">Top-level initiatives</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Active</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{goalStats.active}</p>
              <p className="mt-1 text-xs text-muted-foreground">Currently in motion</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Planned</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{goalStats.planned}</p>
              <p className="mt-1 text-xs text-muted-foreground">Waiting to activate</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Achieved</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{goalStats.achieved}</p>
              <p className="mt-1 text-xs text-muted-foreground">Closed successfully</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-4">
        {goalsByLevel.map((entry) => (
          <div key={entry.level} className="rounded-[1.5rem] border border-border/70 bg-background px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{entry.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">{entry.count}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-background p-5">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Goals map
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                Strategic hierarchy
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Browse goals as a structured tree so company intent, team work, and execution-level targets stay connected.
              </p>
            </div>
            <Button size="sm" onClick={() => openNewGoal()}>
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </div>

          <div className="pt-4">
            <GoalTree goals={goals} goalLink={(goal) => `/goals/${goal.id}`} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-border/70 bg-background p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-muted/20 text-muted-foreground">
                <Layers3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Recommended shape
                </p>
                <p className="text-sm text-foreground">Start broad, then narrow down</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.15rem] border border-border/70 px-4 py-4">
                <p className="text-sm font-medium text-foreground">1. Company goal</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Define the major outcome the company wants to move toward.</p>
              </div>
              <div className="rounded-[1.15rem] border border-border/70 px-4 py-4">
                <p className="text-sm font-medium text-foreground">2. Team or agent goals</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Break that into accountable streams owned by teams or individual operators.</p>
              </div>
              <div className="rounded-[1.15rem] border border-border/70 px-4 py-4">
                <p className="text-sm font-medium text-foreground">3. Task goals</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Translate each stream into concrete targets that can turn into issues and execution.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-background p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Why it helps
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-[1.15rem] border border-border/70 px-4 py-4">
                <Zap className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Sharper prioritization</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Teams can tell whether work serves strategy or is just noise.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[1.15rem] border border-border/70 px-4 py-4">
                <Users className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Cleaner ownership</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Agent and team goals make responsibility explicit instead of implied.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[1.15rem] border border-border/70 px-4 py-4">
                <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Better execution flow</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Issues, routines, and content can inherit context from a real hierarchy of intent.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
