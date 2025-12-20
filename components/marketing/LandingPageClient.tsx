import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
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
  TrendingUp,
  Clock,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import Container from '@/components/marketing/Container'
import Section from '@/components/marketing/Section'
import FeatureCard from '@/components/marketing/FeatureCard'
import PricingCard from '@/components/marketing/PricingCard'
import AnimatedDiv from '@/components/marketing/AnimatedDiv'

type BenefitCard = {
  icon: LucideIcon
  value: string
  title: string
  description: string
  iconWrapperClass: string
  iconClass: string
  hoverClass: string
  delay?: number
}

type StepCard = {
  step: string
  title: string
  description: string
}

type PricingPlan = {
  name: string
  price: string
  description: string
  features: string[]
  cta: string
  ctaLink: string
  highlighted?: boolean
}

const benefits: BenefitCard[] = [
  {
    icon: DollarSign,
    value: '20-30%',
    title: 'Reduce Operational Costs',
    description: 'Lower expenses through automation and AI-powered efficiency',
    iconWrapperClass: 'bg-red-50',
    iconClass: 'text-red-600',
    hoverClass: 'hover:border-red-200'
  },
  {
    icon: TrendingUp,
    value: '+10-15%',
    title: 'Increase Revenue',
    description: 'Boost bookings and upsells with 24/7 AI assistance and personalized service',
    iconWrapperClass: 'bg-brand-accent/10',
    iconClass: 'text-brand-accent',
    hoverClass: 'hover:border-brand-accent',
    delay: 0.1
  },
  {
    icon: Clock,
    value: '40-50%',
    title: 'Save Staff Time',
    description: 'Free up your team from repetitive tasks to focus on exceptional guest experiences',
    iconWrapperClass: 'bg-brand-primary/10',
    iconClass: 'text-brand-primary',
    hoverClass: 'hover:border-brand-primary',
    delay: 0.2
  }
]

const features = [
  {
    icon: MessageSquare,
    title: 'AI Chat & Voice Assistant',
    description: '24/7 multilingual support for guests via chat and voice, handling inquiries, bookings, and requests instantly.'
  },
  {
    icon: Zap,
    title: 'PMS Integration & Automation',
    description: 'Seamless integration with major PMS systems. Automate workflows and sync data in real-time.'
  },
  {
    icon: Database,
    title: 'Advanced Knowledge Base',
    description: 'Centralized repository for hotel policies, services, and FAQs with intelligent AI retrieval.'
  },
  {
    icon: Brain,
    title: 'AI Training Layer',
    description: "Customize AI behavior based on your property's unique requirements and guest preferences."
  },
  {
    icon: Users,
    title: 'Staff CRM & Notifications',
    description: 'Smart task management, guest profiles, and real-time notifications for your team.'
  },
  {
    icon: Settings,
    title: 'File Uploads & Attachments',
    description: 'Secure document management for contracts, IDs, and guest-related files with easy access.'
  },
  {
    icon: Lock,
    title: 'Role-Based Permissions & White-label',
    description: "Granular access control with customizable branding to match your hotel's identity."
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics & Insights',
    description: 'Real-time dashboards, predictive analytics, and actionable insights to optimize operations.'
  },
  {
    icon: Globe,
    title: 'Multi-language Support',
    description: 'Communicate with guests in 50+ languages automatically, breaking down language barriers.'
  }
]

const steps: StepCard[] = [
  {
    step: '01',
    title: 'Register & Connect',
    description: 'Create your account and integrate with existing PMS and hotel systems'
  },
  {
    step: '02',
    title: 'Configure Knowledge',
    description: 'Upload hotel policies, menus, and information to train your AI assistant'
  },
  {
    step: '03',
    title: 'Activate AI Services',
    description: 'Launch AI chat and voice assistants for guest interactions 24/7'
  },
  {
    step: '04',
    title: 'Monitor & Optimize',
    description: 'Track analytics, review insights, and continuously improve guest experience'
  }
]

const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for testing and small properties',
    features: [
      '100 AI messages/month',
      '10 support tickets/month',
      '1 GB storage',
      'Basic knowledge base',
      'Email support'
    ],
    cta: 'Start Free',
    ctaLink: '/register'
  },
  {
    name: 'Pro',
    price: '$999',
    description: 'Up to 200 rooms',
    features: [
      '1,000 AI messages/month',
      '60 voice minutes/month',
      'Unlimited support tickets',
      '10 GB storage',
      '24/7 support',
      'PMS integration'
    ],
    cta: 'Get Started',
    ctaLink: '/register',
    highlighted: true
  },
  {
    name: 'Pro Plus',
    price: '$1,999',
    description: '200-450 rooms',
    features: [
      '3,000 AI messages/month',
      '180 voice minutes/month',
      'Unlimited support tickets',
      '25 GB storage',
      'Priority support',
      'Advanced analytics'
    ],
    cta: 'Get Started',
    ctaLink: '/register'
  }
]

export default function LandingPageClient() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* SECTION 1 — HERO */}
      <Section background="gradient" className="pt-20 pb-16 md:pt-24 md:pb-20">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <AnimatedDiv
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl md:text-5xl lg:text-display-lg font-semibold text-brand-text leading-tight tracking-tight mb-6 max-w-3xl mx-auto lg:mx-0">
                An All-in-One AI-Powered Hotel Operating System
              </h1>
              <p className="text-lg md:text-xl text-brand-muted leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
                A modern cloud-based platform for hotels, delivering AI chat and voice assistants for guests 24/7, multilingual support, full PMS integration, automation workflows, and custom AI training based on your property&apos;s knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 bg-brand-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-brand-primary-dark transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 min-h-[3.5rem]"
                  aria-label="Get started with AI Hotel Assistant"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 bg-brand-card text-brand-primary px-8 py-4 rounded-xl font-semibold text-lg border-2 border-brand-primary hover:bg-brand-primary/5 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 min-h-[3.5rem]"
                  aria-label="View pricing plans"
                >
                  View Pricing
                </Link>
              </div>
            </AnimatedDiv>

            <AnimatedDiv
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative order-first lg:order-last mt-8 lg:mt-0"
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border-2 border-brand-primary/20 flex items-center justify-center shadow-2xl">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4" aria-hidden="true">
                    🏨
                  </div>
                  <p className="text-brand-muted font-medium">AI Hotel Dashboard Preview</p>
                </div>
              </div>
              <AnimatedDiv
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-brand-card rounded-2xl shadow-xl p-4 border border-brand-border hidden sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-brand-accent" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-brand-text">AI Active</p>
                    <p className="text-xs text-brand-muted">24/7 Support</p>
                  </div>
                </div>
              </AnimatedDiv>
            </AnimatedDiv>
          </div>
        </Container>
      </Section>

      {/* SECTION 2 — KEY BENEFITS */}
      <Section background="white">
        <Container>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-display-sm md:text-display-md font-semibold text-brand-text mb-4 tracking-tight">
              Transform Your Hotel Operations
            </h2>
            <p className="text-lg md:text-xl text-brand-muted max-w-3xl mx-auto leading-relaxed">
              Proven results from hotels using our AI-powered platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {benefits.map((benefit) => (
              <AnimatedDiv
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: benefit.delay ?? 0 }}
                whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                className={`bg-brand-card rounded-2xl p-6 md:p-8 shadow-md border border-brand-border text-center transition-all duration-300 ${benefit.hoverClass}`}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${benefit.iconWrapperClass}`}>
                  <benefit.icon className={`w-8 h-8 md:w-10 md:h-10 ${benefit.iconClass}`} aria-hidden="true" />
                </div>
                <div className="text-5xl md:text-6xl font-bold text-brand-text mb-3 tracking-tight">{benefit.value}</div>
                <h3 className="text-xl font-semibold text-brand-text mb-2">{benefit.title}</h3>
                <p className="text-brand-muted leading-relaxed">{benefit.description}</p>
              </AnimatedDiv>
            ))}
          </div>
        </Container>
      </Section>

      {/* SECTION 3 — CORE FEATURES */}
      <Section background="gray">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Hotel Management Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to run a modern hotel, powered by cutting-edge AI technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={index}
              />
            ))}
          </div>
        </Container>
      </Section>

      {/* SECTION 4 — HOW IT WORKS */}
      <Section background="white">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get Started in 4 Simple Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Launch your AI-powered hotel system in minutes, not months
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <AnimatedDiv
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-blue-100 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-8 -right-4 w-8 h-8 text-blue-300" />
                )}
              </AnimatedDiv>
            ))}
          </div>
        </Container>
      </Section>

      {/* SECTION 5 — PRICING PREVIEW */}
      <Section background="gradient">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Transparent Pricing for Every Hotel Size
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose a plan that scales with your property&apos;s needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                name={plan.name}
                price={plan.price}
                description={plan.description}
                features={plan.features}
                cta={plan.cta}
                ctaLink={plan.ctaLink}
                highlighted={plan.highlighted}
                index={index}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-blue-600 font-semibold text-lg hover:text-blue-700 transition-colors"
            >
              View Full Pricing & Enterprise Plans
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </Container>
      </Section>

      {/* SECTION 6 — CONTACT / CTA */}
      <Section background="white" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-50"></div>
        <Container className="relative">
          <div id="contact" className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <AnimatedDiv
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Ready to Transform Your Hotel?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Contact us today to schedule a demo or get answers to your questions. Our team is here to help you succeed.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">PROINVEST GLOBAL LTD</h3>
                    <p className="text-gray-600">
                      2 Frederick Street, Kings Cross
                      <br />
                      London, WC1X 0ND, United Kingdom
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                    <a href="tel:+447448810068" className="text-blue-600 hover:text-blue-700">
                      +44 7448 810068
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                    <a href="mailto:support@aihotelassistant.com" className="text-blue-600 hover:text-blue-700">
                      support@aihotelassistant.com
                    </a>
                  </div>
                </div>
              </div>
            </AnimatedDiv>

            <AnimatedDiv
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="john@hotel.com"
                  />
                </div>
                <div>
                  <label htmlFor="hotel" className="block text-sm font-medium text-gray-700 mb-2">
                    Hotel Name
                  </label>
                  <input
                    type="text"
                    id="hotel"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Grand Hotel"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your hotel and requirements..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Send Message
                </button>
              </form>
            </AnimatedDiv>
          </div>
        </Container>
      </Section>

      <Footer />
    </div>
  )
}
