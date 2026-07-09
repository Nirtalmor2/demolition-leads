import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAuthorized } from "@/lib/authorized-users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      return isAuthorized(profile?.email);
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
