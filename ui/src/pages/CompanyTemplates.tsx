import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Edit2, Trash2, LayoutTemplate,
  Zap, FileText, Bug, Lightbulb, Terminal, CheckSquare, Code, PenTool, Sparkles, Wand2
} from "lucide-react";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToastActions } from "../context/ToastContext";
import { issueTemplatesApi } from "../api/issue-templates";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field } from "../components/agent-config-primitives";
import type { IssueTemplate } from "@paperclipai/shared";
import { useI18n } from "@/context/I18nContext";

const ICON_MAP: Record<string, React.ElementType> = {
  zap: Zap,
  "file-text": FileText,
  bug: Bug,
  lightbulb: Lightbulb,
  terminal: Terminal,
  "check-square": CheckSquare,
  code: Code,
  "pen-tool": PenTool,
  sparkles: Sparkles,
  wand: Wand2,
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export function CompanyTemplates() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToastActions();
  const queryClient = useQueryClient();
  const { t } = useI18n();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<IssueTemplate | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [icon, setIcon] = useState<string>("zap");

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? "Company", href: "/dashboard" },
      { label: "Issue Templates" },
    ]);
  }, [setBreadcrumbs, selectedCompany?.name]);

  const { data: templates, isLoading } = useQuery({
    queryKey: queryKeys.issueTemplates.list(selectedCompanyId!),
    queryFn: () => issueTemplatesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      issueTemplatesApi.create(selectedCompanyId!, {
        name,
        description: description || null,
        issueTitle: issueTitle || null,
        issueDescription,
        icon: icon || "zap",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueTemplates.list(selectedCompanyId!) });
      setIsDialogOpen(false);
      pushToast({ title: "Template created", tone: "success" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      issueTemplatesApi.update(selectedCompanyId!, editingTemplate!.id, {
        name,
        description: description || null,
        issueTitle: issueTitle || null,
        issueDescription,
        icon: icon || "zap",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueTemplates.list(selectedCompanyId!) });
      setIsDialogOpen(false);
      pushToast({ title: "Template updated", tone: "success" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => issueTemplatesApi.delete(selectedCompanyId!, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issueTemplates.list(selectedCompanyId!) });
      pushToast({ title: "Template deleted", tone: "success" });
    },
  });

  function openCreateDialog() {
    setEditingTemplate(null);
    setName("");
    setDescription("");
    setIssueTitle("");
    setIssueDescription("");
    setIcon("zap");
    setIsDialogOpen(true);
  }

  function openEditDialog(template: IssueTemplate) {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description ?? "");
    setIssueTitle(template.issueTitle ?? "");
    setIssueDescription(template.issueDescription);
    setIcon(template.icon ?? "zap");
    setIsDialogOpen(true);
  }

  function handleSave() {
    if (editingTemplate) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  }

  if (!selectedCompany) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground animate-in fade-in">
        No company selected.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("templates.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("templates.subtitle")}
          </p>
        </div>
        <Button onClick={openCreateDialog} className="shadow-sm shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
          <Plus className="mr-2 h-4 w-4" />
          {t("templates.newTemplate")}
        </Button>
      </div>

      {/* Tutorial Banner */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-sm animate-in fade-in zoom-in-95 duration-500 delay-150">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-background/50 text-primary shadow-sm ring-1 ring-primary/20 backdrop-blur-sm">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold tracking-tight text-foreground">{t("templates.howItWorksTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {t("templates.howItWorksDesc")}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[220px] rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : templates?.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-muted/5 to-transparent p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">{t("templates.noTemplatesTitle")}</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground leading-relaxed">
            {t("templates.noTemplatesDesc")}
          </p>
          <Button onClick={openCreateDialog} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
            <Plus className="mr-2 h-4 w-4" />
            {t("templates.createFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {templates?.map((tpl) => {
            const IconComp = tpl.icon && ICON_MAP[tpl.icon] ? ICON_MAP[tpl.icon] : LayoutTemplate;
            return (
              <div 
                key={tpl.id} 
                className="group relative flex flex-col justify-between h-[240px] overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all duration-500 group-hover:bg-primary/15" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                    <IconComp className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground tracking-tight line-clamp-1">{tpl.name}</h3>
                  {tpl.description ? (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {tpl.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground/50 italic min-h-[2.5rem]">
                      {t("templates.noDescription")}
                    </p>
                  )}
                </div>
                
                <div className="relative z-10 mt-6 flex items-center gap-2 border-t border-border/50 pt-4">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="w-full justify-center h-8 transition-colors group-hover:bg-secondary/80" 
                    onClick={() => openEditDialog(tpl)}
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    {t("templates.edit")}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-8 w-8 shrink-0 text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive" 
                    onClick={() => {
                      if (confirm(`${t("templates.deleteConfirm")} "${tpl.name}"?`)) {
                        deleteMutation.mutate(tpl.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden border-border/60 shadow-2xl">
          <div className="p-6 pb-4 border-b border-border/40 bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingTemplate ? "Edit Template" : "New Template"}
              </DialogTitle>
              <DialogDescription>
                Configure the defaults that will be populated when this template is selected.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Identity Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Template Identity</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Template Name" hint="Short name shown on the button (e.g. Code Review)">
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Review Code"
                    autoFocus
                  />
                </Field>
                <Field label="Description" hint="Optional hint text shown on the card">
                  <input
                    type="text"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Standard PR review..."
                  />
                </Field>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-sm font-medium">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ICONS.map((iconKey) => {
                    const IconComp = ICON_MAP[iconKey];
                    const isSelected = icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setIcon(iconKey)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 ${
                          isSelected 
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 scale-105" 
                            : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
                        }`}
                        title={iconKey}
                      >
                        <IconComp className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="h-px w-full bg-border/40" />

            {/* Content Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Issue Content Defaults</h4>
              <Field label="Default Title" hint="Auto-fills the issue title.">
                <input
                  type="text"
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="Review PR #"
                />
              </Field>

              <Field label="Default Description" hint="The main prompt instructions that the agent will receive.">
                <textarea
                  className="min-h-[200px] w-full resize-y rounded-md border border-border bg-transparent px-3 py-3 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50 font-mono text-[13px]"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Please review the code in..."
                />
              </Field>
            </div>
          </div>
          
          <div className="p-6 pt-4 border-t border-border/40 bg-muted/10">
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={createMutation.isPending || updateMutation.isPending || !name || !issueDescription}
                className="shadow-sm min-w-[120px]"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                ) : null}
                {editingTemplate ? "Save changes" : "Create template"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

