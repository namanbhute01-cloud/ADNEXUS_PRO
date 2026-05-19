import 'server-only';
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@vaart/database"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(credentials)

        if (!parsed.success) return null
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email }
        })
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { 
        token.role = user.role; 
        token.id = user.id;
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as typeof session.user.role
        session.user.id = token.id as string
      }
      return session
    }
  }
})
