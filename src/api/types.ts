export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export type TemplateStatus = 'draft' | 'published';
export type ResourceVisibility = 'private' | 'public';
export type ResourceOwnerType = 'user' | 'team';

export interface ResourceContributor {
  userId: string;
  username: string;
  nickname?: string;
  avatar?: string;
  role?: string;
  contributionCount?: number;
  lastActiveAt?: string;
}

export interface ResourceTeamSummary {
  id?: string;
  name?: string;
  description?: string;
  avatar?: string;
  memberCount?: number;
}

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
  description?: string;
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
  contributors?: ResourceContributor[];
  teamSummary?: ResourceTeamSummary;
}

export interface ComponentTemplateBaseInfo {
  pageId: string;
  pageName: string;
  description?: string;
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
  contributors?: ResourceContributor[];
  teamSummary?: ResourceTeamSummary;
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
  /**
   * 2 = uiTree 节点 props 为脱水形态（仅键→原始值）；缺省/1 = 历史完整 schema（含 name、editType、payload）。
   * 由前端写入；后端透传即可。
   */
  propsStorageVersion?: number;
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

/** 发布时锁定的预览组件库；缺省由服务端视为 tdesign */
export type PublishedUiLibrary = 'tdesign' | 'antd';

export interface PublishPagePayload {
  pageId: string;
  versionNote?: string;
  /** 发布为 TDesign 或 Ant Design 物料体系，写入 template.pageConfig.previewUiLibrary */
  previewUiLibrary?: PublishedUiLibrary;
}

export interface PublishComponentPayload {
  pageId: string;
  versionNote?: string;
  /** 发布为 TDesign 或 Ant Design 物料体系，写入 template.pageConfig.previewUiLibrary */
  previewUiLibrary?: PublishedUiLibrary;
}

export interface UpdateTemplateVisibilityPayload {
  pageId: string;
  visibility: ResourceVisibility;
}

export interface WithdrawTemplatePayload {
  pageId: string;
  versionNote?: string;
}

export interface ComponentVersionedDetailOptions {
  version?: number | null;
}

export interface ComponentMetaBatchItem {
  componentId: string;
  usedVersion?: number;
}

export interface ComponentMetaBatchRequest {
  items: ComponentMetaBatchItem[];
}

export interface ComponentMetaBatchResultItem {
  componentId: string;
  pageName?: string;
  latestVersion?: number;
  usedVersion?: number;
  upgradeAvailable?: boolean;
  accessible: boolean;
  deleted: boolean;
}

export interface ComponentMetaBatchResult {
  list: ComponentMetaBatchResultItem[];
}

/** 与 GET /page-template/{componentId}/versions?entityType=component 的 list 项一致 */
export interface ComponentVersionListItem {
  version: number;
  status: 'published';
  publishedAt?: string;
  createdAt?: string;
  versionNote?: string | null;
}

export interface ComponentVersionListResult {
  list: ComponentVersionListItem[];
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

/** 素材归属：个人与团队严格隔离，接口路径不同 */
export type MediaAssetScope = 'personal' | 'team';

/** 素材类型，与后端 AssetDTO.type 对齐 */
export type TeamAssetKind = 'image' | 'icon' | 'other';

export interface TeamAssetCreatorSummary {
  userId?: string;
  username?: string;
}

/** 素材条目（个人库无 teamId；团队库必有 teamId） */
export interface TeamAssetDTO {
  id: string;
  /** 团队素材时有值；个人素材通常省略 */
  teamId?: string;
  name: string;
  type: TeamAssetKind;
  mimeType: string;
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: TeamAssetCreatorSummary | null;
}

export interface TeamAssetListResult {
  list: TeamAssetDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TeamAssetListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  type?: TeamAssetKind | '';
}

export interface TeamAssetPatchPayload {
  name?: string;
  type?: TeamAssetKind;
}

// ===================== 素材节点 API（文件夹 + 文件统一模型） =====================

/** 节点类型 */
export type MediaNodeKind = 'folder' | 'file';

/** 素材节点归属 */
export type MediaNodeScope = 'personal' | 'team';

/** 素材节点 DTO（统一节点模型） */
export interface MediaNodeDTO {
  id: string;
  kind: MediaNodeKind;
  parentId: string | null;
  name: string;
  /** 文件夹特有 */
  childCount?: number;
  hasChildren?: boolean;
  /** 文件特有 */
  type?: TeamAssetKind;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  createdBy?: TeamAssetCreatorSummary | null;
  createdAt: string;
  updatedAt: string;
  teamId?: string | null;
}

/** 分页结果 */
export interface MediaNodeListResult {
  list: MediaNodeDTO[];
  total: number;
  page: number;
  pageSize: number;
}

/** 获取子节点参数 */
export interface MediaNodeChildrenParams {
  parentId?: string | null;
  page?: number;
  pageSize?: number;
  keyword?: string;
}

/** 创建文件夹请求 */
export interface MediaNodeCreateFolderPayload {
  parentId?: string | null;
  name: string;
}

/** 更新节点请求 */
export interface MediaNodePatchPayload {
  name?: string;
  parentId?: string | null;
  type?: TeamAssetKind;
}

/** 搜索结果项（含面包屑路径） */
export interface MediaNodeSearchItem extends MediaNodeDTO {
  pathIds: (string | null)[];
  pathNames: string[];
}

/** 搜索结果分页 */
export interface MediaNodeSearchResult {
  list: MediaNodeSearchItem[];
  total: number;
  page: number;
  pageSize: number;
}
