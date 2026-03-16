export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export type TemplateStatus = 'draft' | 'published';
export type ResourceVisibility = 'private' | 'public';
export type ResourceOwnerType = 'user' | 'team';

export interface RouteConfigDTO {
  routePath?: string;
  routeName?: string;
  pageTitle?: string;
  menuTitle?: string;
  useLayout?: boolean;
}

export interface PageTemplateBaseInfo {
  pageId: string;
  pageName: string;
  entityType?: 'page';
  status: TemplateStatus;
  currentVersion: number;
  ownerType?: ResourceOwnerType;
  ownerId?: string;
  ownerName?: string;
  ownerTeamId?: string;
  ownerTeamName?: string;
  visibility?: ResourceVisibility;
  screenSize?: string | number;
  autoWidth?: number;
  updatedAt?: string;
  routeConfig?: RouteConfigDTO;
}

export interface ComponentTemplateBaseInfo {
  pageId: string;
  pageName: string;
  entityType?: 'component';
  status: TemplateStatus;
  currentVersion: number;
  ownerType?: ResourceOwnerType;
  ownerId?: string;
  ownerName?: string;
  ownerTeamId?: string;
  ownerTeamName?: string;
  visibility?: ResourceVisibility;
  screenSize?: string | number;
  autoWidth?: number;
  updatedAt?: string;
}

export type PageBaseInfo = PageTemplateBaseInfo | ComponentTemplateBaseInfo;

export interface RouteTemplateContent {
  routeId: string;
  routeConfig: RouteConfigDTO;
  uiTree: Record<string, unknown>;
  flowNodes: Array<Record<string, unknown>>;
  flowEdges: Array<Record<string, unknown>>;
  selectedLayoutTemplateId?: string | null;
}

export interface CommonTemplatePageConfig {
  screenSize?: string | number;
  autoWidth?: number;
  selectedLayoutTemplateId?: string | null;
  [key: string]: unknown;
}

export interface PageTemplatePageConfig extends CommonTemplatePageConfig {
  routeConfig?: RouteConfigDTO;
  activeRouteOutletKey?: string;
  sharedUiTree?: Record<string, unknown>;
  sharedUiChildren?: Array<Record<string, unknown>>;
  sharedFlowNodes?: Array<Record<string, unknown>>;
  sharedFlowEdges?: Array<Record<string, unknown>>;
}

export interface PageTemplateContent {
  uiTree: Record<string, unknown>;
  flowNodes: Array<Record<string, unknown>>;
  flowEdges: Array<Record<string, unknown>>;
  routes?: RouteTemplateContent[];
  pageConfig: PageTemplatePageConfig;
}

export interface ComponentTemplateContent {
  uiTree: Record<string, unknown>;
  flowNodes: Array<Record<string, unknown>>;
  flowEdges: Array<Record<string, unknown>>;
  routes?: RouteTemplateContent[];
  pageConfig: CommonTemplatePageConfig;
}

export interface SavePageDraftPayload {
  base: Omit<PageTemplateBaseInfo, 'status' | 'currentVersion' | 'updatedAt'>;
  template: PageTemplateContent;
}

export interface UpdatePageDraftPayload extends SavePageDraftPayload {}

export interface SaveComponentDraftPayload {
  base: Omit<ComponentTemplateBaseInfo, 'status' | 'currentVersion' | 'updatedAt'>;
  template: ComponentTemplateContent;
}

export interface UpdateComponentDraftPayload extends SaveComponentDraftPayload {}

export interface PageDetail {
  base: PageTemplateBaseInfo;
  template: PageTemplateContent;
}

export interface ComponentDetail {
  base: ComponentTemplateBaseInfo;
  template: ComponentTemplateContent;
}

export interface PublishPagePayload {
  pageId: string;
  versionNote?: string;
}

export interface PublishComponentPayload {
  pageId: string;
  versionNote?: string;
}

export interface UpdateTemplateVisibilityPayload {
  pageId: string;
  visibility: ResourceVisibility;
}

export interface WithdrawTemplatePayload {
  pageId: string;
  versionNote?: string;
}

export type PageTemplateListParams = {
  pageName?: string;
  status?: TemplateStatus;
  routePath?: string;
  mine?: boolean;
  ownerType?: ResourceOwnerType;
  ownerTeamId?: string;
  ownerId?: string;
  visibility?: ResourceVisibility;
  page?: number;
  pageSize?: number;
};

export type ComponentTemplateListParams = {
  pageName?: string;
  status?: TemplateStatus;
  mine?: boolean;
  ownerType?: ResourceOwnerType;
  ownerTeamId?: string;
  ownerId?: string;
  visibility?: ResourceVisibility;
  page?: number;
  pageSize?: number;
};
