export type Role = 'SUPER_ADMIN' | 'TENANT_ADMIN';

export type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export type MessageStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface MetaCredential {
  id: string;
  tenantId: string;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  tenantId: string;
  metaTemplateId: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
  variablesCount: number;
  componentsJson: string;
  syncedAt: string;
}

export interface Contact {
  id: string;
  tenantId: string;
  campaignId: string | null;
  name: string;
  whatsapp: string;
  planValue: string;
  dueDate: string;
  invoiceCode: string;
  extraFieldsJson: string | null;
  createdAt: string;
}

export interface ContactUploadResponse {
  preview: Contact[];
  createdCount: number;
  contactIds: string[];
}

export interface Campaign {
  id: string;
  tenantId: string;
  templateId: string;
  name: string;
  status: CampaignStatus;
  messagesPerMinute: number;
  intervalSeconds: number;
  createdById: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  template?: { id: string; name: string };
  statusCounts?: Record<string, number>;
}

export interface CampaignMessage {
  id: string;
  campaignId: string;
  contactId: string;
  status: MessageStatus;
  metaMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  contact: { id: string; name: string; whatsapp: string };
}

export interface PaginatedMessages {
  data: CampaignMessage[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  createdAt: string;
  tenant?: Tenant | null;
}
