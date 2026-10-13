import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verify } from "argon2";
import { db } from "./db";
import { allowAttempt } from "./rate-limit";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 86400 },
  providers: [
    Credentials({
      name: "E-posta",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, req) {
        if (
          !credentials?.email ||
          !credentials.password ||
          credentials.password.length > 128
        )
          return null;
        const email = credentials.email.trim().toLowerCase();
        const ip = String(req.headers?.["x-forwarded-for"] ?? "unknown")
          .split(",")[0]
          .trim();
        if (
          !(await allowAttempt("login-ip", ip, 30, 900)) ||
          !(await allowAttempt("login-email", email, 10, 900))
        )
          return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });
        if (!user || !(await verify(user.passwordHash, credentials.password)))
          return null;
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = String(token.uid);
      return session;
    },
  },
};
