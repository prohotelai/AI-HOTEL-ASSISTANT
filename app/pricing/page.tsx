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
                Simple, Transparent Pricing
              </h1>
              <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-300 md:text-xl">
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

        {/* Simplified Feature Comparison - Light Table */}
        <Section background="gray">
          <Container>
            <SectionHeader
              subtitle="Compare Plans"
              title="Find Your Perfect Plan"
              description="See what's included in each tier"
              centered
            />
            
            {/* Core Features Comparison */}
            <div className="space-y-12">
              {/* Core Features */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="bg-brand-primary text-white px-6 py-4">
                  <h3 className="text-xl font-semibold">Core Features</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-1/3">Feature</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Starter</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro Plus</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">AI Chat Assistant</td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                      </tr>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Voice Assistant</td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                      </tr>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">24/7 Support</td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">PMS Integration</td>
                        <td className="px-6 py-4 text-center text-xs text-gray-600">Basic</td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-green-600">Full</td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-green-600">Full</td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-green-600">Enterprise</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Support & Add-ons */}
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="bg-brand-accent text-white px-6 py-4">
                  <h3 className="text-xl font-semibold">Support & Integrations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-1/3">Feature</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Starter</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro Plus</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Email Support</td>
                        <td className="px-6 py-4 text-center text-xs text-gray-600">48h</td>
                        <td className="px-6 py-4 text-center text-xs text-gray-600">24h</td>
                        <td className="px-6 py-4 text-center text-xs text-gray-600">12h</td>
                        <td className="px-6 py-4 text-center text-xs font-semibold text-green-600">1h</td>
                      </tr>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Chat Support</td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                      </tr>
                      <tr className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">API Access</td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">Dedicated Manager</td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><X className="mx-auto h-5 w-5 text-gray-300" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                        <td className="px-6 py-4 text-center"><Check className="mx-auto h-5 w-5 text-green-600" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* Add-Ons Section */}
        <Section background="white">
          <Container>
            <SectionHeader
              subtitle="Flexible Add-Ons"
              title="Need More Capacity?"
              description="Add extra resources as your hotel grows"
              centered
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'Extra AI Messages', price: '$50', unit: 'per 500 messages' },
                { name: 'Extra Voice Minutes', price: '$100', unit: 'per 100 minutes' },
                { name: 'Additional Storage', price: '$20', unit: 'per 10 GB' },
                { name: 'Premium Support', price: '$500', unit: 'per month' }
              ].map((addOn, index) => (
                <motion.div
                  key={addOn.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-2xl border border-brand-border bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <h3 className="mb-3 text-lg font-semibold text-brand-text">{addOn.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-brand-primary">{addOn.price}</span>
                    <span className="ml-2 text-sm text-brand-muted">{addOn.unit}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>

        {/* FAQ Section - Dark Theme */}
        <Section background="gray" className="bg-slate-950">
          <Container>
            <SectionHeader
              subtitle="Common Questions"
              title="Pricing FAQs"
              description="Everything you need to know about our plans"
              centered
            />
            <div className="max-w-3xl mx-auto space-y-4">
              {[
                {
                  q: 'Can I switch plans anytime?',
                  a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle.'
                },
                {
                  q: 'Do you offer annual discounts?',
                  a: 'Yes, we offer 20% off annual subscriptions. Contact our sales team for custom enterprise pricing.'
                },
                {
                  q: 'Is there a setup fee?',
                  a: 'No setup fees. You only pay for your subscription. Integration assistance is included in all paid plans.'
                },
                {
                  q: 'What happens if I exceed my limits?',
                  a: 'We\'ll notify you when approaching limits. You can purchase add-ons or upgrade your plan with no interruption.'
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm hover:border-brand-primary/30 transition-all"
                >
                  <h4 className="text-lg font-semibold text-white mb-3">{item.q}</h4>
                  <p className="text-gray-300">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </Section>

        {/* CTA Section - Dark Theme */}
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
