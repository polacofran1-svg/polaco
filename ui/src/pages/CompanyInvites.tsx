import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, MailPlus } from "lucide-react";
import { accessApi } from "@/api/access";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { Link } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";

const inviteRoleOptions = [
  {
    value: "viewer",
    label: "Viewer",
    description: "Can view company work and follow along without operational permissions.",
    gets: "No built-in grants.",
  },
  {
    value: "operator",
    label: "Operator",
    description: "Recommended for people who need to help run work without managing access.",
    gets: "Can assign tasks.",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Recommended for operators who need to invite people, create agents, and approve joins.",
    gets: "Can create agents, invite users, assign tasks, and approve join requests.",
  },
  {
    value: "owner",
    label: "Owner",
    description: "Full company access, including membership and permission management.",
    gets: "Everything in Admin, plus managing members and permission grants.",
  },
] as const;

const INVITE_HISTORY_PAGE_SIZE = 5;

function isInviteHistoryRow(value: unknown): value is Awaited<ReturnType<typeof accessApi.listInvites>>["invites"][number] {
  if (!value || typeof value !== "object") return false;
  return "id" in value && "state" in value && "createdAt" in value;
}

export function CompanyInvites() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [humanRole, setHumanRole] = useState<"owner" | "admin" | "operator" | "viewer">("operator");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteCopied, setLatestInviteCopied] = useState(false);

  useEffect(() => {
    if (!latestInviteCopied) return;
    const timeout = window.setTimeout(() => {
      setLatestInviteCopied(false);
    }, 1600);
    return () => window.clearTimeout(timeout);
  }, [latestInviteCopied]);

  async function copyInviteUrl(url: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      // Fall through to the unavailable message below.
    }

    pushToast({
      title: "Clipboard unavailable",
      body: "Copy the invite URL manually from the field below.",
      tone: "warn",
    });
    return false;
  }

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings", href: "/company/settings" },
      { label: "Invites" },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs]);

  const inviteHistoryQueryKey = queryKeys.access.invites(selectedCompanyId ?? "", "all", INVITE_HISTORY_PAGE_SIZE);
  const invitesQuery = useInfiniteQuery({
    queryKey: inviteHistoryQueryKey,
    queryFn: ({ pageParam }) =>
      accessApi.listInvites(selectedCompanyId!, {
        limit: INVITE_HISTORY_PAGE_SIZE,
        offset: pageParam,
      }),
    enabled: !!selectedCompanyId,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const inviteHistory = useMemo(
    () =>
      invitesQuery.data?.pages.flatMap((page) =>
        Array.isArray(page?.invites) ? page.invites.filter(isInviteHistoryRow) : [],
      ) ?? [],
    [invitesQuery.data?.pages],
  );

  const createInviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createCompanyInvite(selectedCompanyId!, {
        allowedJoinTypes: "human",
        humanRole,
        agentMessage: null,
      }),
    onSuccess: async (invite) => {
      setLatestInviteUrl(invite.inviteUrl);
      setLatestInviteCopied(false);
      const copied = await copyInviteUrl(invite.inviteUrl);

      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({
        title: "Invite created",
        body: copied ? "Invite ready below and copied to clipboard." : "Invite ready below.",
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to create invite",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => accessApi.revokeInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: inviteHistoryQueryKey });
      pushToast({ title: "Invite revoked", tone: "success" });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to revoke invite",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">Select a company to manage invites.</div>;
  }

  if (invitesQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading invites…</div>;
  }

  if (invitesQuery.error) {
    const message =
      invitesQuery.error instanceof ApiError && invitesQuery.error.status === 403
        ? "You do not have permission to manage company invites."
        : invitesQuery.error instanceof Error
          ? invitesQuery.error.message
          : "Failed to load invites.";
    return <div className="text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
          <MailPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company Invites</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create human invite links for company access. New invite links are copied to your clipboard when they are generated.
          </p>
        </div>
      </div>

      <div className="grid gap-12">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Create Invite</h3>
            <p className="text-sm text-muted-foreground">
              Generate a human invite link and choose the default access it should request.
            </p>
          </div>
          
          <div className="md:col-span-2 space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Choose a role</legend>
              <div className="rounded-xl border border-border overflow-hidden">
                {inviteRoleOptions.map((option, index) => {
                  const checked = humanRole === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer gap-3 px-4 py-4 transition-colors hover:bg-muted/30 ${index > 0 ? "border-t border-border" : ""}`}
                    >
                      <input
                        type="radio"
                        name="invite-role"
                        value={option.value}
                        checked={checked}
                        onChange={() => setHumanRole(option.value)}
                        className="mt-1 h-4 w-4 border-border text-foreground accent-primary"
                      />
                      <span className="min-w-0 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{option.label}</span>
                          {option.value === "operator" ? (
                            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">
                              Default
                            </span>
                          ) : null}
                        </span>
                        <span className="block max-w-2xl text-sm text-muted-foreground">{option.description}</span>
                        <span className="block text-sm text-foreground">{option.gets}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/80">
              Each invite link is single-use. The first successful use consumes the link and creates or reuses the matching join request before approval.
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => createInviteMutation.mutate()} disabled={createInviteMutation.isPending} className="shadow-sm">
                {createInviteMutation.isPending ? "Creating…" : "Create invite"}
              </Button>
            </div>

            {latestInviteUrl ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 px-4 py-4 animate-in zoom-in-95 duration-300">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">Latest invite link</div>
                    {latestInviteCopied ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 animate-in fade-in">
                        <Check className="h-3.5 w-3.5" />
                        Copied to clipboard
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    This URL includes the current Paperclip domain returned by the server.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const copied = await copyInviteUrl(latestInviteUrl);
                    setLatestInviteCopied(copied);
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-mono break-all transition-colors hover:border-primary/50"
                >
                  {latestInviteUrl}
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="shadow-sm" asChild>
                    <a href={latestInviteUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                      Open invite
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="h-px w-full bg-border/40" />

        <div className="grid gap-6 md:grid-cols-3 pb-8">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Invite history</h3>
            <p className="text-sm text-muted-foreground">
              Review invite status, role, inviter, and any linked join request.
            </p>
            <div className="pt-2">
              <Link to="/inbox/requests" className="text-sm text-primary hover:underline underline-offset-4 font-medium">
                Open join request queue &rarr;
              </Link>
            </div>
          </div>
          
          <div className="md:col-span-2 rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm transition-all hover:shadow-md">
            {inviteHistory.length === 0 ? (
              <div className="px-5 py-8 text-sm text-muted-foreground text-center bg-muted/10">
                No invites have been created for this company yet.
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-3 font-medium text-muted-foreground">State</th>
                        <th className="px-5 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="px-5 py-3 font-medium text-muted-foreground">Invited by</th>
                        <th className="px-5 py-3 font-medium text-muted-foreground">Created</th>
                        <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inviteHistory.map((invite) => (
                        <tr key={invite.id} className="transition-colors hover:bg-muted/20">
                          <td className="px-5 py-3 align-middle">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              invite.state === 'active' ? 'border-green-500/30 bg-green-500/10 text-green-700' :
                              invite.state === 'accepted' ? 'border-blue-500/30 bg-blue-500/10 text-blue-700' :
                              'border-border bg-muted text-muted-foreground'
                            }`}>
                              {formatInviteState(invite.state)}
                            </span>
                          </td>
                          <td className="px-5 py-3 align-middle font-medium">{invite.humanRole ?? "—"}</td>
                          <td className="px-5 py-3 align-middle">
                            <div className="font-medium text-foreground">{invite.invitedByUser?.name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{invite.invitedByUser?.email}</div>
                          </td>
                          <td className="px-5 py-3 align-middle text-muted-foreground text-xs">
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-right align-middle">
                            {invite.state === "active" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => revokeMutation.mutate(invite.id)}
                                disabled={revokeMutation.isPending}
                              >
                                Revoke
                              </Button>
                            ) : invite.relatedJoinRequestId ? (
                              <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                                <Link to="/inbox/requests">
                                  Review
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invitesQuery.hasNextPage ? (
                  <div className="flex justify-center border-t border-border px-5 py-4 bg-muted/10">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => invitesQuery.fetchNextPage()}
                      disabled={invitesQuery.isFetchingNextPage}
                    >
                      {invitesQuery.isFetchingNextPage ? "Loading more…" : "View more"}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatInviteState(state: "active" | "accepted" | "expired" | "revoked") {
  return state.charAt(0).toUpperCase() + state.slice(1);
}
