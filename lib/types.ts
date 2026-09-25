// ─── Auth / User ──────────────────────────────────────────────────────
export type User = {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
  rooftopId?: string;
  tradeAccountId?: string;
  creditHold?: boolean;
  isOverdue?: boolean;
  isActive?: boolean;
};

export type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  expiresAt?: number;
  user?: User;
};

// ─── Dashboard ────────────────────────────────────────────────────────
export type GroupData = {
  networkOverview?: {
    totalRevenueCents?: number;
    totalOrders?: number;
    totalGstCents?: number;
  };
  fulfillmentPipeline?: Record<string, number>;
  accountsPortfolio?: {
    activeAccounts?: number;
    totalAccounts?: number;
    accountsOnCreditHold?: number;
    overdueAccounts?: number;
  };
  precinctBreakdown?: PrecinctBreakdownItem[];
  recentActivity?: ActivityEvent[];
};

export type PrecinctBreakdownItem = {
  rooftopId: string;
  name: string;
  code: string;
  suburb?: string;
  revenueCents?: number;
  orderCount?: number;
  activeExceptions?: number;
  openRfqs?: number;
};

export type ActivityEvent = {
  _id?: string;
  action?: string;
  createdAt?: string;
  userId?: string;
  rooftopId?: string;
  tradeAccountId?: string;
  metadata?: Record<string, unknown>;
};

// ─── Rooftops ─────────────────────────────────────────────────────────
export type Rooftop = {
  _id?: string;
  rooftopId: string;
  name: string;
  code: string;
  suburb?: string;
  state?: string;
  isActive?: boolean;
  oemBrandCodes?: string[];
  addresses?: string[];
  phone?: string;
};

export type Franchise = {
  franchiseId?: string;
  brandName?: string;
  brandCode?: string;
  rooftopId?: string;
  pentanaCode?: string;
  isActive?: boolean;
};

export type FeedHealth = {
  feedType?: string;
  brandCode?: string;
  rooftopId?: string;
  status?: "HEALTHY" | "STALE" | "ERROR" | string;
  lastSyncAt?: string;
  latencyMs?: number;
};

// ─── Orders ───────────────────────────────────────────────────────────
export type OrderLine = {
  lineId?: string;
  _id?: string;
  partNumber?: string;
  description?: string;
  quantity?: number;
  unitPriceCents?: number;
  totalCents?: number;
  state?: string;
  sourceKind?: string;
  sourceName?: string;
  sourceRooftopId?: string;
  binLocation?: string;
  eta?: string;
  isPicked?: boolean;
  pickedAt?: string;
  exceptionReason?: string;
  exceptionDescription?: string;
};

export type Order = {
  _id?: string;
  id?: string;
  orderNumber?: string;
  state?: string;
  totalCents?: number;
  gstCents?: number;
  tradeAccountId?: string;
  rooftopId?: string;
  customerReference?: string;
  promisedPickWindow?: string;
  deliveryType?: "COLLECT" | "DELIVERY" | string;
  createdAt?: string;
  updatedAt?: string;
  lines?: OrderLine[];
  hasExceptions?: boolean;
};

export type OrdersResponse = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  orders?: Order[];
  results?: Order[];
};

// ─── Parts ────────────────────────────────────────────────────────────
export type PartSource = {
  sourceKind?: "OEM" | "BRANCH" | "AFTERMARKET" | "GREY" | string;
  sourceName?: string;
  sourceRooftopId?: string;
  listPriceCents?: number;
  tradePriceCents?: number;
  coreChargeCents?: number;
  stockQty?: number;
  inStock?: boolean;
  eta?: string;
  binLocation?: string;
  preferred?: boolean;
  probeSuccess?: boolean;
  probeError?: string;
  resolvedAt?: string;
};

export type Part = {
  _id?: string;
  partNumber?: string;
  description?: string;
  brandCode?: string;
  category?: string;
  fitment?: string;
  vehicleFitment?: string[];
  sources?: PartSource[];
};

export type PartsSearchResponse = {
  total?: number;
  page?: number;
  limit?: number;
  results?: Part[];
};

export type ResolvePartResponse = {
  partNumber: string;
  brandCode?: string;
  rooftopId: string;
  accountId: string;
  cachedAt?: string;
  sources: PartSource[];
};

// ─── Accounts ─────────────────────────────────────────────────────────
export type TradeAccount = {
  _id?: string;
  accountId?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  homeRooftopId?: string;
  currentBalanceCents?: number;
  creditLimitCents?: number;
  creditHold?: boolean;
  isOverdue?: boolean;
  discountRate?: number;
  ytdSpendCents?: number;
  ytdOrderCount?: number;
  paymentTerms?: string;
};

// ─── PartsCheck ───────────────────────────────────────────────────────
export type PartsCheckSummary = {
  totalRfqs?: number;
  autoQuotedCount?: number;
  pendingReviewCount?: number;
  conversionRate?: number;
  onTimeQuoteRate?: number;
  wonOrderValueCents?: number;
};

export type RfqLine = {
  lineId?: string;
  partNumber?: string;
  description?: string;
  quantity?: number;
  requestedType?: string;
  state?: string;
  resolvedPriceCents?: number;
  tradePriceCents?: number;
  stockQty?: number;
  eta?: string;
};

export type Rfq = {
  _id?: string;
  rfqId?: string;
  repairerName?: string;
  buyerName?: string;
  repairerEmail?: string;
  buyerEmail?: string;
  rooftopId?: string;
  status?: string;
  state?: string;
  deadline?: string;
  slaDeadline?: string;
  isBuyerMapped?: boolean;
  mappedTradeAccountId?: string;
  totalCents?: number;
  createdAt?: string;
  lines?: RfqLine[];
  vehicle?: {
    vin?: string;
    rego?: string;
    make?: string;
    model?: string;
    year?: number;
  };
};

export type RfqInboxResponse = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  rfqs?: Rfq[];
  results?: Rfq[];
};

// ─── Audit ────────────────────────────────────────────────────────────
export type AuditEventRecord = {
  _id?: string;
  action?: string;
  userId?: string;
  orderId?: string;
  rooftopId?: string;
  tradeAccountId?: string;
  ipAddress?: string;
  ip?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};

export type AuditResponse = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  events?: AuditEventRecord[];
};
