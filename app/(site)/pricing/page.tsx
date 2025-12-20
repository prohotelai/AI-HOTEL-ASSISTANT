'use client'

import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Zap, Crown } from 'lucide-react'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import Container from '@/components/marketing/Container'
import Section from '@/components/marketing/Section'

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'Forever',
      description: 'Perfect for testing and small properties',
      roomRange: 'Up to 50 rooms',
      features: [
        '100 AI messages per month',
        '10 support tickets per month',
        '1 GB storage',
        'Basic knowledge base',
        'Email support (72h response)',
        'Community forum access'
      ],
      limitations: [
        'No voice assistant',
        'No 24/7 support',
        'Limited integrations',
        'Basic analytics only'
      ],
      cta: 'Start Free',
      ctaLink: '/register',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$999',
      period: 'per month',
      description: 'Ideal for growing hotels',
      roomRange: 'Up to 200 rooms',
      features: [
        '1,000 AI messages per month',
        '60 voice minutes per month',
        'Unlimited support tickets',
        '10 GB storage',
        '24/7 email & chat support',
        'PMS integration (major systems)',
        'Advanced knowledge base',
        'Staff CRM & notifications',
        'Basic analytics dashboard',
        'Multi-language support (50+ languages)'
      ],
      limitations: [
        'No priority support',
        'Standard response time',
        'Limited customization'
      ],
      cta: 'Get Started',
      ctaLink: '/register',
      highlighted: true
    },
    {
      name: 'Pro Plus',
      price: '$1,999',
      period: 'per month',
      description: 'Advanced features for larger properties',
      roomRange: '200-450 rooms',
      features: [
        '3,000 AI messages per month',
        '180 voice minutes per month',
        'Unlimited support tickets',
        '25 GB storage',
        'Priority 24/7 support (12h response)',
        'All PMS integrations',
        'Advanced AI training',
        'Custom workflows & automation',
        'Advanced analytics & reports',
        'Role-based access control',
        'White-label branding',
        'API access'
      ],
      limitations: [
        'No dedicated account manager',
        'Standard SLA (99%)'
      ],
      cta: 'Get Started',
      ctaLink: '/register',
      highlighted: false
    },
    {
      name: 'Enterprise Lite',
      price: '$2,999',
      period: 'per month',
      description: 'For large hotels and chains',
      roomRange: '450-750 rooms',
      features: [
        '5,000 AI messages per month',
        '300 voice minutes per month',
        'Unlimited support tickets',
        '50 GB storage',
        'Priority 24/7 support (4h response)',
        'Dedicated account manager',
        'Custom integrations',
        'Advanced security features',
        'Predictive analytics',
        'Multi-property management',
        'SSO & SAML integration',
        'SLA guarantee (99.5%)',
        'Quarterly business reviews'
      ],
      limitations: [],
      cta: 'Contact Sales',
      ctaLink: '#contact',
      highlighted: false
    },
    {
      name: 'Enterprise Max',
      price: '$3,999',
      period: 'per month',
      description: 'Ultimate solution for resorts',
      roomRange: '750-1000+ rooms',
      features: [
        '10,000 AI messages per month',
        '600 voice minutes per month',
        'Unlimited everything',
        '100 GB storage',
        'VIP 24/7 support (2h response)',
        'Dedicated success team',
        'Full white-label solution',
        'Custom AI model training',
        'Enterprise-grade security',
        'Advanced compliance tools',
        'Custom contract terms',
        'SLA guarantee (99.9%)',
        'Monthly strategy sessions',
        'On-premise deployment option'
      ],
      limitations: [],
      cta: 'Contact Sales',
      ctaLink: '#contact',
      highlighted: false,
      isEnterprise: true
    }
  ]

  const addOns = [
    {
      name: 'Extra AI Messages',
      description: 'Additional 1,000 AI chat messages',
      price: '$99',
      period: 'per month'
    },
    {
      name: 'Extra Voice Minutes',
      description: 'Additional 100 voice interaction minutes',
      price: '$149',
      period: 'per month'
    },
    {
      name: 'Extra Storage',
      description: 'Additional 10 GB of secure storage',
      price: '$49',
      period: 'per month'
    },
    {
      name: 'Premium Onboarding',
      description: 'Dedicated setup and training sessions',
      price: '$999',
      period: 'one-time'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <Section background="gradient" className="pt-20">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Choose the plan that fits your hotel&apos;s size and needs. All plans include core features with no hidden fees.
            </p>
          </motion.div>
        </Container>
      </Section>

      {/* Pricing Cards */}
      <Section background="white">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {plans.slice(0, 3).map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white shadow-2xl ring-2 ring-blue-600 scale-105'
                    : 'bg-white text-gray-900 shadow-lg border-2 border-gray-200'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Crown className="w-4 h-4" />
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-2 ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  <p className={`text-xs font-semibold ${plan.highlighted ? 'text-blue-200' : 'text-blue-600'}`}>
                    {plan.roomRange}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    {plan.price !== 'Free' && (
                      <span className={`text-lg ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  {plan.price === 'Free' && (
                    <span className={`text-lg ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-blue-200' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${plan.highlighted ? 'text-blue-50' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <li key={`limit-${i}`} className="flex items-start gap-3">
                      <X className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? 'text-blue-300' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>
                        {limitation}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaLink}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>

          {/* Enterprise Plans */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {plans.slice(3).map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative rounded-2xl p-8 ${
                  plan.isEnterprise
                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-2xl'
                    : 'bg-white text-gray-900 shadow-lg border-2 border-gray-200'
                }`}
              >
                {plan.isEnterprise && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    Premium
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-3xl font-bold mb-2 ${plan.isEnterprise ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm mb-2 ${plan.isEnterprise ? 'text-purple-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  <p className={`text-xs font-semibold ${plan.isEnterprise ? 'text-purple-200' : 'text-blue-600'}`}>
                    {plan.roomRange}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold ${plan.isEnterprise ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-lg ${plan.isEnterprise ? 'text-purple-100' : 'text-gray-600'}`}>
                      /{plan.period}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.isEnterprise ? 'text-purple-200' : 'text-green-600'
                      }`} />
                      <span className={`text-sm ${plan.isEnterprise ? 'text-purple-50' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <a
                  href={plan.ctaLink}
                  className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                    plan.isEnterprise
                      ? 'bg-white text-purple-600 hover:bg-purple-50 shadow-lg hover:shadow-xl'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {plan.cta}
                </a>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Comparison Table */}
      <Section background="gray">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Detailed Feature Comparison
            </h2>
            <p className="text-xl text-gray-600">
              See exactly what&apos;s included in each plan
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-lg overflow-hidden">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Starter</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 bg-blue-50">Pro</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Pro Plus</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">AI Messages per month</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">100</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 font-semibold bg-blue-50">1,000</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">3,000</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">5,000 - 10,000</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Voice Minutes</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 font-semibold bg-blue-50">60</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">180</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">300 - 600</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Support Tickets</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">10/month</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 font-semibold bg-blue-50">Unlimited</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Unlimited</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Storage</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">1 GB</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-900 font-semibold bg-blue-50">10 GB</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">25 GB</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">50 - 100 GB</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">24/7 Support</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-blue-600 bg-blue-50"><Check className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">PMS Integration</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-blue-600 bg-blue-50"><Check className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">White-label Branding</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400 bg-blue-50"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Dedicated Account Manager</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400 bg-blue-50"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-gray-400"><X className="w-5 h-5 mx-auto" /></td>
                  <td className="px-6 py-4 text-center text-sm text-green-600"><Check className="w-5 h-5 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Container>
      </Section>

      {/* Add-ons Section */}
      <Section background="white">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Optional Add-ons
            </h2>
            <p className="text-xl text-gray-600">
              Extend your plan with additional resources as needed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOns.map((addon, index) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition-all duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{addon.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{addon.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-600">{addon.price}</span>
                  <span className="text-sm text-gray-500">/{addon.period}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* FAQ Section */}
      <Section background="gray">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pricing FAQs
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                q: 'Can I change plans at any time?',
                a: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period.'
              },
              {
                q: 'What happens if I exceed my usage limits?',
                a: 'If you exceed your AI message or voice minute limits, the service will pause until the next billing cycle or you can upgrade your plan immediately. We\'ll notify you at 80% and 100% of your limits.'
              },
              {
                q: 'Do you offer annual billing discounts?',
                a: 'Yes! Save 20% when you pay annually. Contact our sales team for annual pricing on any plan.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes, all paid plans include a 14-day free trial. No credit card required to start. The Starter plan is free forever with basic features.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, MasterCard, American Express), ACH bank transfers (US only), and wire transfers for Enterprise plans.'
              },
              {
                q: 'Can I get a custom plan for my hotel chain?',
                a: 'Absolutely! For hotel chains and properties with unique requirements, we offer custom enterprise plans. Contact our sales team to discuss your needs.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section background="gradient" id="contact">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Join hundreds of hotels already transforming their operations with AI Hotel Assistant
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="mailto:support@aihotelassistant.com"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-all duration-300"
              >
                Contact Sales
              </a>
            </div>
          </motion.div>
        </Container>
      </Section>

      <Footer />
    </div>
  )
}
