import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  index,
  boolean,
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
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
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
    status: text("status").notNull().default("provisioning"), // provisioning, running, stopped, error
    paperclipVersion: text("paperclip_version").default("latest"),
    instanceUrl: text("instance_url"),
    creditsUsed: integer("credits_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("companies_user_idx").on(table.userId),
  ]
);

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
