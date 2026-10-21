// Roles
export type Role =
  | 'trade_partner'
  | 'parts_controller'
  | 'store_manager'
  | 'group_admin'
  | 'csuites'
  | 'controller'
  | 'admin';

export const ROLES: Record<Role, { label: string; description: string }> = {
  trade_partner: { label: 'Trade Partner', description: 'Workshop / Fleet - search, order, track' },
  parts_controller: { label: 'Parts Controller', description: 'Counter staff - queue, pick, exceptions, PartsCheck RFQs' },
  store_manager: { label: 'Store Manager', description: 'Precinct manager - store dashboard, account controls, RFQs' },
  group_admin: { label: 'Group Administrator', description: 'Group ops - full access and rooftop management' },
  csuites: { label: 'C-Suite', description: 'Executive network dashboards and reporting' },
  controller: { label: 'Controller', description: 'Legacy internal controller alias' },
  admin: { label: 'Administrator', description: 'Legacy admin alias' },
};

export const isTradePartner = (role?: string) => role === 'trade_partner';
export const isPartsController = (role?: string) =>
  ['parts_controller', 'store_manager', 'controller'].includes(role || '');
export const isInternal = (role?: string) =>
  ['parts_controller', 'store_manager', 'group_admin', 'csuites', 'controller', 'admin'].includes(role || '');
export const isAdmin = (role?: string) =>
  ['group_admin', 'csuites', 'admin'].includes(role || '');
// ─── Auth / User ──────────────────────────────────────────────────────
export type User = {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  role?: Role | string;
  rooftopId?: string;
  tradeAccountId?: string;
  creditHold?: boolean;
  isOverdue?: boolean;
  isActive?: boolean;
  totpEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UsersResponse = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  users: User[];
};

export type LoginResponse = {
  expiresAt?: number;
  requiresTotp?: boolean;
  factorId?: string;
  user?: User;
};

// ─── Dashboard ────────────────────────────────────────────────────────
export type GroupData = {
  generatedAt?: string;
  networkOverview?: {
    totalRevenueCents?: number;
    totalSubtotalCents?: number;
    totalGstCents?: number;
    totalCoreChargeCents?: number;
    totalOrders?: number;
    currentYear?: number;
  };
  fulfillmentPipeline?: {
    submitted?: number;
    processing?: number;
    partiallyPicked?: number;
    picked?: number;
    readyForDelivery?: number;
    dispatched?: number;
    delivered?: number;
    activeExceptions?: number;
    cancelled?: number;
    activeInPipeline?: number;
  };
  accountsPortfolio?: {
    totalAccounts?: number;
    activeAccounts?: number;
    accountsOnCreditHold?: number;
    overdueAccounts?: number;
    totalOutstandingBalanceCents?: number;
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
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  isActive?: boolean;
  oemBrandCodes?: string[];
  addresses?: string[];
  phone?: string;
  pentanaSiteCode?: string;
  timezone?: string;
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
  deliveryMethod?: "COLLECTION" | "DELIVERY" | "COURIER" | string;
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
  id?: string;
  accountId?: string;
  companyName?: string;
  legalName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessPhone?: string;
  mobilePhone?: string;
  businessEmail?: string;
  statementEmail?: string;
  homeEmail?: string;
  abn?: string;
  homeRooftopId?: string;
  rooftopId?: string;
  currentBalanceCents?: number;
  creditLimitCents?: number;
  creditAvailableCents?: number;
  aged30DaysCents?: number;
  aged60DaysCents?: number;
  aged90DaysCents?: number;
  aged120DaysCents?: number;
  agedBalanceTotalCents?: number;
  creditHold?: boolean;
  isOverdue?: boolean;
  discountRate?: number;
  discountPercent?: number;
  ytdSpendCents?: number;
  ytdOrderCount?: number;
  paymentTerms?: string;
  purchasePriorYearCents?: number;
  averageDaysToPay?: number;
  lastPurchaseDate?: string;
  lastPaymentDate?: string;
  financialYearLabel?: string;
  partsSalesFinancialYearCents?: number;
  partsTransactionsFinancialYear?: number;
  partsSaleTypeCode?: string;
  partsSaleTypeLabel?: string;
  priceLevelCode?: string;
  priceLevelLabel?: string;
  paymentMethodCode?: string;
  paymentMethodLabel?: string;
  creditTypeCode?: string;
  creditTypeLabel?: string;
  creditCode?: string;
  creditCodeLabel?: string;
  creditComments?: string;
  purchaseOrderRequired?: boolean;
  billToEntityId?: string;
  territoryLabel?: string;
  warningNotes?: string[];
  isVerifiedPentana?: boolean;
  sourceEntityCode?: string;
  identifierType?: string;
  sourceScreens?: string;
  lastSyncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountsResponse = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  accounts?: TradeAccount[];
  results?: TradeAccount[];
};

export type AccountSpend = {
  accountId?: string;
  companyName?: string;
  year?: number;
  ytdSpendCents?: number;
  ytdOrderCount?: number;
  creditLimitCents?: number;
  currentBalanceCents?: number;
  creditAvailableCents?: number;
  discountPercent?: number;
  creditHold?: boolean;
  isOverdue?: boolean;
  priceLevelLabel?: string;
  aged30DaysCents?: number;
  aged60DaysCents?: number;
  aged90DaysCents?: number;
  aged120DaysCents?: number;
  partsSalesFinancialYearCents?: number;
  partsTransactionsFinancialYear?: number;
  purchasePriorYearCents?: number;
  averageDaysToPay?: number;
  lastPurchaseDate?: string | null;
  lastPaymentDate?: string | null;
  warningNotes?: string[];
  abn?: string | null;
};

export type PentanaEntity = {
  _id?: string;
  entityId: string;
  sourceEntityCode?: string;
  entityName: string;
  businessName?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  businessEmail?: string;
  homeEmail?: string;
  businessPhone?: string;
  mobilePhone?: string;
  abn?: string;
  acn?: string;
  entityTypeRaw?: string;
  customerTypeDetailRaw?: string;
  detailCaptureStatus?: string;
  isTradeAccount?: boolean;
  linkedAccountId?: string;
  capturedAt?: string;
};

export type PentanaPriceLevel = {
  source_entity_code?: string;
  price_level_code: string;
  source_label: string;
  source_screen?: string;
  discount_percent?: string;
  rule_formula_verified?: boolean;
};

export type PentanaStatus = {
  schema_version?: string;
  source_entity_code?: string;
  status?: string;
  search_query?: string;
  search_rows?: number;
  related_account_rows?: number;
  price_level_reference_rows?: number;
  warning_notes?: number;
  checks?: Record<string, string>;
};

// ─── PartsCheck ───────────────────────────────────────────────────────
export type PartsCheckSummary = {
  totalRfqs?: number;
  autoQuotedCount?: number;
  pendingReviewCount?: number;
  conversionRate?: number;
  onTimeQuoteRate?: number;
  wonOrderValueCents?: number;
  kpis?: {
    totalRfqs?: number;
    totalQuoted?: number;
    autoQuotedCount?: number;
    manuallyQuotedCount?: number;
    autoQuoteRatePercent?: number;
    unmappedBuyerCount?: number;
    pendingReviewCount?: number;
    acceptedCount?: number;
    rejectedCount?: number;
    conversionRatePercent?: number;
    totalRevenueCents?: number;
    slaBreachedCount?: number;
    slaComplianceRatePercent?: number;
  };
  precinctMetrics?: Array<{
    rooftopId?: string;
    name?: string;
    code?: string;
    totalRfqs?: number;
    autoQuoted?: number;
    autoQuoteRatePercent?: number;
    acceptedCount?: number;
    winRatePercent?: number;
    revenueCents?: number;
  }>;
};

export type RfqLine = {
  lineId?: string;
  partNumber?: string;
  description?: string;
  quantity?: number;
  requestedType?: string;
  status?: string;
  state?: string;
  resolvedSourceKind?: string;
  resolvedSourceName?: string;
  unitTradePriceCents?: number;
  totalPriceCents?: number;
  resolvedPriceCents?: number;
  tradePriceCents?: number;
  coreChargeCents?: number;
  stockQty?: number;
  inStock?: boolean;
  eta?: string;
  binLocation?: string;
  isOverridden?: boolean;
  overrideNotes?: string;
};

export type Rfq = {
  _id?: string;
  rfqId?: string;
  repairerName?: string;
  buyerName?: string;
  buyerId?: string;
  repairerEmail?: string;
  buyerEmail?: string;
  rooftopId?: string;
  status?: string;
  state?: string;
  deadline?: string;
  slaDeadline?: string;
  isBuyerMapped?: boolean;
  mappedTradeAccountId?: string;
  tradeAccountId?: string;
  totalCents?: number;
  subtotalCents?: number;
  gstCents?: number;
  createdAt?: string;
  lines?: RfqLine[];
  vehicle?: {
    vin?: string;
    rego?: string;
    make?: string;
    model?: string;
    year?: number;
  };
  vehicleDetails?: {
    vin?: string;
    rego?: string;
    make?: string;
    model?: string;
    year?: number;
  };
  rego?: string;
  vin?: string;
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

export type StoreDashboard = {
  precinct?: {
    rooftopId?: string;
    name?: string;
    code?: string;
    address?: string;
    phone?: string;
    oemBrandCodes?: string[];
  };
  financialSummary?: {
    totalRevenueCents?: number;
    totalOrders?: number;
    todayOrdersCount?: number;
    weekOrdersCount?: number;
  };
  warehouseQueue?: {
    pendingPicking?: number;
    partiallyPicked?: number;
    pickedReady?: number;
    dispatched?: number;
    delivered?: number;
    activeExceptions?: number;
    totalInQueue?: number;
  };
  accountsStatus?: {
    totalAccounts?: number;
    onCreditHold?: number;
    overdue?: number;
  };
  partscheckSummary?: {
    openRfqs?: number;
    autoQuoted?: number;
  };
};

export type StorePartsCheckDashboard = {
  rooftopId?: string;
  slaOverview?: {
    totalRfqs?: number;
    autoQuoted?: number;
    manuallyQuoted?: number;
    unmappedBuyers?: number;
    pendingReview?: number;
    accepted?: number;
    rejected?: number;
    expired?: number;
    urgentExpiringWithin1Hour?: number;
    autoQuoteRatePercent?: number;
    winRatePercent?: number;
    slaComplianceRatePercent?: number;
  };
};

export type WeeklyExport = {
  period?: {
    from?: string;
    to?: string;
    rooftopId?: string;
  };
  financialSummary?: {
    totalOrdersCount?: number;
    totalRevenueAud?: string;
    totalGstAud?: string;
    totalCoreChargesAud?: string;
  };
  partscheckSummary?: {
    totalRfqs?: number;
    autoQuoted?: number;
    accepted?: number;
  };
  topAccounts?: Array<{
    accountId?: string;
    name?: string;
    count?: number;
    spendCents?: number;
  }>;
  topParts?: Array<{
    partNumber?: string;
    description?: string;
    qty?: number;
    spendCents?: number;
  }>;
  orderRows?: Array<Record<string, unknown>>;
};

