'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Zap,
  Brain,
  Users,
  Globe,
  Lock,
  BarChart3,
  Database,
  Settings,
  FileText,
  Shield,
  Headphones,
  Mic,
  FileUp,
  Tag,
  Bell,
  Clock,
  UserCog,
  Building2,
  Workflow,
  ArrowRight
} from 'lucide-react'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import Container from '@/components/marketing/Container'
import Section from '@/components/marketing/Section'
import { SectionHeader } from '@/components/marketing/SectionHeader'
import FeatureCard from '@/components/marketing/FeatureCard'

const featureCategories = [
  {
    title: 'Guest Experience',
    subtitle: 'Delight Your Guests',
    description: 'Provide exceptional 24/7 support and personalized experiences',
    features: [
      {
        icon: MessageSquare,
        title: 'AI Chat Assistant',
        description: '24/7 intelligent chatbot handling guest inquiries, bookings, and requests in real-time with natural language understanding.',
      },
      {
        icon: Mic,
        title: 'Voice Assistant',
        description: 'Voice-enabled AI support for hands-free interaction. Guests can speak their requests and receive instant voice responses.',
      },
      {
        icon: Globe,
        title: 'Multi-language Support',
        description: 'Communicate seamlessly with guests in 50+ languages. Break down language barriers and serve international travelers effortlessly.',
      },
      {
        icon: Headphones,
        title: '24/7 Availability',
        description: 'Never miss a guest inquiry. AI agents work around the clock, handling requests even when your staff is off-duty.',
      },
    ],
  },
  {
    title: 'Hotel Operations',
    subtitle: 'Streamline Your Workflow',
    description: 'Automate tasks and optimize your hotel management',
    features: [
      {
        icon: Zap,
        title: 'PMS Integration',
        description: 'Seamless integration with major PMS systems like Opera, Mews, and Cloudbeds. Sync bookings, rooms, and guest data in real-time.',
      },
      {
        icon: Workflow,
        title: 'Workflow Automation',
        description: 'Automate repetitive tasks like check-in reminders, housekeeping schedules, and maintenance requests to save staff time.',
      },
      {
        icon: UserCog,
        title: 'Staff CRM',
        description: 'Manage staff profiles, track performance, assign tasks, and monitor productivity from a unified dashboard.',
      },
      {
        icon: Bell,
        title: 'Smart Notifications',
        description: 'Real-time alerts for urgent guest requests, maintenance issues, and critical updates delivered to the right team members.',
      },
      {
        icon: Tag,
        title: 'Ticket Management',
        description: 'Track, assign, and resolve support tickets with SLA monitoring, automated escalation, and priority management.',
      },
      {
        icon: Clock,
        title: 'Task Scheduling',
        description: 'Intelligent task scheduling based on occupancy rates, staff availability, and historical patterns for optimal efficiency.',
      },
    ],
  },
  {
    title: 'AI & Automation',
    subtitle: 'Powered by Intelligence',
    description: 'Leverage advanced AI to make smarter decisions',
    features: [
      {
        icon: Brain,
        title: 'Custom AI Training',
        description: 'Train the AI with your hotel\'s unique policies, services, and brand voice. Customize responses to match your property\'s personality.',
      },
      {
        icon: Database,
        title: 'Knowledge Base',
        description: 'Centralized repository for hotel policies, FAQs, menus, and services. AI retrieves accurate information instantly from your knowledge base.',
      },
      {
        icon: BarChart3,
        title: 'Advanced Analytics',
        description: 'Real-time dashboards with guest behavior insights, operational metrics, and predictive analytics to drive better decisions.',
      },
      {
        icon: FileText,
        title: 'Auto-Documentation',
        description: 'Automatic generation of reports, summaries, and documentation based on conversations and operational data.',
      },
    ],
  },
  {
    title: 'Security & Customization',
    subtitle: 'Enterprise-Grade Protection',
    description: 'Secure, compliant, and fully customizable to your brand',
    features: [
      {
        icon: Lock,
        title: 'Role-Based Access Control',
        description: 'Granular permissions for owners, managers, reception, and staff. Control who can access what data and perform specific actions.',
      },
      {
        icon: Shield,
        title: 'Data Security',
        description: 'Enterprise-grade encryption, SOC 2 compliance, and GDPR-ready infrastructure to protect guest and hotel data.',
      },
      {
        icon: FileUp,
        title: 'Secure File Management',
        description: 'Upload and manage documents, contracts, IDs, and attachments with secure storage and controlled access.',
      },
      {
        icon: Building2,
        title: 'White-label Branding',
        description: 'Fully customize the interface with your hotel\'s logo, colors, and branding for a seamless guest experience.',
      },
      {
        icon: Settings,
        title: 'Flexible Configuration',
        description: 'Configure workflows, automations, and integrations to match your hotel\'s unique operational requirements.',
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section - Dark Theme */}
        <Section background="white" className="pt-20 pb-16 md:pt-24 md:pb-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="mb-6 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                Everything You Need to Run a Modern Hotel
              </h1>
              <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-300 md:text-xl">
                Discover how AI Hotel Assistant transforms every aspect of your hotel operations,
                from guest interactions to backend management.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:bg-brand-primary-dark hover:scale-105 hover:shadow-xl active:scale-95"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-white/10 active:scale-95 backdrop-blur-sm"
                >
                  View Pricing
                </Link>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Feature Categories - Alternating Light/Dark */}
        {featureCategories.map((category, categoryIndex) => (
          <Section
            key={category.title}
            background={categoryIndex % 2 === 0 ? 'white' : 'gray'}
            className={categoryIndex % 2 === 1 ? 'bg-slate-950' : ''}
          >
            <Container>
              <SectionHeader
                subtitle={category.subtitle}
                title={category.title}
                description={category.description}
                centered
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {category.features.map((feature, featureIndex) => (
                  <FeatureCard
                    key={feature.title}
                    icon={feature.icon}
                    title={feature.title}
                    description={feature.description}
                  />
                ))}
              </div>
            </Container>
          </Section>
        ))}

        {/* CTA Section - Dark Theme */}
        <Section background="white" className="border-t border-white/10 bg-gradient-to-br from-slate-900 to-slate-800">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl bg-gradient-to-br from-brand-primary to-brand-primary-dark p-8 text-center text-white shadow-2xl md:p-12"
            >
              <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
                Ready to Transform Your Hotel?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
                Join hundreds of hotels already using AI to deliver exceptional guest experiences
                and streamline operations.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-brand-primary shadow-lg transition-all duration-300 hover:bg-gray-50 hover:scale-105 hover:shadow-xl active:scale-95"
                >
                  Get Started Free
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white bg-transparent px-8 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-white/10 active:scale-95"
                >
                  Contact Sales
                </Link>
              </div>
            </motion.div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  )
}
