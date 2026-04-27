import type { RoutineVariable } from "@paperclipai/shared";

export type IssueTemplate = {
  id: string;
  label: string;
  shortLabel: string;
  summary: string;
  category: string;
  featured?: boolean;
  defaults: {
    title: string;
    description: string;
    status: string;
    priority: string;
  };
};

export type RoutineTemplate = {
  id: string;
  label: string;
  shortLabel: string;
  summary: string;
  cadenceHint: string;
  featured?: boolean;
  defaults: {
    title: string;
    description: string;
    priority: string;
    concurrencyPolicy: string;
    catchUpPolicy: string;
    variables: RoutineVariable[];
  };
};

export const issueTemplates: IssueTemplate[] = [
  {
    id: "content-brief",
    label: "Content brief",
    shortLabel: "Content",
    summary: "Shape a draftable brief for a post, thread, or editorial asset.",
    category: "Editorial",
    featured: true,
    defaults: {
      title: "Create a content brief for {{topic}}",
      status: "todo",
      priority: "medium",
      description: [
        "Goal",
        "- Turn the opportunity around {{topic}} into a clean content brief.",
        "",
        "Deliverables",
        "- Audience and angle",
        "- Key supporting points",
        "- Proof points or source links",
        "- Recommended CTA",
        "",
        "Success criteria",
        "- The brief should be clear enough for an agent to turn into channel-ready content.",
      ].join("\n"),
    },
  },
  {
    id: "research-sprint",
    label: "Research sprint",
    shortLabel: "Research",
    summary: "Package a focused investigation with findings, risks, and next moves.",
    category: "Analysis",
    featured: true,
    defaults: {
      title: "Investigate {{topic}} and summarize the opportunity",
      status: "todo",
      priority: "high",
      description: [
        "Research objective",
        "- Investigate {{topic}} thoroughly and return a concise decision memo.",
        "",
        "Include",
        "- What changed or matters now",
        "- Key evidence and sources",
        "- Competitive or market implications",
        "- Recommended next actions",
        "",
        "Output",
        "- Store findings in a reusable research document and summarize the conclusion in the issue.",
      ].join("\n"),
    },
  },
  {
    id: "launch-plan",
    label: "Launch plan",
    shortLabel: "Launch",
    summary: "Coordinate a tighter launch checklist across product, messaging, and readiness.",
    category: "Execution",
    featured: true,
    defaults: {
      title: "Prepare launch plan for {{initiative}}",
      status: "todo",
      priority: "high",
      description: [
        "Mission",
        "- Prepare the launch plan for {{initiative}}.",
        "",
        "Track",
        "- Product readiness",
        "- Messaging and assets",
        "- Distribution checklist",
        "- Risks or blockers",
        "",
        "Done when",
        "- The team can execute the launch from a single clear plan.",
      ].join("\n"),
    },
  },
  {
    id: "decision-memo",
    label: "Decision memo",
    shortLabel: "Decision",
    summary: "Frame a choice, capture tradeoffs, and propose a recommendation with clear rationale.",
    category: "Strategy",
    defaults: {
      title: "Write a decision memo for {{decision_area}}",
      status: "todo",
      priority: "high",
      description: [
        "Decision area",
        "- Evaluate {{decision_area}} and recommend a direction.",
        "",
        "Cover",
        "- Context",
        "- Options considered",
        "- Tradeoffs",
        "- Recommendation",
        "- Risks after deciding",
      ].join("\n"),
    },
  },
  {
    id: "ops-handoff",
    label: "Ops handoff",
    shortLabel: "Handoff",
    summary: "Prepare a clean operational handoff with owners, follow-through, and dependencies.",
    category: "Operations",
    defaults: {
      title: "Prepare an operational handoff for {{initiative}}",
      status: "todo",
      priority: "medium",
      description: [
        "Objective",
        "- Prepare a handoff package for {{initiative}}.",
        "",
        "Include",
        "- Current state",
        "- Open dependencies",
        "- Owners",
        "- Next actions",
        "- Risks or missing context",
      ].join("\n"),
    },
  },
  {
    id: "customer-signal",
    label: "Customer signal review",
    shortLabel: "Signals",
    summary: "Turn qualitative feedback or recurring complaints into a sharp synthesis and follow-up.",
    category: "Signals",
    defaults: {
      title: "Review customer signals around {{topic}}",
      status: "todo",
      priority: "medium",
      description: [
        "Goal",
        "- Review customer signals around {{topic}} and summarize what stands out.",
        "",
        "Return",
        "- Common patterns",
        "- Strong quotes or examples",
        "- Severity / urgency",
        "- Suggested product or content follow-up",
      ].join("\n"),
    },
  },
];

export const routineTemplates: RoutineTemplate[] = [
  {
    id: "content-radar",
    label: "Content radar",
    shortLabel: "Content radar",
    summary: "Scan a topic repeatedly, synthesize what matters, and open content-ready work.",
    cadenceHint: "Daily or several times per week",
    featured: true,
    defaults: {
      title: "Surface content opportunities for {{topic}}",
      priority: "medium",
      concurrencyPolicy: "coalesce_if_active",
      catchUpPolicy: "skip_missed",
      description: [
        "Research {{topic}} and look for strong content opportunities.",
        "",
        "For each run:",
        "- Gather relevant developments, conversations, or source material",
        "- Identify the best angle worth publishing",
        "- Open an issue with the brief, recommended channel, and key evidence",
        "",
        "Prefer concise, high-signal output over long notes.",
      ].join("\n"),
      variables: [
        {
          name: "topic",
          label: "Topic",
          type: "text",
          defaultValue: null,
          required: true,
          options: [],
        },
      ],
    },
  },
  {
    id: "competitor-watch",
    label: "Competitor watch",
    shortLabel: "Competitor watch",
    summary: "Monitor a competitor or market segment and flag changes worth actioning.",
    cadenceHint: "Weekly or after key announcements",
    featured: true,
    defaults: {
      title: "Track competitor movement for {{company_name}}",
      priority: "high",
      concurrencyPolicy: "always_enqueue",
      catchUpPolicy: "enqueue_missed_with_cap",
      description: [
        "Review the latest movement around {{company_name}}.",
        "",
        "Return:",
        "- What changed",
        "- Why it matters",
        "- Risks or openings for Saturn",
        "- Any follow-up issue that should be created",
      ].join("\n"),
      variables: [
        {
          name: "company_name",
          label: "Competitor",
          type: "text",
          defaultValue: null,
          required: true,
          options: [],
        },
      ],
    },
  },
  {
    id: "weekly-brief",
    label: "Weekly brief",
    shortLabel: "Weekly brief",
    summary: "Turn ongoing execution into one clear weekly summary for operators or leadership.",
    cadenceHint: "Every week",
    featured: true,
    defaults: {
      title: "Publish weekly operating brief for {{team_name}}",
      priority: "medium",
      concurrencyPolicy: "coalesce_if_active",
      catchUpPolicy: "skip_missed",
      description: [
        "Summarize the most important work completed by {{team_name}} in the past week.",
        "",
        "Include:",
        "- Wins",
        "- Blockers",
        "- Decisions made",
        "- What needs attention next",
      ].join("\n"),
      variables: [
        {
          name: "team_name",
          label: "Team",
          type: "text",
          defaultValue: null,
          required: true,
          options: [],
        },
      ],
    },
  },
  {
    id: "launch-watch",
    label: "Launch watch",
    shortLabel: "Launch watch",
    summary: "Track launch readiness repeatedly and flag what still blocks a confident release.",
    cadenceHint: "Daily near launch",
    defaults: {
      title: "Review launch readiness for {{initiative}}",
      priority: "high",
      concurrencyPolicy: "coalesce_if_active",
      catchUpPolicy: "skip_missed",
      description: [
        "Review the latest launch readiness for {{initiative}}.",
        "",
        "Check",
        "- Product readiness",
        "- Messaging and assets",
        "- Approvals",
        "- Remaining blockers",
        "",
        "Open or update issues when gaps appear.",
      ].join("\n"),
      variables: [
        {
          name: "initiative",
          label: "Initiative",
          type: "text",
          defaultValue: null,
          required: true,
          options: [],
        },
      ],
    },
  },
  {
    id: "ops-review",
    label: "Ops review",
    shortLabel: "Ops review",
    summary: "Run a recurring check on active work, blockers, and execution health across the company.",
    cadenceHint: "Weekly",
    defaults: {
      title: "Run an operations review for {{scope}}",
      priority: "medium",
      concurrencyPolicy: "coalesce_if_active",
      catchUpPolicy: "skip_missed",
      description: [
        "Review execution health for {{scope}}.",
        "",
        "Summarize",
        "- Work at risk",
        "- Blockers",
        "- Resource pressure",
        "- Recommended interventions",
      ].join("\n"),
      variables: [
        {
          name: "scope",
          label: "Scope",
          type: "text",
          defaultValue: null,
          required: true,
          options: [],
        },
      ],
    },
  },
  {
    id: "signal-digest",
    label: "Signal digest",
    shortLabel: "Signal digest",
    summary: "Aggregate new market or customer signals and convert them into one clear operating digest.",
    cadenceHint: "Every week",
    defaults: {
      title: "Create a signal digest for {{topic}}",
      priority: "medium",
      concurrencyPolicy: "always_enqueue",
      catchUpPolicy: "enqueue_missed_with_cap",
      description: [
        "Collect and synthesize new signals related to {{topic}}.",
        "",
        "Deliver",
        "- What changed",
        "- Why it matters",
        "- Whether it affects goals, product, or content",
        "- Follow-up work worth opening",
      ].join("\n"),
      variables: [
        {
          name: "topic",
          label: "Topic",
          type: "text",
          defaultValue: null,
          required: true,
          options: [],
        },
      ],
    },
  },
];

type TemplateSuggestionContext = {
  agentCount?: number;
  projectCount?: number;
};

function scoreIssueTemplate(template: IssueTemplate, context: TemplateSuggestionContext) {
  let score = template.featured ? 10 : 0;
  if (context.projectCount && context.projectCount > 0 && template.category === "Execution") score += 3;
  if (context.agentCount && context.agentCount > 1 && template.category === "Operations") score += 2;
  if (template.category === "Editorial") score += 2;
  return score;
}

function scoreRoutineTemplate(template: RoutineTemplate, context: TemplateSuggestionContext) {
  let score = template.featured ? 10 : 0;
  if (context.projectCount && context.projectCount > 0 && template.id === "launch-watch") score += 4;
  if (context.agentCount && context.agentCount > 1 && template.id === "ops-review") score += 3;
  if (template.id === "content-radar") score += 2;
  return score;
}

export function getSuggestedIssueTemplates(context: TemplateSuggestionContext = {}) {
  return [...issueTemplates].sort((left, right) => scoreIssueTemplate(right, context) - scoreIssueTemplate(left, context));
}

export function getSuggestedRoutineTemplates(context: TemplateSuggestionContext = {}) {
  return [...routineTemplates].sort((left, right) => scoreRoutineTemplate(right, context) - scoreRoutineTemplate(left, context));
}
