import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi, type OrgNode } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { AgentIcon } from "../components/AgentIconPicker";
import { getAdapterLabel } from "../adapters/adapter-display-registry";
import { AGENT_ROLE_LABELS, type Agent } from "@paperclipai/shared";
import {
  ChevronRight,
  GitBranch,
  Search,
  Users,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "../lib/utils";

// ── Helpers ─────────────────────────────────────────────────────────────

function flattenNodes(nodes: OrgNode[]): OrgNode[] {
  const result: OrgNode[] = [];
  function walk(n: OrgNode) {
    result.push(n);
    n.reports.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

function nodeMatchesSearch(node: OrgNode, query: string): boolean {
  const q = query.toLowerCase();
  return (
    node.name.toLowerCase().includes(q) ||
    node.role.toLowerCase().includes(q)
  );
}

function subtreeMatchesSearch(node: OrgNode, query: string): boolean {
  if (!query) return true;
  if (nodeMatchesSearch(node, query)) return true;
  return node.reports.some((child) => subtreeMatchesSearch(child, query));
}

const statusDotClass: Record<string, string> = {
  active: "bg-green-400",
  running: "bg-cyan-400",
  paused: "bg-yellow-400",
  idle: "bg-yellow-400",
  pending_approval: "bg-amber-400",
  error: "bg-red-400",
  terminated: "bg-neutral-400",
};

// ── Stat Card ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xl font-bold leading-none">{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// ── Tree Node ────────────────────────────────────────────────────────────

function OrgTreeNode({
  node,
  depth,
  agentMap,
  searchQuery,
  forceExpanded,
}: {
  node: OrgNode;
  depth: number;
  agentMap: Map<string, Agent>;
  searchQuery: string;
  forceExpanded: boolean | null; // null = uncontrolled
}) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const hasChildren = node.reports.length > 0;

  const expanded = forceExpanded !== null ? forceExpanded : localExpanded;

  const agent = agentMap.get(node.id);
  const dotClass = statusDotClass[node.status] ?? "bg-neutral-400";

  // During search, only show nodes that match or have matching descendants
  const visibleChildren = searchQuery
    ? node.reports.filter((child) => subtreeMatchesSearch(child, searchQuery))
    : node.reports;

  const isMatch = searchQuery ? nodeMatchesSearch(node, searchQuery) : true;

  return (
    <div>
      <Link
        to={`/agents/${node.id}`}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent/50 no-underline text-inherit",
          searchQuery && !isMatch && "opacity-40",
        )}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            className="shrink-0 rounded p-0.5 hover:bg-accent transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLocalExpanded(!localExpanded);
            }}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Agent avatar + status dot */}
        <div className="relative shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <AgentIcon icon={agent?.icon} className="h-4 w-4 text-foreground/70" />
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              dotClass,
            )}
          />
        </div>

        {/* Name + role + adapter */}
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <span className="truncate font-semibold text-foreground leading-tight">
            {node.name}
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {agent?.title ?? (AGENT_ROLE_LABELS[node.role as keyof typeof AGENT_ROLE_LABELS] ?? node.role)}
          </span>
          {agent && (
            <span className="mt-1 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/70 leading-none">
              {getAdapterLabel(agent.adapterType)}
            </span>
          )}
        </div>

        {/* Report count badge */}
        {hasChildren && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {node.reports.length} report{node.reports.length !== 1 ? "s" : ""}
          </span>
        )}
      </Link>

      {/* Children */}
      {hasChildren && expanded && visibleChildren.length > 0 && (
        <div className="relative">
          {/* Vertical connector line */}
          <span
            className="absolute left-0 top-0 bottom-0 w-px bg-border/60"
            style={{ left: `${depth * 20 + 27}px` }}
          />
          {visibleChildren.map((child) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              agentMap={agentMap}
              searchQuery={searchQuery}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export function Org() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [searchQuery, setSearchQuery] = useState("");
  const [forceExpanded, setForceExpanded] = useState<boolean | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Org Chart" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.org(selectedCompanyId!),
    queryFn: () => agentsApi.org(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents ?? []) m.set(a.id, a);
    return m;
  }, [agents]);

  // Stats
  const allNodes = useMemo(() => flattenNodes(data ?? []), [data]);
  const stats = useMemo(() => {
    const active = allNodes.filter((n) => n.status === "active" || n.status === "running").length;
    const paused = allNodes.filter((n) => n.status === "paused" || n.status === "idle").length;
    const other = allNodes.length - active - paused;
    return { total: allNodes.length, active, paused, other };
  }, [allNodes]);

  // Filtered roots for search
  const visibleRoots = useMemo(() => {
    if (!data || !searchQuery) return data ?? [];
    return data.filter((root) => subtreeMatchesSearch(root, searchQuery));
  }, [data, searchQuery]);

  if (!selectedCompanyId) {
    return <EmptyState icon={GitBranch} message="Select a company to view org chart." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {/* Stats row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users} label="Total agents" value={stats.total} colorClass="bg-primary/10 text-primary" />
          <StatCard icon={CheckCircle2} label="Active" value={stats.active} colorClass="bg-green-500/10 text-green-500" />
          <StatCard icon={PauseCircle} label="Paused / Idle" value={stats.paused} colorClass="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400" />
          <StatCard icon={XCircle} label="Other" value={stats.other} colorClass="bg-muted text-muted-foreground" />
        </div>
      )}

      {/* Search + collapse controls */}
      {stats.total > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Search agents or roles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0"
            onClick={() => setForceExpanded((v) => (v === false ? null : false))}
            title="Collapse all"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Collapse all</span>
          </button>
          <button
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-accent/50 transition-colors shrink-0"
            onClick={() => setForceExpanded((v) => (v === true ? null : true))}
            title="Expand all"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expand all</span>
          </button>
        </div>
      )}

      {/* Empty states */}
      {data && data.length === 0 && (
        <EmptyState
          icon={GitBranch}
          message="No agents in the organization. Create agents to build your org chart."
        />
      )}

      {data && data.length > 0 && searchQuery && visibleRoots.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-card px-6 py-10 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No agents match "<strong>{searchQuery}</strong>"</p>
        </div>
      )}

      {/* Tree */}
      {visibleRoots.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden py-2">
          {visibleRoots.map((node) => (
            <OrgTreeNode
              key={node.id}
              node={node}
              depth={0}
              agentMap={agentMap}
              searchQuery={searchQuery}
              forceExpanded={forceExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
