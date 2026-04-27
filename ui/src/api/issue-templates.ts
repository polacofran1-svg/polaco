import type {
  CreateIssueTemplateBody,
  IssueTemplate,
  UpdateIssueTemplateBody,
} from "@paperclipai/shared";
import { api } from "./client";

export const issueTemplatesApi = {
  list: async (companyId: string): Promise<IssueTemplate[]> => {
    return api.get(`/companies/${companyId}/issue-templates`);
  },

  create: async (companyId: string, data: CreateIssueTemplateBody): Promise<IssueTemplate> => {
    return api.post(`/companies/${companyId}/issue-templates`, data);
  },

  update: async (
    companyId: string,
    templateId: string,
    data: UpdateIssueTemplateBody
  ): Promise<IssueTemplate> => {
    return api.put(`/companies/${companyId}/issue-templates/${templateId}`, data);
  },

  delete: async (companyId: string, templateId: string): Promise<void> => {
    return api.delete(`/companies/${companyId}/issue-templates/${templateId}`);
  },
};
