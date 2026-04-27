import { useEffect, useMemo, useCallback, useState } from "react";
import { useLocation, useSearchParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { collectLiveIssueIds } from "../lib/liveIssueIds";
import { isContentIssue } from "../lib/content-issues";
import { queryKeys } from "../lib/queryKeys";
import { createIssueDetailLocationState } from "../lib/issueDetailBreadcrumb";
import { EmptyState } from "../components/EmptyState";
import { IssuesList } from "../components/IssuesList";
import { CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WORKSPACE_FILTER_ISSUE_LIMIT = 1000;

export function buildIssuesSearchUrl(currentHref: string, search: string): string | null {
  const url = new URL(currentHref);
  const currentSearch = url.searchParams.get("q") ?? "";
  if (currentSearch === search) return null;

  if (search.length > 0) {
    url.searchParams.set("q", search);
  } else {
    url.searchParams.delete("q");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function Issues() {
  const { selectedCompanyId, companies } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialSearch = searchParams.get("q") ?? "";
  const [focusMode, setFocusMode] = useState<"all" | "content" | "editorial">("all");
  const participantAgentId = searchParams.get("participantAgentId") ?? undefined;
  const initialWorkspaces = searchParams.getAll("workspace").filter((workspaceId) => workspaceId.length > 0);
  const workspaceIdFilter = initialWorkspaces.length === 1 ? initialWorkspaces[0] : undefined;
  const handleSearchChange = useCallback((search: string) => {
    const nextUrl = buildIssuesSearchUrl(window.location.href, search);
    if (!nextUrl) return;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, []);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const liveIssueIds = useMemo(() => collectLiveIssueIds(liveRuns), [liveRuns]);
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const issueLinkState = useMemo(
    () =>
      createIssueDetailLocationState(
        "Issues",
        `${location.pathname}${location.search}${location.hash}`,
        "issues",
      ),
    [location.pathname, location.search, location.hash],
  );

  useEffect(() => {
    setBreadcrumbs([{ label: "Issues" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading, error } = useQuery({
    queryKey: [
      ...queryKeys.issues.list(selectedCompanyId!),
      "participant-agent",
      participantAgentId ?? "__all__",
      "workspace",
      workspaceIdFilter ?? "__all__",
      "with-routine-executions",
    ],
    queryFn: () => issuesApi.list(selectedCompanyId!, {
      participantAgentId,
      workspaceId: workspaceIdFilter,
      includeRoutineExecutions: true,
      ...(workspaceIdFilter ? { limit: WORKSPACE_FILTER_ISSUE_LIMIT } : {}),
    }),
    enabled: !!selectedCompanyId,
  });

  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issuesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={CircleDot} message="Select a company to view issues." />;
  }

  const openIssueCount = (issues ?? []).filter((issue) => issue.status !== "done" && issue.status !== "cancelled").length;
  const blockedIssueCount = (issues ?? []).filter((issue) => issue.status === "blocked").length;
  const contentIssueCount = (issues ?? []).filter((issue) => isContentIssue(issue)).length;
  const editorialReviewCount = (issues ?? []).filter(
    (issue) => isContentIssue(issue) && (issue.status === "in_review" || issue.status === "todo" || issue.status === "in_progress"),
  ).length;
  const filteredIssues = useMemo(() => {
    const base = issues ?? [];
    if (focusMode === "content") {
      return base.filter((issue) => isContentIssue(issue));
    }
    if (focusMode === "editorial") {
      return base.filter(
        (issue) =>
          isContentIssue(issue) &&
          (issue.status === "in_review" || issue.status === "todo" || issue.status === "in_progress"),
      );
    }
    return base;
  }, [focusMode, issues]);

  return (
    <div className="space-y-6">
      <section className="saturn-surface rounded-[2rem] p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Work Queue
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              {selectedCompany?.name ?? "Workspace"} issues
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Track active work, unblock stalled tasks, and keep the issue stream readable as the system scales.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[420px]">
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Open</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{openIssueCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Issues in motion</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Blocked</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{blockedIssueCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Need attention</p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Editorial</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{editorialReviewCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">{contentIssueCount} content issue{contentIssueCount === 1 ? "" : "s"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              View focus
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Narrow the queue to editorial work when you want to review content separately from the rest of the system.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={focusMode === "all" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFocusMode("all")}
            >
              All issues
              <Badge variant="outline" className="ml-2">
                {issues?.length ?? 0}
              </Badge>
            </Button>
            <Button
              variant={focusMode === "content" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFocusMode("content")}
            >
              Content only
              <Badge variant="outline" className="ml-2">
                {contentIssueCount}
              </Badge>
            </Button>
            <Button
              variant={focusMode === "editorial" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFocusMode("editorial")}
            >
              Needs review
              <Badge variant="outline" className="ml-2">
                {editorialReviewCount}
              </Badge>
            </Button>
          </div>
        </div>
      </section>

      <IssuesList
        issues={filteredIssues}
        isLoading={isLoading}
        error={error as Error | null}
        agents={agents}
        projects={projects}
        liveIssueIds={liveIssueIds}
        viewStateKey="paperclip:issues-view"
        issueLinkState={issueLinkState}
        initialAssignees={searchParams.get("assignee") ? [searchParams.get("assignee")!] : undefined}
        initialWorkspaces={initialWorkspaces.length > 0 ? initialWorkspaces : undefined}
        initialSearch={initialSearch}
        onSearchChange={handleSearchChange}
        enableRoutineVisibilityFilter
        onUpdateIssue={(id, data) => updateIssue.mutate({ id, data })}
        searchFilters={participantAgentId || workspaceIdFilter ? { participantAgentId, workspaceId: workspaceIdFilter } : undefined}
      />
    </div>
  );
}
