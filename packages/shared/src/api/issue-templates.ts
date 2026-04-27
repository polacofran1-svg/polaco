import { z } from "zod";

export const issueTemplateSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().nullable(),
  issueTitle: z.string().nullable(),
  issueDescription: z.string(),
  icon: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IssueTemplate = z.infer<typeof issueTemplateSchema>;

export const createIssueTemplateBodySchema = issueTemplateSchema.pick({
  name: true,
  description: true,
  issueTitle: true,
  issueDescription: true,
  icon: true,
}).partial({
  description: true,
  issueTitle: true,
  icon: true,
});

export type CreateIssueTemplateBody = z.infer<typeof createIssueTemplateBodySchema>;

export const updateIssueTemplateBodySchema = createIssueTemplateBodySchema.partial();

export type UpdateIssueTemplateBody = z.infer<typeof updateIssueTemplateBodySchema>;
