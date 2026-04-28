import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { Issue, IssueDocument } from "@paperclipai/shared";
import { issuesApi } from "@/api/issues";
import { useCompany } from "@/context/CompanyContext";
import { useToastActions } from "@/context/ToastContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { queryKeys } from "@/lib/queryKeys";

type ContentSource = {
  id: string;
  label: string;
  href: string;
};

type ContentChannel = "x" | "reddit" | "content";

type DraftEditorMode = "x-thread" | "reddit-post" | "content-brief";

type StructuredDraft =
  | {
      mode: "x-thread";
      hook: string;
      context: string;
      posts: string[];
    }
  | {
      mode: "reddit-post";
      title: string;
      body: string;
    }
  | {
      mode: "content-brief";
      headline: string;
      sections: string[];
    };

function channelLabel(channel: ContentChannel): string {
  if (channel === "x") return "X";
  if (channel === "reddit") return "Reddit";
  return "Content";
}

function statusLabel(status: Issue["status"]): string {
  return status.replaceAll("_", " ");
}

function isContentIssue(issue: Issue): boolean {
  const haystack = `${issue.title} ${issue.description ?? ""}`.toLowerCase();
  return /(content|thread|post|copy|reddit|x\.com|twitter|publish)/.test(haystack);
}

function extractSources(text: string): ContentSource[] {
  const matches = text.match(/https?:\/\/[^\s)]+/g) ?? [];
  const deduped = [...new Set(matches)];
  return deduped
    .map((href, index) => {
      const lower = href.toLowerCase();
      if (lower.includes("x.com") || lower.includes("twitter.com")) {
        return { id: `src-${index}`, label: "X Source", href };
      }
      if (lower.includes("reddit.com") || lower.includes("redd.it")) {
        return { id: `src-${index}`, label: "Reddit Source", href };
      }
      return { id: `src-${index}`, label: "Reference", href };
    })
    .slice(0, 8);
}

function inferChannel(issue: Issue, sources: ContentSource[]): ContentChannel {
  const haystack = `${issue.title} ${issue.description ?? ""}`.toLowerCase();
  if (haystack.includes("reddit") || sources.some((source) => source.href.includes("reddit"))) return "reddit";
  if (haystack.includes("x") || haystack.includes("twitter") || sources.some((source) => source.href.includes("x.com"))) return "x";
  return "content";
}

function inferWhyThisMatters(issue: Issue): string {
  const fromDescription = issue.description?.trim();
  if (fromDescription) return fromDescription.split(/\n+/)[0] ?? fromDescription;
  return "No summary yet. Add context in the issue description or content document.";
}

function inferThreadTarget(issue: Issue, body: string): number | null {
  const haystack = `${issue.title} ${issue.description ?? ""} ${body}`.toLowerCase();
  const explicitThread = haystack.match(/(?:thread|hilo)\s*(?:of|de)?\s*(\d{1,2})/i);
  if (explicitThread) return Number(explicitThread[1]);
  const explicitPosts = haystack.match(/(\d{1,2})\s*(?:posts|tweets|tweets?|parts|partes)/i);
  if (explicitPosts) return Number(explicitPosts[1]);
  return null;
}

function inferEditorMode(channel: ContentChannel, issue: Issue, body: string): DraftEditorMode {
  const haystack = `${issue.title} ${issue.description ?? ""} ${body}`.toLowerCase();
  if (channel === "reddit" || haystack.includes("reddit")) return "reddit-post";
  if (channel === "x" || /thread|tweet|x\.com|twitter|hilo/.test(haystack)) return "x-thread";
  return "content-brief";
}

function splitThreadSegments(body: string): string[] {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [""];

  const numbered = normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/^(tweet|post|part|thread)\s*\d+\s*[:.-]?\s*/i, ""))
    .map((segment) => segment.replace(/^\d+[).:-]\s*/, ""));

  if (numbered.length > 1) return numbered;
  return normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function parseRedditPost(body: string, fallbackTitle: string): { title: string; body: string } {
  const normalized = body.replace(/\r\n/g, "\n").trim();
  if (!normalized) return { title: "", body: "" };

  const lines = normalized.split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  if (/^(title|headline)\s*:/i.test(firstLine)) {
    return {
      title: firstLine.replace(/^(title|headline)\s*:/i, "").trim() || fallbackTitle,
      body: lines.slice(1).join("\n").trim(),
    };
  }
  if (firstLine.startsWith("#")) {
    return {
      title: firstLine.replace(/^#+\s*/, "").trim() || fallbackTitle,
      body: lines.slice(1).join("\n").trim(),
    };
  }
  if (lines.length > 2 && firstLine.length <= 110) {
    return {
      title: firstLine || fallbackTitle,
      body: lines.slice(1).join("\n").trim(),
    };
  }
  return { title: fallbackTitle, body: normalized };
}

function parseStructuredDraft(mode: DraftEditorMode, issue: Issue, body: string): StructuredDraft {
  if (mode === "x-thread") {
    const target = inferThreadTarget(issue, body);
    const segments = splitThreadSegments(body);
    const paddedSegments =
      target && target > segments.length
        ? [...segments, ...Array.from({ length: target - segments.length }, () => "")]
        : segments;
    const [hook = "", context = "", ...posts] = paddedSegments;
    return {
      mode,
      hook,
      context,
      posts: posts.length > 0 ? posts : [""],
    };
  }

  if (mode === "reddit-post") {
    const parsed = parseRedditPost(body, issue.title);
    return { mode, ...parsed };
  }

  return {
    mode,
    headline: body.trim() ? issue.title : "",
    sections: splitThreadSegments(body).length > 0 ? splitThreadSegments(body) : [body.trim()].filter(Boolean),
  };
}

function serializeStructuredDraft(structured: StructuredDraft): string {
  if (structured.mode === "x-thread") {
    return [structured.hook, structured.context, ...structured.posts]
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join("\n\n");
  }
  if (structured.mode === "reddit-post") {
    const title = structured.title.trim();
    const body = structured.body.trim();
    return title ? [`Title: ${title}`, body].filter(Boolean).join("\n\n") : body;
  }
  return [structured.headline, ...structured.sections]
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n\n");
}

function estimateCharacterCount(text: string): number {
  return text.trim().length;
}

function cleanSections(sections: string[]): string[] {
  const cleaned = sections.map((section) => section.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : [""];
}

function pickPrimaryDocument(documents: IssueDocument[]): IssueDocument | null {
  if (documents.length === 0) return null;
  const contentDoc = documents.find((doc) => doc.key === "content");
  if (contentDoc) return contentDoc;
  const planDoc = documents.find((doc) => doc.key === "plan");
  if (planDoc) return planDoc;
  return documents[0] ?? null;
}

export function ContentUxLab() {
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const { selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftDocumentKey, setDraftDocumentKey] = useState("content");
  const [draftRevisionId, setDraftRevisionId] = useState<string | null>(null);
  const [structuredDraft, setStructuredDraft] = useState<StructuredDraft>({
    mode: "content-brief",
    headline: "",
    sections: [""],
  });

  const companyId = selectedCompany?.id ?? null;

  const issuesQuery = useQuery({
    queryKey: companyId ? queryKeys.issues.list(companyId) : ["issues", "no-company"],
    enabled: Boolean(companyId),
    queryFn: () => issuesApi.list(companyId!, { limit: 100 }),
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "Content" }]);
  }, [setBreadcrumbs]);

  const contentIssues = useMemo(() => {
    const issues = issuesQuery.data ?? [];
    const filtered = issues.filter(isContentIssue);
    return filtered.length > 0 ? filtered : issues.slice(0, 25);
  }, [issuesQuery.data]);
  const publishedCount = contentIssues.filter((issue) => issue.status === "done").length;
  const readyCount = contentIssues.filter((issue) => issue.status === "in_review" || issue.status === "todo").length;

  const activeIssue = useMemo(
    () => contentIssues.find((issue) => issue.id === activeId) ?? null,
    [contentIssues, activeId],
  );

  const documentsQuery = useQuery({
    queryKey: activeIssue ? queryKeys.issues.documents(activeIssue.id) : ["issues", "documents", "none"],
    enabled: Boolean(activeIssue),
    queryFn: () => issuesApi.listDocuments(activeIssue!.id),
  });

  useEffect(() => {
    if (!activeIssue) {
      setDraftBody("");
      setDraftDocumentKey("content");
      setDraftRevisionId(null);
      setStructuredDraft({ mode: "content-brief", headline: "", sections: [""] });
      return;
    }

    const documents = documentsQuery.data ?? [];
    const primaryDoc = pickPrimaryDocument(documents);
    if (primaryDoc) {
      setDraftBody(primaryDoc.body);
      setDraftDocumentKey(primaryDoc.key);
      setDraftRevisionId(primaryDoc.latestRevisionId ?? null);
      return;
    }

    setDraftBody("");
    setDraftDocumentKey("content");
    setDraftRevisionId(null);
  }, [activeIssue, documentsQuery.data]);

  const sourceText = `${activeIssue?.description ?? ""}\n${draftBody}`;
  const sources = useMemo(() => extractSources(sourceText), [sourceText]);
  const channel = activeIssue ? inferChannel(activeIssue, sources) : "content";
  const editorMode = activeIssue ? inferEditorMode(channel, activeIssue, draftBody) : "content-brief";

  useEffect(() => {
    if (!activeIssue) return;
    setStructuredDraft(parseStructuredDraft(editorMode, activeIssue, draftBody));
  }, [activeIssue, draftBody, editorMode]);

  const markPublishedMutation = useMutation({
    mutationFn: async () => {
      if (!activeIssue) throw new Error("No active content item selected.");
      return issuesApi.update(activeIssue.id, {
        status: "done",
        comment: "Marked as published from Saturn Content modal.",
      });
    },
    onSuccess: (updatedIssue) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(updatedIssue.companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(updatedIssue.id) });
      pushToast({
        title: "Marked as published",
        body: `${updatedIssue.identifier ?? updatedIssue.id} moved to done.`,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Could not publish",
        body: error instanceof Error ? error.message : "Issue status update failed.",
        tone: "error",
      });
    },
  });

  if (!companyId) {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
        Select a company first to load content issues.
      </div>
    );
  }

  const isWorking = markPublishedMutation.isPending;
  const threadTarget = activeIssue ? inferThreadTarget(activeIssue, draftBody) : null;

  return (
    <div className="space-y-6">
      <section className="saturn-surface rounded-5xl p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Content Studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Draft, review, and ship channel-ready content
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Content items are powered by real issues and issue documents, so the workflow stays inside Saturn instead of living in a detached lab.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[420px]">
            <div className="rounded-3xl border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Queue</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{contentIssues.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Content-linked issues</p>
            </div>
            <div className="rounded-3xl border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ready</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{readyCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Drafts needing polish</p>
            </div>
            <div className="rounded-3xl border border-border bg-background px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Published</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{publishedCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Closed as shipped</p>
            </div>
          </div>
        </div>
      </section>

      {issuesQuery.isLoading ? (
        <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Loading content issues...</div>
      ) : null}

      {issuesQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Could not load issues: {issuesQuery.error instanceof Error ? issuesQuery.error.message : "Unknown error"}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {contentIssues.map((issue) => (
          <Card key={issue.id} className="border-border/70">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{issue.identifier ?? issue.id.slice(0, 8)}</Badge>
                <Badge variant="secondary">{statusLabel(issue.status)}</Badge>
                <Badge variant="outline">{channelLabel(inferChannel(issue, extractSources(issue.description ?? "")))}</Badge>
              </div>
              <CardTitle className="text-base">{issue.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">{inferWhyThisMatters(issue)}</p>
              <Button size="sm" onClick={() => setActiveId(issue.id)}>
                Open Draft
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={activeIssue !== null} onOpenChange={(open) => !open && setActiveId(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] p-0 sm:w-[calc(100vw-3rem)] sm:max-w-[calc(100vw-3rem)] 2xl:w-[1400px] 2xl:max-w-[1400px]">
          {activeIssue ? (
            <div
              className={`grid max-h-[86vh] grid-cols-1 overflow-hidden ${
                structuredDraft.mode === "content-brief"
                  ? "xl:grid-cols-[minmax(0,1.15fr)_360px]"
                  : "lg:grid-cols-[minmax(0,1fr)_360px]"
              }`}
            >
              <main className="flex min-h-0 flex-col overflow-y-auto p-5">
                <DialogHeader className="mb-5 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{channelLabel(channel)}</Badge>
                    <Badge variant="secondary">
                      {editorMode === "x-thread"
                        ? threadTarget
                          ? `${threadTarget}-part thread`
                          : "Thread"
                        : editorMode === "reddit-post"
                          ? "Reddit post"
                          : "Content brief"}
                    </Badge>
                    <Badge variant="outline">{statusLabel(activeIssue.status)}</Badge>
                  </div>
                  <DialogTitle className="mt-3 text-xl tracking-[-0.03em]">{activeIssue.title}</DialogTitle>
                  <DialogDescription>
                    Format the draft in a channel-ready layout instead of editing one long generic document.
                  </DialogDescription>
                </DialogHeader>

                <div className="mb-4 space-y-4">
                  {structuredDraft.mode === "x-thread" ? (
                    <div className="space-y-3">
                      <div className="rounded-3xl border border-border/70 bg-background p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Opening hook
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              The visual lead. This is what the agent chose as the entry point.
                            </p>
                          </div>
                          <Badge variant={estimateCharacterCount(structuredDraft.hook) > 280 ? "destructive" : "outline"}>
                            {estimateCharacterCount(structuredDraft.hook)}/280
                          </Badge>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/15 p-5">
                          <p className="whitespace-pre-wrap text-[17px] leading-8 text-foreground">
                            {structuredDraft.hook || "No opening hook generated yet."}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-border/70 bg-background p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Context
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Framing chosen by the agent before the sequence unfolds.
                            </p>
                          </div>
                          <Badge variant={estimateCharacterCount(structuredDraft.context) > 280 ? "destructive" : "outline"}>
                            {estimateCharacterCount(structuredDraft.context)}/280
                          </Badge>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-muted/15 p-5">
                          <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/92">
                            {structuredDraft.context || "No context block generated yet."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Thread body
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Sequence generated by the agent, rendered post by post.
                          </p>
                        </div>
                        <Badge variant="outline">{structuredDraft.posts.filter((post) => post.trim().length > 0).length} posts</Badge>
                      </div>

                      {cleanSections(structuredDraft.posts).map((segment, index) => (
                        <div key={`segment-${index}`} className="rounded-3xl border border-border/70 bg-background p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Body post {index + 1}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {estimateCharacterCount(segment)}/280 characters
                              </p>
                            </div>
                            <Badge variant={estimateCharacterCount(segment) > 280 ? "destructive" : "outline"}>
                              {estimateCharacterCount(segment) > 280 ? "Too long" : "Ready"}
                            </Badge>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-5">
                            <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/92">{segment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {structuredDraft.mode === "reddit-post" ? (
                    <div className="space-y-3 rounded-3xl border border-border/70 bg-background p-4">
                      <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Post title
                        </p>
                        <p className="mt-3 text-lg font-semibold leading-7 text-foreground">
                          {draftBody ? (structuredDraft.title || activeIssue.title) : "No title generated yet."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Body
                        </p>
                        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-foreground/92">
                          {structuredDraft.body || "No Reddit body generated yet."}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {structuredDraft.mode === "content-brief" ? (
                    <div className="space-y-4 rounded-3xl border border-border/70 bg-background p-5">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Headline
                        </p>
                        <div className="mt-2 rounded-2xl border border-border/70 bg-muted/15 px-4 py-4">
                          <p className="text-lg font-semibold leading-7 text-foreground">
                            {draftBody ? (structuredDraft.headline || activeIssue.title) : "No headline generated yet."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Content blocks
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Structured sections generated by the agent for visual review.
                          </p>
                        </div>
                        <Badge variant="outline">{cleanSections(structuredDraft.sections).length} blocks</Badge>
                      </div>
                      <div className="space-y-3">
                        {cleanSections(structuredDraft.sections).map((section, index) => (
                          <div key={`brief-section-${index}`} className="rounded-2xl border border-border/70 bg-background p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Block {index + 1}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Use this for setup, proof, explanation, or CTA.
                                </p>
                              </div>
                              <Badge variant="outline">Section</Badge>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-muted/15 p-5">
                              <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground/92">{section}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Writing guidance
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Start with a sharp promise, explain why it matters, then land the action or takeaway clearly.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => markPublishedMutation.mutate()}
                    disabled={isWorking}
                  >
                    Mark as Published
                  </Button>
                </div>
              </main>

              <aside
                className={`overflow-y-auto border-t border-border/70 bg-muted/20 p-5 ${
                  structuredDraft.mode === "content-brief"
                    ? "xl:border-t-0 xl:border-l"
                    : "lg:border-t-0 lg:border-l"
                }`}
              >
                <section className="mb-5 rounded-2xl border border-border/70 bg-background p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Why This Matters
                  </h3>
                  <p className="text-sm leading-6 text-foreground/90">{inferWhyThisMatters(activeIssue)}</p>
                </section>

                <section className="mb-5 rounded-2xl border border-border/70 bg-background p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Sources
                  </h3>
                  <div className="space-y-2">
                    {sources.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No X/Reddit links found in description or draft.</p>
                    ) : (
                      sources.map((source) => (
                        <a
                          key={source.id}
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm text-foreground hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          {source.label}
                        </a>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-border/70 bg-background p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Notes
                  </h3>
                  <div className="space-y-2 text-sm text-foreground/90">
                    <p>
                      Document key: <code>{draftDocumentKey}</code>
                    </p>
                    <p>Channel: {channelLabel(channel)}</p>
                    <p>
                      Format:{" "}
                      {editorMode === "x-thread"
                        ? "Thread composer"
                        : editorMode === "reddit-post"
                          ? "Reddit composer"
                          : "Structured content"}
                    </p>
                    {structuredDraft.mode === "x-thread" ? (
                      <p>Total posts: {2 + structuredDraft.posts.length}</p>
                    ) : null}
                  </div>
                </section>
              </aside>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
