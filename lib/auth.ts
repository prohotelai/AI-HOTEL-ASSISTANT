import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        loginType: { label: 'Login Type', type: 'text' } // 'staff' or 'guest'
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        if ((user as any).isSuspended) {
          throw new Error('ACCOUNT_SUSPENDED')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        // التحقق من أن الموظف يجب عليه تغيير كلمة المرور
        const metadata = ((user as any).metadata as any) || {}
        if (metadata.mustChangePassword) {
          throw new Error('MUST_CHANGE_PASSWORD')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hotelId: user.hotelId,
          mustChangePassword: metadata.mustChangePassword || false
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.hotelId = (user as any).hotelId
        token.mustChangePassword = (user as any).mustChangePassword
        token.isSuspended = (user as any).isSuspended ?? false
        token.suspendedAt = (user as any).suspendedAt ?? null
        token.suspensionReason = (user as any).suspensionReason ?? null
        token.suspensionCheckedAt = Date.now()
      }

      if (!user && token.id) {
        const lastChecked = (token.suspensionCheckedAt as number | undefined) ?? 0
        const now = Date.now()

        if (!lastChecked || now - lastChecked > 60000) {
          try {
            const status = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: {
                isSuspended: true,
                suspendedAt: true,
                suspensionReason: true,
              }
            })

            if (status) {
              token.isSuspended = status.isSuspended
              token.suspendedAt = status.suspendedAt ?? null
              token.suspensionReason = status.suspensionReason ?? null
            }

            token.suspensionCheckedAt = now
          } catch (error) {
            console.error('Failed to refresh suspension status for JWT:', error)
          }
        }
      }

      // Fetch hotel info including supportEnabled (cache for 5 minutes)
      if (token.hotelId && (!token.hotel || trigger === 'update')) {
        try {
          const hotel = await prisma.hotel.findUnique({
            where: { id: token.hotelId as string },
            select: {
              id: true,
              name: true,
              supportEnabled: true,
              subscriptionPlan: true
            }
          })
          if (hotel) {
            token.hotel = hotel
          }
        } catch (error) {
          console.error('Failed to fetch hotel data for JWT:', error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
        session.user.hotelId = token.hotelId as string | undefined
        ;(session.user as any).mustChangePassword = token.mustChangePassword as boolean
        ;(session.user as any).hotel = token.hotel || null
        ;(session.user as any).isSuspended = Boolean(token.isSuspended)
        ;(session.user as any).suspendedAt = token.suspendedAt ?? null
        ;(session.user as any).suspensionReason = token.suspensionReason ?? null
      }
      return session
    }
  },
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
