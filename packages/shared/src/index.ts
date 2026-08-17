/** 统一 API 成功响应 */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** 统一 API 错误响应 */
export interface ApiFailure {
  ok: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** 健康检查响应 */
export interface HealthData {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

/** 通用错误码 */
export const ErrorCodes = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CODE: 'INVALID_CODE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  RATE_LIMITED: 'RATE_LIMITED',
  WECHAT_AUTH_FAILED: 'WECHAT_AUTH_FAILED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  ORDER_INVALID_STATE: 'ORDER_INVALID_STATE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/** 用户信息 */
export interface User {
  userId: string;
  phone: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

/** JWT 令牌对 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** 登录响应 */
export interface LoginResponse {
  tokens: AuthTokens;
  user: User;
}

/** 发送验证码响应 */
export interface SendSmsResponse {
  expiresIn: number;
}

/** 帖子作者摘要 */
export interface PostAuthor {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
}

/** Feed 列表项 */
export interface FeedItem {
  postId: string;
  title: string;
  coverUrl: string;
  coverWidth: number | null;
  coverHeight: number | null;
  likeCount: number;
  favoriteCount: number;
  minPrice: number | null;
  author: PostAuthor;
  isLiked: boolean;
  isFavorited: boolean;
  createdAt: string;
}

/** Feed 分页响应 */
export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

/** 帖子媒体 */
export interface PostMedia {
  mediaId: string;
  url: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

/** 帖子关联商品 */
export interface PostProduct {
  productId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
}

/** 帖子详情 */
export interface PostDetail {
  postId: string;
  title: string;
  content: string | null;
  coverUrl: string;
  coverWidth: number | null;
  coverHeight: number | null;
  tags: string[];
  likeCount: number;
  favoriteCount: number;
  viewCount: number;
  author: PostAuthor;
  isLiked: boolean;
  isFavorited: boolean;
  createdAt: string;
  media: PostMedia[];
  products: PostProduct[];
}

/** 点赞/收藏操作响应 */
export interface InteractionResult {
  isLiked?: boolean;
  isFavorited?: boolean;
  likeCount?: number;
  favoriteCount?: number;
}

/** 小程序分享元数据 */
export interface PostShareMeta {
  postId: string;
  title: string;
  image: string;
  /** 小程序页面路径，如 /pages/post-detail/index?postId=xxx */
  path: string;
}

/** 商品详情 */
export interface ProductDetail {
  productId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  price: number;
  originalPrice: number | null;
  stock: number;
  status: string;
  createdAt: string;
}

/** 购物车项 */
export interface CartItem {
  itemId: string;
  productId: string;
  quantity: number;
  product: Pick<ProductDetail, 'productId' | 'name' | 'coverUrl' | 'price' | 'originalPrice' | 'stock' | 'status'>;
  subtotal: number;
  createdAt: string;
}

/** 购物车 */
export interface Cart {
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
}

/** 订单状态 */
export type OrderStatus = 'pending' | 'paid' | 'cancelled';

/** 订单项 */
export interface OrderItem {
  itemId: string;
  productId: string;
  productName: string;
  productCoverUrl: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

/** 订单摘要 */
export interface OrderSummary {
  orderId: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
}

/** 订单详情 */
export interface OrderDetail extends OrderSummary {
  items: OrderItem[];
}

/** 订单列表 */
export interface OrderListPage {
  items: OrderSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** 创建订单请求 */
export interface CreateOrderInput {
  fromCart?: boolean;
  items?: Array<{ productId: string; quantity: number }>;
}

/** 活动页 Schema */
export interface CampaignPageData {
  title: string;
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
  };
  blocks: Array<Record<string, unknown>>;
}

/** 已发布活动响应 */
export interface PublishedCampaign {
  campaignId: string;
  slug: string;
  title: string;
  versionId: string;
  versionNumber: number;
  schema: CampaignPageData;
  publishedAt: string | null;
}

/** 活动版本 */
export interface CampaignVersion {
  versionId: string;
  campaignId: string;
  versionNumber: number;
  schema: CampaignPageData;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

/** 活动摘要 */
export interface CampaignSummary {
  campaignId: string;
  slug: string;
  title: string;
  status: string;
  publishedVersionId: string | null;
  canaryVersionId: string | null;
  rolloutPercent: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建活动响应 */
export interface CreateCampaignResponse {
  campaignId: string;
  slug: string;
  title: string;
  status: string;
  publishedVersionId: string | null;
  canaryVersionId: string | null;
  rolloutPercent: number;
  createdAt: string;
  updatedAt: string;
  latestVersion: CampaignVersion;
}

/** 活动版本列表 */
export interface CampaignVersionsResponse {
  campaign: CampaignSummary;
  versions: CampaignVersion[];
}

/** 搭建器加载的活动管理数据 */
export interface CampaignManageData {
  campaign: CampaignSummary;
  editingVersion: CampaignVersion | null;
}

/** 活动列表 */
export interface CampaignListResponse {
  items: CampaignSummary[];
}

export type {
  AnalyticsEventName,
  AnalyticsEventPayload,
  AnalyticsConfig,
  AnalyticsDashboard,
  AnalyticsDashboardDay,
  VitalsSummaryItem,
} from './analytics/types.js';

export { AnalyticsEvents } from './analytics/types.js';

export { FEATURED_CAMPAIGN_SLUG, getCampaignBannerCopy } from './campaign.js';
export {
  buildAuthRedirectUrl,
  consumeAuthTokensFromHash,
  isAllowedAuthRedirect,
} from './authRedirect.js';

export type {
  AiMessageRole,
  AiConversation,
  AiMessage,
  CreateAiConversationInput,
  AiChatInput,
  AiConversationListResponse,
  AiMessagesResponse,
  AiChatPersistEvent,
  AiChatEvent,
} from './ai/types.js';

