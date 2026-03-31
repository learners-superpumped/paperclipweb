import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { sendMagicLinkEmail, sendWelcomeEmail } from "./agentmail";

const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
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
          await sendWelcomeEmail(user.email, user.name ?? undefined);
        } catch (error) {
          console.error("[Auth] Failed to send welcome email:", error);
        }
      }
    },
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
