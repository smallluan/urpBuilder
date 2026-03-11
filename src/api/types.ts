export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PageBaseInfo {
  pageId: string;
  pageName: string;
  status: 'draft' | 'published';
  currentVersion: number;
  screenSize?: string | number;
  autoWidth?: number;
  updatedAt?: string;
}

export interface PageTemplateContent {
  uiTree: Record<string, unknown>;
  flowNodes: Array<Record<string, unknown>>;
  flowEdges: Array<Record<string, unknown>>;
  pageConfig: {
    screenSize?: string | number;
    autoWidth?: number;
    [key: string]: unknown;
  };
}

export interface SavePageDraftPayload {
  base: Omit<PageBaseInfo, 'status' | 'currentVersion' | 'updatedAt'>;
  template: PageTemplateContent;
}

export interface UpdatePageDraftPayload extends SavePageDraftPayload {}

export interface PageDetail {
  base: PageBaseInfo;
  template: PageTemplateContent;
}

export interface PublishPagePayload {
  pageId: string;
  versionNote?: string;
}
