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
// (signupIntents 는 applySignupIntent 에서만 사용)
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
    newUser: "/account",
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
        // 진짜 메일 흐름만 — DB-side backdoor 제거. dev-loop QA 는
        // AgentMail QA inbox (devloop-qa@agentmail.to) 로 가입 → 그 inbox API 폴링 → 링크 클릭.
        // 사용자 실 경험과 100% 동일 흐름.
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
        // applySignupIntent 가 createUser/signIn event 안에서 users.name 을 채워 둠.
        // jwt callback 시점에 NextAuth 가 전달하는 user 객체는 createUser 직전 상태라 name 이 없을 수 있다.
        // DB 에서 최신 name 다시 가져와 token 에 반영해야 session.user.name 이 올바르게 들어간다.
        try {
          if (user.id) {
            const [u] = await db()
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, user.id as string))
              .limit(1);
            if (u?.name) token.name = u.name;
          }
        } catch (err) {
          console.error("[Auth] jwt callback name refresh failed:", err);
        }
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
      const isProtected =
        request.nextUrl.pathname.startsWith("/account") ||
        request.nextUrl.pathname.startsWith("/dashboard");
      if (isProtected) {
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
