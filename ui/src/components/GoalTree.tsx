import type { Goal } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { StatusBadge } from "./StatusBadge";
import { ChevronRight, Target } from "lucide-react";
import { cn } from "../lib/utils";
import { useState } from "react";

interface GoalTreeProps {
  goals: Goal[];
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
}

interface GoalNodeProps {
  goal: Goal;
  children: Goal[];
  allGoals: Goal[];
  depth: number;
  goalLink?: (goal: Goal) => string;
  onSelect?: (goal: Goal) => void;
}

function GoalNode({ goal, children, allGoals, depth, goalLink, onSelect }: GoalNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children.length > 0;
  const link = goalLink?.(goal);

  const inner = (
    <>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/20 text-muted-foreground"
      >
        {hasChildren ? (
          <button
            className="flex h-full w-full items-center justify-center rounded-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")}
            />
          </button>
        ) : (
          <Target className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {goal.level}
          </span>
          <span className="text-sm font-medium text-foreground">{goal.title}</span>
          {hasChildren ? (
            <span className="text-xs text-muted-foreground">
              {children.length} child{children.length === 1 ? "" : "ren"}
            </span>
          ) : null}
        </div>
        {goal.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{goal.description}</p>
        ) : null}
      </div>
      <div className="shrink-0">
        <StatusBadge status={goal.status} />
      </div>
    </>
  );

  const classes = cn(
    "group flex items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-4 text-sm transition-all hover:-translate-y-0.5 hover:border-border hover:bg-accent/10 hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)]",
  );

  return (
    <div className="space-y-2">
      {link ? (
        <Link
          to={link}
          className={cn(classes, "no-underline text-inherit")}
          style={{ marginLeft: `${depth * 18}px` }}
        >
          {inner}
        </Link>
      ) : (
        <div
          className={classes}
          style={{ marginLeft: `${depth * 18}px` }}
          onClick={() => onSelect?.(goal)}
        >
          {inner}
        </div>
      )}
      {hasChildren && expanded && (
        <div className="space-y-2 border-l border-dashed border-border/70 pl-3">
          {children.map((child) => (
            <GoalNode
              key={child.id}
              goal={child}
              children={allGoals.filter((g) => g.parentId === child.id)}
              allGoals={allGoals}
              depth={depth + 1}
              goalLink={goalLink}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalTree({ goals, goalLink, onSelect }: GoalTreeProps) {
  const goalIds = new Set(goals.map((g) => g.id));
  const roots = goals.filter((g) => !g.parentId || !goalIds.has(g.parentId));

  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">No goals.</p>;
  }

  return (
    <div className="space-y-3">
      {roots.map((goal) => (
        <GoalNode
          key={goal.id}
          goal={goal}
          children={goals.filter((g) => g.parentId === goal.id)}
          allGoals={goals}
          depth={0}
          goalLink={goalLink}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
