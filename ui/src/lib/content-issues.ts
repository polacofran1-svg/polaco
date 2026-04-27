import type { Issue } from "@paperclipai/shared";

export type ContentIssueChannel = "x" | "reddit" | "content";

export function isContentIssue(issue: Pick<Issue, "title" | "description">): boolean {
  const haystack = `${issue.title} ${issue.description ?? ""}`.toLowerCase();
  return /(content|thread|post|copy|reddit|x\.com|twitter|publish|launch)/.test(haystack);
}

export function inferContentIssueChannel(
  issue: Pick<Issue, "title" | "description">,
): ContentIssueChannel {
  const haystack = `${issue.title} ${issue.description ?? ""}`.toLowerCase();
  if (haystack.includes("reddit") || haystack.includes("redd.it")) return "reddit";
  if (/(thread|tweet|twitter|x\.com|x post|hilo)/.test(haystack)) return "x";
  return "content";
}

export function contentIssueKindLabel(
  issue: Pick<Issue, "title" | "description">,
): string {
  const channel = inferContentIssueChannel(issue);
  if (channel === "x") return "X Thread";
  if (channel === "reddit") return "Reddit Post";
  return "Content Brief";
}

export function contentIssueStageLabel(status: Issue["status"]): string {
  switch (status) {
    case "backlog":
      return "Idea";
    case "todo":
      return "Brief";
    case "in_progress":
      return "Drafting";
    case "in_review":
      return "Review";
    case "done":
      return "Published";
    case "blocked":
      return "Blocked";
    case "cancelled":
      return "Cancelled";
    default:
      return String(status).replace(/_/g, " ");
  }
}

export function contentIssueStageDescription(status: Issue["status"]): string {
  switch (status) {
    case "backlog":
      return "Waiting to be shaped into a content angle.";
    case "todo":
      return "Ready for the first usable draft.";
    case "in_progress":
      return "Agent is actively turning research into copy.";
    case "in_review":
      return "Draft is ready for editorial review.";
    case "done":
      return "Shipped or considered publish-ready.";
    case "blocked":
      return "Blocked on missing context or dependencies.";
    case "cancelled":
      return "No longer moving forward.";
    default:
      return "Tracked in the standard issue flow.";
  }
}
