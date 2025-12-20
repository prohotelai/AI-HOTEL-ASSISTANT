'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Zap, Building2, Crown } from 'lucide-react'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import Container from '@/components/marketing/Container'
import Section from '@/components/marketing/Section'
import { SectionHeader } from '@/components/marketing/SectionHeader'
import PricingCard from '@/components/marketing/PricingCard'

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for testing and small properties',
    roomLimit: 'Up to 50 rooms',
    features: [
      '100 AI messages/month',
      '10 support tickets/month',
      '1 GB storage',
      'Basic knowledge base',
      'Email support (48h response)',
      'Standard AI training',
    ],
    limitations: [
      'No voice assistant',
      'No 24/7 support',
      'Limited PMS integration',
    ],
  },
  {
    name: 'Pro',
    price: '$999',
    description: 'Ideal for growing hotels',
    roomLimit: 'Up to 200 rooms',
    isPopular: true,
    features: [
      '1,000 AI messages/month',
      '60 voice minutes/month',
      'Unlimited support tickets',
      '10 GB storage',
      '24/7 support',
      'Full PMS integration',
      'Advanced knowledge base',
      'Custom AI training',
      'Priority email & chat support',
      'Basic analytics dashboard',
    ],
  },
  {
    name: 'Pro Plus',
    price: '$1,999',
    description: 'For established properties',
    roomLimit: '200-450 rooms',
    features: [
      '3,000 AI messages/month',
      '180 voice minutes/month',
      'Unlimited support tickets',
      '25 GB storage',
      'Priority 24/7 support',
      'Full PMS integration',
      'Advanced knowledge base',
      'Custom AI training',
      'Dedicated account manager',
      'Advanced analytics & insights',
      'Custom workflow automation',
      'API access',
    ],
  },
  {
    name: 'Enterprise Lite',
    price: '$3,999',
    description: 'For large hotels',
    roomLimit: '450-800 rooms',
    features: [
      '6,000 AI messages/month',
      '360 voice minutes/month',
      'Unlimited support tickets',
      '50 GB storage',
      'VIP support with 1h response',
      'Full PMS integration',
      'Enterprise knowledge base',
      'Dedicated AI specialist',
      'Custom workflow automation',
      'Advanced analytics & AI insights',
      'Full API access',
      'Custom integrations',
      'White-label branding',
    ],
  },
  {
    name: 'Resort / Enterprise Plus',
    price: 'Custom',
    description: 'For resorts and enterprise chains',
    roomLimit: '800+ rooms or multi-property',
    features: [
      'Unlimited AI messages',
      'Unlimited voice interactions',
      'Unlimited support tickets',
      'Unlimited storage',
      'Dedicated support team',
      'Multi-property management',
      'Enterprise PMS integration',
      'Custom AI development',
      'Advanced workflow automation',
      'Predictive analytics & ML models',
      'Full API & webhook access',
      'Custom integrations & plugins',
      'White-label platform',
      'On-premise deployment option',
      'SLA guarantees',
    ],
  },
]

const addOns = [
  {
    name: 'Extra AI Messages',
    price: '$50',
    unit: 'per 500 messages',
    description: 'Add more AI message capacity to your plan',
  },
  {
    name: 'Extra Voice Minutes',
    price: '$100',
    unit: 'per 100 minutes',
    description: 'Increase voice assistant usage',
  },
  {
    name: 'Additional Storage',
    price: '$20',
    unit: 'per 10 GB',
    description: 'Expand storage for documents and media',
  },
  {
    name: 'Premium Support',
    price: '$500',
    unit: 'per month',
    description: '15-minute response time guarantee',
  },
]

const comparisonFeatures = [
  {
    category: 'Core Features',
    features: [
      { name: 'AI Chat Assistant', starter: true, pro: true, proPlus: true, enterprise: true, resort: true },
      { name: 'Voice Assistant', starter: false, pro: true, proPlus: true, enterprise: true, resort: true },
      { name: 'Multi-language Support', starter: true, pro: true, proPlus: true, enterprise: true, resort: true },
      { name: '24/7 Availability', starter: false, pro: true, proPlus: true, enterprise: true, resort: true },
    ],
  },
  {
    category: 'Integrations',
    features: [
      { name: 'PMS Integration', starter: 'Basic', pro: 'Full', proPlus: 'Full', enterprise: 'Full', resort: 'Enterprise' },
      { name: 'API Access', starter: false, pro: false, proPlus: true, enterprise: true, resort: true },
      { name: 'Webhook Support', starter: false, pro: false, proPlus: true, enterprise: true, resort: true },
      { name: 'Custom Integrations', starter: false, pro: false, proPlus: false, enterprise: true, resort: true },
    ],
  },
  {
    category: 'Support',
    features: [
      { name: 'Email Support', starter: '48h', pro: '24h', proPlus: '12h', enterprise: '1h', resort: '15min' },
      { name: 'Chat Support', starter: false, pro: true, proPlus: true, enterprise: true, resort: true },
      { name: 'Phone Support', starter: false, pro: false, proPlus: true, enterprise: true, resort: true },
      { name: 'Dedicated Account Manager', starter: false, pro: false, proPlus: true, enterprise: true, resort: true },
    ],
  },
]

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <Section background="white" className="pt-20 pb-16 md:pt-24 md:pb-20">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="mb-6 text-4xl font-semibold tracking-tight text-brand-text md:text-5xl lg:text-6xl">
                Simple, Transparent Pricing
              </h1>
              <p className="mx-auto mb-8 max-w-3xl text-lg text-brand-muted md:text-xl">
                Choose a plan that scales with your property. From boutique hotels to large resorts,
                we have the perfect solution for you.
              </p>
            </motion.div>
          </Container>
        </Section>

        {/* Pricing Cards */}
        <Section background="white">
          <Container>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {pricingPlans.map((plan, index) => (
                <div key={plan.name} className={plan.name === 'Resort / Enterprise Plus' ? 'md:col-span-2 lg:col-span-3 xl:col-span-1' : ''}>
                  <PricingCard
                    name={plan.name}
                    price={plan.price}
                    description={plan.description}
                    features={plan.features}
                    highlighted={plan.isPopular}
                    cta="Get Started"
                    ctaLink="/register"
                    index={index}
                  />
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Room-Based Limits */}
        <Section background="gray">
          <Container>
            <SectionHeader
              subtitle="Room-Based Plans"
              title="Pricing Based on Your Property Size"
              description="Our plans are designed to match your hotel's capacity and operational needs"
              centered
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-2xl border border-brand-border bg-white p-6 text-center shadow-sm"
                >
                  <div className="mb-4 flex justify-center">
                    {plan.name === 'Starter' && <Building2 className="h-8 w-8 text-brand-muted" />}
                    {plan.name === 'Pro' && <Building2 className="h-8 w-8 text-brand-primary" />}
                    {plan.name === 'Pro Plus' && <Zap className="h-8 w-8 text-brand-primary" />}
                    {plan.name === 'Enterprise Lite' && <Zap className="h-8 w-8 text-brand-accent" />}
                    {plan.name === 'Resort / Enterprise Plus' && <Crown className="h-8 w-8 text-yellow-500" />}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-brand-text">{plan.name}</h3>
                  <p className="text-sm text-brand-muted">{plan.roomLimit}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Feature Comparison Table */}
        <Section background="white">
          <Container>
            <SectionHeader
              subtitle="Feature Comparison"
              title="Compare All Plans"
              description="See what's included in each plan at a glance"
              centered
            />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-brand-border">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-brand-text">Feature</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-brand-text">Starter</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-brand-text">Pro</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-brand-text">Pro Plus</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-brand-text">Enterprise</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-brand-text">Resort</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((category) => (
                    <>
                      <tr key={category.category} className="border-b border-brand-border bg-gray-50">
                        <td colSpan={6} className="px-4 py-3 text-sm font-semibold text-brand-text">
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr key={feature.name} className="border-b border-brand-border">
                          <td className="px-4 py-3 text-sm text-brand-text">{feature.name}</td>
                          <td className="px-4 py-3 text-center">
                            {typeof feature.starter === 'boolean' ? (
                              feature.starter ? (
                                <Check className="mx-auto h-5 w-5 text-brand-accent" aria-label="Included" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-gray-300" aria-label="Not included" />
                              )
                            ) : (
                              <span className="text-sm text-brand-muted">{feature.starter}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof feature.pro === 'boolean' ? (
                              feature.pro ? (
                                <Check className="mx-auto h-5 w-5 text-brand-accent" aria-label="Included" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-gray-300" aria-label="Not included" />
                              )
                            ) : (
                              <span className="text-sm text-brand-muted">{feature.pro}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof feature.proPlus === 'boolean' ? (
                              feature.proPlus ? (
                                <Check className="mx-auto h-5 w-5 text-brand-accent" aria-label="Included" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-gray-300" aria-label="Not included" />
                              )
                            ) : (
                              <span className="text-sm text-brand-muted">{feature.proPlus}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof feature.enterprise === 'boolean' ? (
                              feature.enterprise ? (
                                <Check className="mx-auto h-5 w-5 text-brand-accent" aria-label="Included" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-gray-300" aria-label="Not included" />
                              )
                            ) : (
                              <span className="text-sm text-brand-muted">{feature.enterprise}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {typeof feature.resort === 'boolean' ? (
                              feature.resort ? (
                                <Check className="mx-auto h-5 w-5 text-brand-accent" aria-label="Included" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-gray-300" aria-label="Not included" />
                              )
                            ) : (
                              <span className="text-sm text-brand-muted">{feature.resort}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </Section>

        {/* Add-Ons */}
        <Section background="gray">
          <Container>
            <SectionHeader
              subtitle="Flexible Add-Ons"
              title="Enhance Your Plan"
              description="Need more capacity? Add extra resources as you grow"
              centered
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {addOns.map((addOn, index) => (
                <motion.div
                  key={addOn.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-2 text-lg font-semibold text-brand-text">{addOn.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-brand-primary">{addOn.price}</span>
                    <span className="ml-1 text-sm text-brand-muted">{addOn.unit}</span>
                  </div>
                  <p className="text-sm text-brand-muted">{addOn.description}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>

        {/* CTA Section */}
        <Section background="white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
              className="rounded-2xl bg-gradient-to-br from-brand-primary to-brand-primary-dark p-8 text-center text-white shadow-2xl md:p-12"
            >
              <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
                Ready to Get Started?
              </h2>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
                Start with our free plan or speak with our team to find the perfect solution for your property.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-brand-primary shadow-lg transition-all duration-300 hover:bg-gray-50 hover:scale-105 hover:shadow-xl active:scale-95"
                >
                  Start Free Trial
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
