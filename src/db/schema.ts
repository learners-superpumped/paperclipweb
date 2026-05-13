import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  index,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";

// Use a dedicated schema for paperclipweb
export const paperclipwebSchema = pgSchema("paperclipweb");

// ─── Users ───
export const users = paperclipwebSchema.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  plan: text("plan").notNull().default("free"), // free, starter, pro
  creditsBalance: integer("credits_balance").notNull().default(100),
  creditsLimit: integer("credits_limit").notNull().default(100),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  onboardingData: text("onboarding_data"), // JSON string: { idea, target, valueProp, competitors }
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
});

// ─── Sessions (for NextAuth) ───
export const sessions = paperclipwebSchema.table("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

// ─── Accounts (for NextAuth OAuth) ───
export const accounts = paperclipwebSchema.table(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    index("accounts_user_idx").on(table.userId),
  ]
);

// ─── Verification Tokens (for email magic link) ───
export const verificationTokens = paperclipwebSchema.table(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  }
);

// ─── Subscriptions ───
export const subscriptions = paperclipwebSchema.table(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    plan: text("plan").notNull().default("free"),
    status: text("status").notNull().default("active"), // active, canceled, past_due
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_user_idx").on(table.userId),
  ]
);

// ─── Companies (Paperclip Instances) ───
export const companies = paperclipwebSchema.table(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").unique(), // 인스턴스 path/sub-domain 식별자
    caseId: text("case_id"), // 어떤 케이스 템플릿에서 시작했는지
    employeesJson: text("employees_json"), // 이관된 직원 배열 (CaseEmployee[])
    status: text("status").notNull().default("provisioning"), // provisioning, running, stopped, archived, deleted, error
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deleteAfter: timestamp("delete_after", { withTimezone: true }),
    legacyMode: boolean("mock_mode").notNull().default(false),
    paperclipCompanyId: text("paperclip_company_id"),
    paperclipVersion: text("paperclip_version").default("latest"),
    instanceUrl: text("instance_url"),
    creditsUsed: integer("credits_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("companies_user_idx").on(table.userId),
    index("companies_slug_idx").on(table.slug),
  ]
);

// ─── Tasks (사용자가 인스턴스 안에서 직원에게 시키는 작업) ───
export const tasks = paperclipwebSchema.table("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  inputPrompt: text("input_prompt").notNull(),
  status: text("status").notNull().default("running"), // running, done, failed
  resultMarkdown: text("result_markdown"),
  creditsUsed: integer("credits_used").notNull().default(0),
  isMock: boolean("is_mock").notNull().default(true), // mock 데이터 (결제 전) vs Opus 호출 (결제 후)
  cacheReadTokens: integer("cache_read_tokens"),
  cacheCreationTokens: integer("cache_creation_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [
  index("tasks_company_idx").on(table.companyId),
  index("tasks_user_idx").on(table.userId),
]);

// ─── Credit Transactions ───
export const creditTransactions = paperclipwebSchema.table(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, {
      onDelete: "set null",
    }),
    amount: integer("amount").notNull(), // positive = credit, negative = debit
    type: text("type").notNull(), // grant, subscription, usage, topup
    description: text("description"),
    provider: text("provider"), // anthropic, openai
    model: text("model"), // claude-sonnet-4-20250514, gpt-4o, etc.
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("credit_tx_user_idx").on(table.userId),
    index("credit_tx_created_idx").on(table.createdAt),
  ]
);

// ─── Invoices ───
export const invoices = paperclipwebSchema.table(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    amount: integer("amount").notNull(), // cents
    status: text("status").notNull().default("pending"), // pending, paid, failed
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("invoices_user_idx").on(table.userId),
  ]
);

// ─── Signup Intents ───
// signup form 에서 받은 name + 선택한 caseId 를 magic link 인증 전에 임시 저장.
// NextAuth events.createUser/signIn 콜백에서 email 매칭으로 users 에 적용.
export const signupIntents = paperclipwebSchema.table("signup_intents", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  caseId: text("case_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

// ─── Stripe Events (idempotency) ───
export const stripeEvents = paperclipwebSchema.table("stripe_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Balances (dollar-based credits) ───
export const balances = paperclipwebSchema.table("balances", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  dollars: numeric("dollars", { precision: 10, scale: 4 }).notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Balance Movements ───
export const balanceMovements = paperclipwebSchema.table("balance_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // grant, topup, spend, refund
  dollarsDelta: numeric("dollars_delta", { precision: 10, scale: 4 }).notNull(),
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("balance_movements_user_idx").on(table.userId),
]);

// ─── Cost Events Mirror ───
export const costEventsMirror = paperclipwebSchema.table("cost_events_mirror", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paperclipEventId: text("paperclip_event_id").unique().notNull(),
  paperclipCompanyId: text("paperclip_company_id"),
  model: text("model"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  dollars: numeric("dollars", { precision: 10, scale: 4 }),
  agentSlug: text("agent_slug"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("cost_events_user_idx").on(table.userId),
  index("cost_events_company_idx").on(table.paperclipCompanyId),
]);

// ─── Drip Emails ───
export const dripEmails = paperclipwebSchema.table(
  "drip_emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: integer("day").notNull(), // 0, 1, 2, 3
    status: text("status").notNull().default("pending"), // pending, sent, skipped
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("drip_emails_user_idx").on(table.userId),
    index("drip_emails_status_idx").on(table.status, table.scheduledAt),
  ]
);
