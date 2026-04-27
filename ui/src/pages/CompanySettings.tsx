import { ChangeEvent, useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_FEEDBACK_DATA_SHARING_TERMS_VERSION } from "@paperclipai/shared";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToastActions } from "../context/ToastContext";
import { companiesApi } from "../api/companies";
import { accessApi } from "../api/access";
import { assetsApi } from "../api/assets";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Settings, Check, Download, Upload } from "lucide-react";
import { CompanyPatternIcon } from "../components/CompanyPatternIcon";
import {
  Field,
  ToggleField,
  HintIcon
} from "../components/agent-config-primitives";

type AgentSnippetInput = {
  onboardingTextUrl: string;
  connectionCandidates?: string[] | null;
  testResolutionUrl?: string | null;
};

const FEEDBACK_TERMS_URL = import.meta.env.VITE_FEEDBACK_TERMS_URL?.trim() || "https://paperclip.ing/tos";

export function CompanySettings() {
  const {
    companies,
    selectedCompany,
    selectedCompanyId,
    setSelectedCompanyId
  } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToastActions();
  const queryClient = useQueryClient();
  // General settings local state
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Sync local state from selected company
  useEffect(() => {
    if (!selectedCompany) return;
    setCompanyName(selectedCompany.name);
    setDescription(selectedCompany.description ?? "");
    setBrandColor(selectedCompany.brandColor ?? "");
    setLogoUrl(selectedCompany.logoUrl ?? "");
  }, [selectedCompany]);

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSnippet, setInviteSnippet] = useState<string | null>(null);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [snippetCopyDelightId, setSnippetCopyDelightId] = useState(0);

  const generalDirty =
    !!selectedCompany &&
    (companyName !== selectedCompany.name ||
      description !== (selectedCompany.description ?? "") ||
      brandColor !== (selectedCompany.brandColor ?? ""));

  const generalMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description: string | null;
      brandColor: string | null;
    }) => companiesApi.update(selectedCompanyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    }
  });

  const settingsMutation = useMutation({
    mutationFn: (requireApproval: boolean) =>
      companiesApi.update(selectedCompanyId!, {
        requireBoardApprovalForNewAgents: requireApproval
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    }
  });

  const feedbackSharingMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      companiesApi.update(selectedCompanyId!, {
        feedbackDataSharingEnabled: enabled,
      }),
    onSuccess: (_company, enabled) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      pushToast({
        title: enabled ? "Feedback sharing enabled" : "Feedback sharing disabled",
        tone: "success",
      });
    },
    onError: (err) => {
      pushToast({
        title: "Failed to update feedback sharing",
        body: err instanceof Error ? err.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      accessApi.createOpenClawInvitePrompt(selectedCompanyId!),
    onSuccess: async (invite) => {
      setInviteError(null);
      const base = window.location.origin.replace(/\/+$/, "");
      const onboardingTextLink =
        invite.onboardingTextUrl ??
        invite.onboardingTextPath ??
        `/api/invites/${invite.token}/onboarding.txt`;
      const absoluteUrl = onboardingTextLink.startsWith("http")
        ? onboardingTextLink
        : `${base}${onboardingTextLink}`;
      setSnippetCopied(false);
      setSnippetCopyDelightId(0);
      let snippet: string;
      try {
        const manifest = await accessApi.getInviteOnboarding(invite.token);
        snippet = buildAgentSnippet({
          onboardingTextUrl: absoluteUrl,
          connectionCandidates:
            manifest.onboarding.connectivity?.connectionCandidates ?? null,
          testResolutionUrl:
            manifest.onboarding.connectivity?.testResolutionEndpoint?.url ??
            null
        });
      } catch {
        snippet = buildAgentSnippet({
          onboardingTextUrl: absoluteUrl,
          connectionCandidates: null,
          testResolutionUrl: null
        });
      }
      setInviteSnippet(snippet);
      try {
        await navigator.clipboard.writeText(snippet);
        setSnippetCopied(true);
        setSnippetCopyDelightId((prev) => prev + 1);
        setTimeout(() => setSnippetCopied(false), 2000);
      } catch {
        /* clipboard may not be available */
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.sidebarBadges(selectedCompanyId!)
      });
    },
    onError: (err) => {
      setInviteError(
        err instanceof Error ? err.message : "Failed to create invite"
      );
    }
  });

  const syncLogoState = (nextLogoUrl: string | null) => {
    setLogoUrl(nextLogoUrl ?? "");
    void queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
  };

  const logoUploadMutation = useMutation({
    mutationFn: (file: File) =>
      assetsApi
        .uploadCompanyLogo(selectedCompanyId!, file)
        .then((asset) => companiesApi.update(selectedCompanyId!, { logoAssetId: asset.assetId })),
    onSuccess: (company) => {
      syncLogoState(company.logoUrl);
      setLogoUploadError(null);
    }
  });

  const clearLogoMutation = useMutation({
    mutationFn: () => companiesApi.update(selectedCompanyId!, { logoAssetId: null }),
    onSuccess: (company) => {
      setLogoUploadError(null);
      syncLogoState(company.logoUrl);
    }
  });

  function handleLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;
    setLogoUploadError(null);
    logoUploadMutation.mutate(file);
  }

  function handleClearLogo() {
    clearLogoMutation.mutate();
  }

  useEffect(() => {
    setInviteError(null);
    setInviteSnippet(null);
    setSnippetCopied(false);
    setSnippetCopyDelightId(0);
  }, [selectedCompanyId]);

  const archiveMutation = useMutation({
    mutationFn: ({
      companyId,
      nextCompanyId
    }: {
      companyId: string;
      nextCompanyId: string | null;
    }) => companiesApi.archive(companyId).then(() => ({ nextCompanyId })),
    onSuccess: async ({ nextCompanyId }) => {
      if (nextCompanyId) {
        setSelectedCompanyId(nextCompanyId);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.all
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.companies.stats
      });
    }
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Settings" }
    ]);
  }, [setBreadcrumbs, selectedCompany?.name]);

  if (!selectedCompany) {
    return (
      <div className="text-sm text-muted-foreground">
        No company selected. Select a company from the switcher above.
      </div>
    );
  }

  function handleSaveGeneral() {
    generalMutation.mutate({
      name: companyName.trim(),
      description: description.trim() || null,
      brandColor: brandColor || null
    });
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
          <Settings className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Company Settings</h1>
      </div>

      <div className="grid gap-12">
        {/* General */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">General</h3>
            <p className="text-sm text-muted-foreground">
              Manage your company's identity and basic information.
            </p>
          </div>
          <div className="md:col-span-2 space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <Field label="Company name" hint="The display name for your company.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </Field>
            <Field label="Description" hint="Optional description shown in the company profile.">
              <input
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                type="text"
                value={description}
                placeholder="Optional company description"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="h-px w-full bg-border/40" />

        {/* Appearance */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Customize how your company looks across the platform.
            </p>
          </div>
          <div className="md:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="relative group overflow-hidden rounded-2xl ring-1 ring-border/50 shadow-sm transition-transform duration-300 hover:scale-105">
                  <CompanyPatternIcon
                    companyName={companyName || selectedCompany.name}
                    logoUrl={logoUrl || null}
                    brandColor={brandColor || null}
                    className="w-24 h-24"
                  />
                  {logoUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[10px] px-2 shadow-lg"
                        onClick={handleClearLogo}
                        disabled={clearLogoMutation.isPending}
                      >
                        {clearLogoMutation.isPending ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                  )}
                </div>
                {clearLogoMutation.isError && (
                  <span className="text-xs text-destructive text-center">
                    {clearLogoMutation.error.message}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-5 w-full">
                <Field
                  label="Logo Upload"
                  hint="Upload a PNG, JPEG, WEBP, GIF, or SVG logo image."
                >
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:px-3 file:py-1 file:text-xs file:font-medium hover:file:bg-primary/20 file:cursor-pointer"
                    />
                    {(logoUploadMutation.isError || logoUploadError) && (
                      <span className="text-xs text-destructive block">
                        {logoUploadError ??
                          (logoUploadMutation.error instanceof Error
                            ? logoUploadMutation.error.message
                            : "Logo upload failed")}
                      </span>
                    )}
                    {logoUploadMutation.isPending && (
                      <span className="text-xs text-primary animate-pulse block">Uploading logo...</span>
                    )}
                  </div>
                </Field>
                <Field
                  label="Brand Color"
                  hint="Sets the hue for the company icon. Leave empty for auto-generated color."
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={brandColor || "#6366f1"}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-1 transition-transform hover:scale-105"
                      />
                    </div>
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^#[0-9a-fA-F]{0,6}$/.test(v)) {
                          setBrandColor(v);
                        }
                      }}
                      placeholder="Auto"
                      className="w-28 rounded-md border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    />
                    {brandColor && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setBrandColor("")}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Save general & appearance button */}
        {generalDirty && (
          <div className="flex justify-end sticky bottom-6 z-10 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-border/50">
              <span className="text-sm text-muted-foreground px-2">You have unsaved changes</span>
              <Button
                onClick={handleSaveGeneral}
                disabled={generalMutation.isPending || !companyName.trim()}
                className="shadow-sm shadow-primary/20"
              >
                {generalMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
              {generalMutation.isError && (
                <span className="text-xs text-destructive absolute -top-6 right-4">
                  {generalMutation.error instanceof Error
                      ? generalMutation.error.message
                      : "Failed to save"}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="h-px w-full bg-border/40" />

        {/* Hiring */}
        <div className="grid gap-6 md:grid-cols-3" data-testid="company-settings-team-section">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Hiring & Security</h3>
            <p className="text-sm text-muted-foreground">
              Manage approval workflows for new agent hires.
            </p>
          </div>
          <div className="md:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <ToggleField
              label="Require board approval for new hires"
              hint="New agent hires stay pending until approved by board."
              checked={!!selectedCompany.requireBoardApprovalForNewAgents}
              onChange={(v) => settingsMutation.mutate(v)}
              toggleTestId="company-settings-team-approval-toggle"
            />
          </div>
        </div>

        <div className="h-px w-full bg-border/40" />

        {/* Feedback Sharing */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Feedback Sharing</h3>
            <p className="text-sm text-muted-foreground">
              Control data sharing preferences for AI output.
            </p>
          </div>
          <div className="md:col-span-2 space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <ToggleField
              label="Allow sharing voted AI outputs with Paperclip Labs"
              hint="Only AI-generated outputs you explicitly vote on are eligible for feedback sharing."
              checked={!!selectedCompany.feedbackDataSharingEnabled}
              onChange={(enabled) => feedbackSharingMutation.mutate(enabled)}
            />
            <div className="mt-4 rounded-lg bg-muted/30 p-4 border border-border/50">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Terms version:</span>
                  <span className="font-mono">{selectedCompany.feedbackDataSharingTermsVersion ?? DEFAULT_FEEDBACK_DATA_SHARING_TERMS_VERSION}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  {selectedCompany.feedbackDataSharingConsentAt ? (
                    <span className="text-foreground">
                      Enabled {new Date(selectedCompany.feedbackDataSharingConsentAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>Disabled</span>
                  )}
                </div>
              </div>
              {FEEDBACK_TERMS_URL && (
                <div className="mt-4 pt-3 border-t border-border/50 text-right">
                  <a
                    href={FEEDBACK_TERMS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline underline-offset-4"
                  >
                    Read our terms of service
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-border/40" />

        {/* Invites */}
        <div className="grid gap-6 md:grid-cols-3" data-testid="company-settings-invites-section">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Agent Invites</h3>
            <p className="text-sm text-muted-foreground">
              Generate invite prompts for new OpenClaw agents to join your workspace.
            </p>
          </div>
          <div className="md:col-span-2 space-y-5 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Generate OpenClaw agent invite snippet</span>
                <HintIcon text="Creates a short-lived OpenClaw agent invite and renders a copy-ready prompt." />
              </div>
              <Button
                data-testid="company-settings-invites-generate-button"
                size="sm"
                className="shadow-sm"
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Generating..." : "Generate Prompt"}
              </Button>
            </div>
            
            {inviteError && (
              <p className="text-sm text-destructive">{inviteError}</p>
            )}
            
            {inviteSnippet && (
              <div
                className="rounded-xl border border-border bg-muted/20 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                data-testid="company-settings-invites-snippet"
              >
                <div className="flex items-center justify-between border-b border-border/50 bg-muted/40 px-4 py-2.5">
                  <div className="text-xs font-medium text-foreground uppercase tracking-wide">
                    OpenClaw Invite Prompt
                  </div>
                  {snippetCopied ? (
                    <span
                      key={snippetCopyDelightId}
                      className="flex items-center gap-1.5 text-xs font-medium text-green-600 animate-in fade-in"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Copied to clipboard
                    </span>
                  ) : (
                    <Button
                      data-testid="company-settings-invites-copy-button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 hover:bg-muted"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteSnippet);
                          setSnippetCopied(true);
                          setSnippetCopyDelightId((prev) => prev + 1);
                          setTimeout(() => setSnippetCopied(false), 2000);
                        } catch {
                          // clipboard may not be available
                        }
                      }}
                    >
                      Copy snippet
                    </Button>
                  )}
                </div>
                <textarea
                  data-testid="company-settings-invites-snippet-textarea"
                  className="h-[24rem] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed outline-none custom-scrollbar"
                  value={inviteSnippet}
                  readOnly
                />
              </div>
            )}
          </div>
        </div>

        <div className="h-px w-full bg-border/40" />

        {/* Import / Export */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold tracking-tight">Company Packages</h3>
            <p className="text-sm text-muted-foreground">
              Migrate data using imports and exports.
            </p>
          </div>
          <div className="md:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <p className="text-sm text-muted-foreground mb-4">
              Import and export operations are now accessible from the{" "}
              <a href="/org" className="text-primary hover:underline underline-offset-4">Org Chart</a> header.
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" className="shadow-sm" asChild>
                <Link to="/company/export">
                  <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                  Export Data
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="shadow-sm" asChild>
                <Link to="/company/import">
                  <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
                  Import Data
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-border/40" />

        {/* Danger Zone */}
        <div className="grid gap-6 md:grid-cols-3 pb-8">
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-sm font-semibold text-destructive tracking-tight">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">
              Irreversible destructive actions.
            </p>
          </div>
          <div className="md:col-span-2 rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm transition-all hover:shadow-md hover:border-destructive/40">
            <h4 className="text-sm font-medium text-foreground mb-2">Archive Company</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Archive this company to hide it from the sidebar and lock it from further modifications. This persists in the database and cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                className="shadow-sm"
                disabled={
                  archiveMutation.isPending ||
                  selectedCompany.status === "archived"
                }
                onClick={() => {
                  if (!selectedCompanyId) return;
                  const confirmed = window.confirm(
                    `Are you absolutely sure you want to archive "${selectedCompany.name}"? It will be hidden from the sidebar and effectively locked.`
                  );
                  if (!confirmed) return;
                  const nextCompanyId =
                    companies.find(
                      (company) =>
                        company.id !== selectedCompanyId &&
                        company.status !== "archived"
                    )?.id ?? null;
                  archiveMutation.mutate({
                    companyId: selectedCompanyId,
                    nextCompanyId
                  });
                }}
              >
                {archiveMutation.isPending
                  ? "Archiving..."
                  : selectedCompany.status === "archived"
                  ? "Company is archived"
                  : "Archive this company"}
              </Button>
              {archiveMutation.isError && (
                <span className="text-sm text-destructive font-medium">
                  {archiveMutation.error instanceof Error
                    ? archiveMutation.error.message
                    : "Failed to archive company"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAgentSnippet(input: AgentSnippetInput) {
  const candidateUrls = buildCandidateOnboardingUrls(input);
  const resolutionTestUrl = buildResolutionTestUrl(input);

  const candidateList =
    candidateUrls.length > 0
      ? candidateUrls.map((u) => `- ${u}`).join("\n")
      : "- (No candidate URLs available yet.)";

  const connectivityBlock =
    candidateUrls.length === 0
      ? `No candidate URLs are available. Ask your user to configure a reachable hostname in Paperclip, then retry.
Suggested steps:
- choose a hostname that resolves to the Paperclip host from your runtime
- run: pnpm paperclipai allowed-hostname <host>
- restart Paperclip
- verify with: curl -fsS http://<host>:3100/api/health
- regenerate this invite snippet`
      : `If none are reachable, ask your user to add a reachable hostname in Paperclip, restart, and retry.
Suggested command:
- pnpm paperclipai allowed-hostname <host>
Then verify with: curl -fsS <base-url>/api/health`;

  const resolutionLine = resolutionTestUrl
    ? `\nYou MUST test Paperclip-to-gateway reachability, call: ${resolutionTestUrl}?url=<urlencoded-gateway-url> (using the hostname that worked above). Do not assume your 172.x is necessarily reachable from Paperclip. Test it. `
    : "";

  return `You're invited to join a Paperclip organization.

The URLs you should try are:
${candidateList}

Connectivity guidance:
If you are running on a different machine than Paperclip, Paperclip must be reachable at one of the hostnames used above.
Verify the hostname works from your runtime with: GET <base-url>/api/health

${connectivityBlock}

For your "agentName", just use your own agent name (OpenClaw or whatever your name is) and send it directly.
You also need to send a gateway URL that Paperclip can access. Check your config and include that URL.${resolutionLine}

---

This onboarding flow is for OpenClaw Gateway.
When you submit the join request, use:
- \`adapterType: "openclaw_gateway"\`
- \`agentDefaultsPayload.url\` as your \`ws://\` or \`wss://\` gateway URL
- \`agentDefaultsPayload.headers["x-openclaw-token"]\` with your gateway token
- (legacy accepted) \`agentDefaultsPayload.headers["x-openclaw-auth"]\`
- Keep device auth enabled (recommended). If \`devicePrivateKeyPem\` is omitted, Paperclip will generate and persist one during join so pairing approvals remain stable.
- Only use \`disableDeviceAuth=true\` for special environments where pairing cannot be completed.

Do NOT use \`/v1/responses\` or \`/hooks/*\` in this join flow.

Before you do anything, please respond to your user that you understand the instructions and you're going to work on them. Then do the step above in another session called "paperclip-onboarding" and then tell your user when you're done. Update your user in intermediate steps along the way so they know what's going on.

Then after you've connected to Paperclip (exchanged keys etc.) you MUST review and follow the onboarding instructions in onboarding.txt they give you.

`;
}

function buildCandidateOnboardingUrls(input: AgentSnippetInput): string[] {
  const candidates = (input.connectionCandidates ?? [])
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const urls = new Set<string>();
  let onboardingUrl: URL | null = null;

  try {
    onboardingUrl = new URL(input.onboardingTextUrl);
    urls.add(onboardingUrl.toString());
  } catch {
    const trimmed = input.onboardingTextUrl.trim();
    if (trimmed) {
      urls.add(trimmed);
    }
  }

  if (!onboardingUrl) {
    for (const candidate of candidates) {
      urls.add(candidate);
    }
    return Array.from(urls);
  }

  const onboardingPath = `${onboardingUrl.pathname}${onboardingUrl.search}`;
  for (const candidate of candidates) {
    try {
      const base = new URL(candidate);
      urls.add(`${base.origin}${onboardingPath}`);
    } catch {
      urls.add(candidate);
    }
  }

  return Array.from(urls);
}

function buildResolutionTestUrl(input: AgentSnippetInput): string | null {
  const explicit = input.testResolutionUrl?.trim();
  if (explicit) return explicit;

  try {
    const onboardingUrl = new URL(input.onboardingTextUrl);
    const testPath = onboardingUrl.pathname.replace(
      /\/onboarding\.txt$/,
      "/test-resolution"
    );
    return `${onboardingUrl.origin}${testPath}`;
  } catch {
    return null;
  }
}
