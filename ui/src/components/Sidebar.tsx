import {
  Inbox,
  CircleDot,
  Target,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Boxes,
  Repeat,
  GitBranch,
  Settings,
  FileText,
  LayoutTemplate,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarAgents } from "./SidebarAgents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { heartbeatsApi } from "../api/heartbeats";
import { instanceSettingsApi } from "../api/instanceSettings";
import { queryKeys } from "../lib/queryKeys";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { Button } from "@/components/ui/button";
import { PluginSlotOutlet } from "@/plugins/slots";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";
import { useI18n } from "@/context/I18nContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Sidebar() {
  const { openNewIssue } = useDialog();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { t } = useI18n();
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });
  const liveRunCount = liveRuns?.length ?? 0;
  const showWorkspacesLink = experimentalSettings?.enableIsolatedWorkspaces === true;

  function openSearch() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside className="saturn-surface flex h-full min-h-0 w-60 flex-col rounded-none border-r border-sidebar-border bg-sidebar">
      {/* Top bar: Company name (bold) + Search — aligned with top sections (no visible border) */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-sidebar-border px-3">
        <SidebarCompanyMenu />
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 rounded-2xl text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={openSearch}
          title={t("common.search")}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <nav className="scrollbar-auto-hide flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
        <div className="flex flex-col gap-0.5">
          {/* New Issue button aligned with nav items */}
          <button
            onClick={() => openNewIssue()}
            className="flex items-center gap-2.5 rounded-2xl border border-transparent bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/92"
          >
            <SquarePen className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("sidebar.newIssue")}</span>
          </button>
          <SidebarNavItem to="/dashboard" label={t("sidebar.dashboard")} icon={LayoutDashboard} liveCount={liveRunCount} />
          <SidebarNavItem
            to="/inbox"
            label={t("sidebar.inbox")}
            icon={Inbox}
            badge={inboxBadge.inbox}
            badgeTone={inboxBadge.failedRuns > 0 ? "danger" : "default"}
            alert={inboxBadge.failedRuns > 0}
          />
          <PluginSlotOutlet
            slotTypes={["sidebar"]}
            context={pluginContext}
            className="flex flex-col gap-0.5"
            itemClassName="text-[13px] font-medium"
            missingBehavior="placeholder"
          />
        </div>

        <SidebarSection label={t("sidebar.work")}>
          <SidebarNavItem to="/content" label={t("sidebar.content")} icon={FileText} />
          <SidebarNavItem to="/issues" label={t("sidebar.issues")} icon={CircleDot} />
          <SidebarNavItem to="/routines" label={t("sidebar.routines")} icon={Repeat} />
          <SidebarNavItem to="/goals" label={t("sidebar.goals")} icon={Target} />
          {showWorkspacesLink ? (
            <SidebarNavItem to="/workspaces" label={t("sidebar.workspaces")} icon={GitBranch} />
          ) : null}
        </SidebarSection>

        <SidebarProjects />

        <SidebarAgents />

        <SidebarSection label={t("sidebar.company")}>
          <SidebarNavItem to="/org" label={t("sidebar.org")} icon={Network} />
          <SidebarNavItem to="/skills" label={t("sidebar.skills")} icon={Boxes} />
          <SidebarNavItem to="/costs" label={t("sidebar.costs")} icon={DollarSign} />
          <SidebarNavItem to="/activity" label={t("sidebar.activity")} icon={History} />
          <SidebarNavItem to="/company/settings" label={t("sidebar.settings")} icon={Settings} />
          <SidebarNavItem to="/company/templates" label={t("sidebar.templates")} icon={LayoutTemplate} />
        </SidebarSection>

        <PluginSlotOutlet
          slotTypes={["sidebarPanel"]}
          context={pluginContext}
          className="flex flex-col gap-3"
          itemClassName="rounded-lg border border-border p-3"
          missingBehavior="placeholder"
        />
      </nav>

      {/* Footer Area for Language Switcher */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
