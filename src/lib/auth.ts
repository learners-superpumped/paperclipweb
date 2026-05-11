import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  signupIntents,
} from "@/db/schema";
import { sendMagicLinkEmail, sendWelcomeEmail } from "./agentmail";

async function applySignupIntent(email: string, userId?: string) {
  const lower = email.toLowerCase();
  const [intent] = await db()
    .select()
    .from(signupIntents)
    .where(eq(signupIntents.email, lower))
    .limit(1);
  if (!intent || intent.consumedAt) return;

  await db()
    .update(users)
    .set({
      name: intent.name,
      onboardingData: JSON.stringify({ caseId: intent.caseId }),
    })
    .where(userId ? eq(users.id, userId) : eq(users.email, lower));

  await db()
    .update(signupIntents)
    .set({ consumedAt: sql`now()` })
    .where(eq(signupIntents.email, lower));
}

const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding/redirect",
    verifyRequest: "/login",
  },
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      from: "paperclipweb@agentmail.to",
      maxAge: 24 * 60 * 60,
      server: {},
      async sendVerificationRequest({ identifier: email, url }) {
        try {
          await sendMagicLinkEmail(email, url);
        } catch (error) {
          console.error("[Auth] Failed to send magic link:", error);
          throw new Error("Failed to send verification email");
        }
      },
      options: {},
    },
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      if (isOnDashboard) {
        return isLoggedIn;
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        try {
          await applySignupIntent(user.email, user.id);
        } catch (error) {
          console.error("[Auth] Failed to apply signup intent:", error);
        }
        try {
          await sendWelcomeEmail(user.email, user.name ?? undefined);
        } catch (error) {
          console.error("[Auth] Failed to send welcome email:", error);
        }
      }
    },
    async signIn({ user }) {
      if (user.email) {
        try {
          await applySignupIntent(user.email, user.id ?? undefined);
        } catch (error) {
          console.error("[Auth] Failed to apply signup intent on signIn:", error);
        }
      }
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
