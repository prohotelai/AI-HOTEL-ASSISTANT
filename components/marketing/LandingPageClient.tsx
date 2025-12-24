'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  MapPin,
  Star,
  Quote
} from 'lucide-react'
import Container from '@/components/marketing/Container'
import Section from '@/components/marketing/Section'
import FeatureCard from '@/components/marketing/FeatureCard'
import PricingCard from '@/components/marketing/PricingCard'
import { motion } from 'framer-motion'

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
  highlighted?: boolean
}

type TestimonialCard = {
  quote: string
  author: string
  role: string
  hotel: string
  rating: number
  image?: string
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
    description: 'Customize AI behavior based on your property\'s unique requirements and guest preferences.'
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
    description: 'Granular access control with customizable branding to match your hotel\'s identity.'
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
    ]
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
    ]
  }
]

const testimonials: TestimonialCard[] = [
  {
    quote: "AI Hotel Assistant transformed how we handle guest requests. Our response time dropped by 60% and guest satisfaction increased significantly. It's like having 5 extra staff members working 24/7.",
    author: "Sarah Mitchell",
    role: "General Manager",
    hotel: "The Grandview Hotel, London",
    rating: 5
  },
  {
    quote: "The PMS integration is seamless. Our bookings sync in real-time, and the automation has freed up our team to focus on personalized guest experiences. ROI within 3 months.",
    author: "Marco Rossi",
    role: "Operations Director",
    hotel: "Milano Boutique Hotel, Italy",
    rating: 5
  },
  {
    quote: "Multilingual support was a game-changer for our international guests. The AI handles 80% of inquiries without human intervention. Fantastic platform, highly recommended.",
    author: "Yuki Tanaka",
    role: "Front Office Manager",
    hotel: "Tokyo Grand Residences, Japan",
    rating: 5
  }
]

export function LandingPageClient() {
  const [formState, setFormState] = useState({ name: '', email: '', hotel: '', message: '' })
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [formError, setFormError] = useState('')

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormState(prev => ({ ...prev, [id]: value }))
  }

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormStatus('loading')
    setFormError('')

    if (!formState.name || !formState.email || !formState.hotel || !formState.message) {
      setFormError('All fields are required')
      setFormStatus('error')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      setFormError('Please enter a valid email address')
      setFormStatus('error')
      return
    }

    try {
      // Simulate form submission (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000))
      setFormStatus('success')
      setFormState({ name: '', email: '', hotel: '', message: '' })
      setTimeout(() => setFormStatus('idle'), 3000)
    } catch {
      setFormError('Failed to send message. Please try again.')
      setFormStatus('error')
    }
  }

  return (
    <div>
      {/* Hero Section - Dark Theme */}
      <Section background="white" className="pt-20 pb-16 md:pt-24 md:pb-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-tight tracking-tight mb-6">
                An All-in-One AI-Powered Hotel Operating System
              </h1>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed mb-8">
                A modern cloud-based platform for hotels, delivering AI chat and voice assistants for guests 24/7, multilingual support, full PMS integration, automation workflows, and custom AI training based on your property&apos;s knowledge.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 bg-brand-primary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-brand-primary-dark transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 min-h-[3.5rem]"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-white/20 hover:bg-white/20 transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 min-h-[3.5rem] backdrop-blur-sm"
                >
                  View Pricing
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative order-first lg:order-last mt-8 lg:mt-0"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
                <Image
                  src="/images/ai-hotel-hero.png"
                  alt="AI Hotel Dashboard Preview"
                  width={600}
                  height={600}
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-white/10 rounded-2xl shadow-xl p-4 border border-white/20 hidden sm:block backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-brand-accent" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">AI Active</p>
                    <p className="text-xs text-gray-400">24/7 Support</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </Container>
      </Section>

      {/* Benefits Section - Light Theme */}
      <Section background="white">
        <Container>
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-text mb-4 tracking-tight">
              Transform Your Hotel Operations
            </h2>
            <p className="text-lg md:text-xl text-brand-muted max-w-3xl mx-auto leading-relaxed">
              Proven results from hotels using our AI-powered platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: benefit.delay ?? 0 }}
                whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                className={`bg-brand-card rounded-2xl p-6 md:p-8 shadow-md border border-brand-border text-center transition-all duration-300 ${benefit.hoverClass}`}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${benefit.iconWrapperClass}`}>
                  <benefit.icon className={`w-8 h-8 md:w-10 md:h-10 ${benefit.iconClass}`} aria-hidden="true" />
                </div>
                <div className="text-4xl md:text-5xl font-bold text-brand-primary mb-3 tracking-tight">{benefit.value}</div>
                <h3 className="text-xl font-semibold text-brand-text mb-2">{benefit.title}</h3>
                <p className="text-brand-muted leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Testimonials Section - Dark Theme */}
      <Section background="gray" className="bg-slate-950">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-4 tracking-tight">
              Trusted by Hotels Worldwide
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              See how leading hospitality properties are transforming operations with AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm hover:border-brand-primary/30 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                  ))}
                </div>
                <Quote className="w-8 h-8 text-brand-primary/30 mb-4" aria-hidden="true" />
                <p className="text-gray-300 mb-6 leading-relaxed italic">&quot;{testimonial.quote}&quot;</p>
                <div className="border-t border-white/10 pt-4">
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                  <p className="text-sm text-brand-primary font-medium">{testimonial.hotel}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-4xl font-bold text-brand-primary mb-2">500+</div>
              <p className="text-gray-400">Active Hotels</p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-4xl font-bold text-brand-primary mb-2">2M+</div>
              <p className="text-gray-400">Guest Conversations</p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-4xl font-bold text-brand-primary mb-2">95%</div>
              <p className="text-gray-400">Satisfaction Rate</p>
            </div>
            <div className="text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-4xl font-bold text-brand-primary mb-2">24/7</div>
              <p className="text-gray-400">Support Available</p>
            </div>
          </motion.div>
        </Container>
      </Section>

      {/* Features Section - Light Theme */}
      <Section background="gray">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-text mb-4 tracking-tight">
              Comprehensive Hotel Management Platform
            </h2>
            <p className="text-lg md:text-xl text-brand-muted max-w-3xl mx-auto">
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

      {/* Steps Section - Dark Theme */}
      <Section background="white" className="bg-gradient-to-br from-slate-900 to-slate-800">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white mb-4 tracking-tight">
              Get Started in 4 Simple Steps
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
              Launch your AI-powered hotel system in minutes, not months
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-brand-primary/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.description}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-8 -right-4 w-8 h-8 text-brand-primary/30" aria-hidden="true" />
                )}
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pricing Section - Light Theme */}
      <Section background="gray">
        <Container>
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-text mb-4 tracking-tight">
              Transparent Pricing for Every Hotel Size
            </h2>
            <p className="text-lg md:text-xl text-brand-muted max-w-3xl mx-auto">
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
                highlighted={plan.highlighted}
                cta="Get Started"
                ctaLink="/register"
                index={index}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-brand-primary font-semibold text-lg hover:text-brand-primary-dark transition-colors"
            >
              View Full Pricing & Enterprise Plans
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </Section>

      {/* Contact Section - Dark Theme */}
      <Section background="white" className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-850">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-30" />
        <Container className="relative">
          <div id="contact" className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6 tracking-tight">
                Ready to Transform Your Hotel?
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Contact us today to schedule a demo or get answers to your questions. Our team is here to help you succeed.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">PROINVEST GLOBAL LTD</h3>
                    <p className="text-gray-400">
                      2 Frederick Street, Kings Cross
                      <br />
                      London, WC1X 0ND, United Kingdom
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Phone</h3>
                    <a href="tel:+447448810068" className="text-brand-primary hover:text-brand-primary-dark transition-colors">
                      +44 7448 810068
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-brand-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Email</h3>
                    <a href="mailto:support@aihotelassistant.com" className="text-brand-primary hover:text-brand-primary-dark transition-colors">
                      support@aihotelassistant.com
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
              className="bg-white/5 rounded-2xl shadow-xl p-8 border border-white/10 backdrop-blur-sm"
            >
              <h3 className="text-2xl font-semibold text-white mb-6">Send us a message</h3>
              <form className="space-y-4" onSubmit={handleFormSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formState.name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                    placeholder="John Doe"
                    aria-label="Full Name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formState.email}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                    placeholder="john@hotel.com"
                    aria-label="Email Address"
                  />
                </div>
                <div>
                  <label htmlFor="hotel" className="block text-sm font-medium text-white mb-2">
                    Hotel Name
                  </label>
                  <input
                    type="text"
                    id="hotel"
                    value={formState.hotel}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                    placeholder="Grand Hotel"
                    aria-label="Hotel Name"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formState.message}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all resize-none"
                    placeholder="Tell us about your hotel and requirements..."
                    aria-label="Message"
                  />
                </div>
                {formError && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">
                    {formError}
                  </div>
                )}
                {formStatus === 'success' && (
                  <div className="bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-xl text-sm">
                    Message sent successfully! We&apos;ll be in touch shortly.
                  </div>
                )}
                <button
                  type="submit"
                  disabled={formStatus === 'loading'}
                  className="w-full bg-brand-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-primary-dark transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formStatus === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </motion.div>
          </div>
        </Container>
      </Section>
    </div>
  )
}
