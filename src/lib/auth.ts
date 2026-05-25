import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    // Demo login: active when DEMO_EMAIL + DEMO_PASSWORD are set (staging only).
    // Remove or unset these env vars in production.
    ...(process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD
      ? [
          CredentialsProvider({
            name: "Demo-Login",
            credentials: {
              email: { label: "E-Mail", type: "email" },
              password: { label: "Passwort", type: "password" },
            },
            async authorize(credentials) {
              if (
                credentials?.email === process.env.DEMO_EMAIL &&
                credentials?.password === process.env.DEMO_PASSWORD
              ) {
                return { id: "demo", name: "Demo User", email: process.env.DEMO_EMAIL };
              }
              return null;
            },
          }),
        ]
      : []),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
