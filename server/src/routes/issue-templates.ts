import { Router, type Request } from "express";
import { eq, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { issueTemplates } from "@paperclipai/db";
import {
  createIssueTemplateBodySchema,
  updateIssueTemplateBodySchema,
} from "@paperclipai/shared";
import { assertCompanyAccess } from "./authz.js";

export function issueTemplateRoutes(db: Db) {
  const router = Router({ mergeParams: true });

  // GET /api/companies/:companyId/issue-templates
  router.get("/", async (req: Request, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

  const templates = await db
    .select()
    .from(issueTemplates)
    .where(eq(issueTemplates.companyId, companyId))
    .orderBy(issueTemplates.createdAt);

  res.json(templates);
});

  // POST /api/companies/:companyId/issue-templates
  router.post("/", async (req: Request, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const parsed = createIssueTemplateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid template body" });
  }

  const data = parsed.data;

  const [template] = await db
    .insert(issueTemplates)
    .values({
      companyId,
      name: data.name,
      description: data.description ?? null,
      issueTitle: data.issueTitle ?? null,
      issueDescription: data.issueDescription,
      icon: data.icon ?? null,
    })
    .returning();

  res.json(template);
});

  // PUT /api/companies/:companyId/issue-templates/:templateId
  router.put("/:templateId", async (req: Request, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const templateId = req.params.templateId as string;

  const parsed = updateIssueTemplateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid template body" });
  }

  const [updated] = await db
    .update(issueTemplates)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(and(eq(issueTemplates.id, templateId), eq(issueTemplates.companyId, companyId)))
    .returning();

  if (!updated) {
    return res.status(404).json({ error: "Template not found" });
  }

  res.json(updated);
});

  // DELETE /api/companies/:companyId/issue-templates/:templateId
  router.delete("/:templateId", async (req: Request, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const templateId = req.params.templateId as string;

  const [deleted] = await db
    .delete(issueTemplates)
    .where(and(eq(issueTemplates.id, templateId), eq(issueTemplates.companyId, companyId)))
    .returning();

  if (!deleted) {
    return res.status(404).json({ error: "Template not found" });
  }

    res.status(204).send();
  });

  return router;
}
