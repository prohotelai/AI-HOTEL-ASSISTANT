'use client'

import { motion } from 'framer-motion'
import {
  MessageSquare,
  Mic,
  Globe,
  Zap,
  Database,
  Brain,
  Users,
  Bell,
  FileText,
  Lock,
  Settings,
  BarChart3,
  TrendingUp,
  Clock,
  Shield,
  Palette,
  Workflow,
  Search,
  Calendar,
  CreditCard,
  Headphones,
  Languages
} from 'lucide-react'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import Container from '@/components/marketing/Container'
import Section from '@/components/marketing/Section'
import FeatureCard from '@/components/marketing/FeatureCard'

export default function FeaturesPage() {
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
              Everything You Need to Run a Modern Hotel
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Our comprehensive platform combines AI-powered guest services, operations management, and data analytics into one seamless solution.
            </p>
          </motion.div>
        </Container>
      </Section>

      {/* Guest Experience Features */}
      <Section background="white">
        <Container>
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Exceptional Guest Experience
            </h2>
            <p className="text-xl text-gray-600">
              Delight your guests with 24/7 AI-powered assistance and personalized service
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={MessageSquare}
              title="AI Chat Assistant"
              description="Intelligent chatbot that handles guest inquiries instantly, from room service requests to local recommendations, available 24/7 in multiple languages."
              index={0}
            />
            <FeatureCard
              icon={Mic}
              title="Voice Assistant"
              description="Natural voice interactions for hands-free guest support. Guests can speak their requests and get immediate responses in their preferred language."
              index={1}
            />
            <FeatureCard
              icon={Languages}
              title="50+ Language Support"
              description="Break language barriers with automatic translation. Communicate seamlessly with international guests in their native language."
              index={2}
            />
            <FeatureCard
              icon={Search}
              title="Smart Knowledge Base"
              description="AI-powered search across all hotel information. Guests get accurate answers about policies, amenities, and services instantly."
              index={3}
            />
            <FeatureCard
              icon={Calendar}
              title="Booking Assistance"
              description="Help guests check availability, compare room types, and guide them through the booking process with AI-powered recommendations."
              index={4}
            />
            <FeatureCard
              icon={Headphones}
              title="24/7 Support"
              description="Never miss a guest inquiry. Our AI handles requests around the clock, ensuring guests always get the help they need."
              index={5}
            />
          </div>
        </Container>
      </Section>

      {/* Hotel Operations Features */}
      <Section background="gray">
        <Container>
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Streamlined Hotel Operations
            </h2>
            <p className="text-xl text-gray-600">
              Automate workflows and manage your property efficiently from one unified platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Zap}
              title="PMS Integration"
              description="Seamless connection with major PMS systems including Opera, Cloudbeds, Mews, and more. Sync bookings, guest data, and room status in real-time."
              index={0}
            />
            <FeatureCard
              icon={Workflow}
              title="Workflow Automation"
              description="Automate repetitive tasks like check-in confirmations, housekeeping assignments, and maintenance requests to save time and reduce errors."
              index={1}
            />
            <FeatureCard
              icon={Users}
              title="Staff Management"
              description="Assign tasks, track performance, and manage team schedules. Role-based access ensures staff only see what they need."
              index={2}
            />
            <FeatureCard
              icon={Bell}
              title="Smart Notifications"
              description="Real-time alerts for urgent requests, booking changes, and important events. Keep your team informed and responsive."
              index={3}
            />
            <FeatureCard
              icon={FileText}
              title="Document Management"
              description="Securely store and manage guest documents, contracts, and IDs. Easy upload, organization, and retrieval when needed."
              index={4}
            />
            <FeatureCard
              icon={CreditCard}
              title="Payment Processing"
              description="Integrated billing and payment handling. Track transactions, generate invoices, and manage financial operations seamlessly."
              index={5}
            />
          </div>
        </Container>
      </Section>

      {/* AI & Automation Features */}
      <Section background="white">
        <Container>
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Advanced AI & Automation
            </h2>
            <p className="text-xl text-gray-600">
              Leverage cutting-edge artificial intelligence to optimize operations and guest satisfaction
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Brain}
              title="Custom AI Training"
              description="Train your AI assistant on your hotel's specific policies, services, and brand voice. Upload documents and the AI learns automatically."
              index={0}
            />
            <FeatureCard
              icon={Database}
              title="Knowledge Base Management"
              description="Centralized repository for all hotel information. Organize FAQs, policies, menus, and procedures for instant AI retrieval."
              index={1}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Predictive Analytics"
              description="AI-powered insights predict booking trends, occupancy patterns, and revenue opportunities to help you make data-driven decisions."
              index={2}
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-Time Analytics"
              description="Live dashboards showing key metrics like guest satisfaction, response times, and operational efficiency across all departments."
              index={3}
            />
            <FeatureCard
              icon={Clock}
              title="Usage Tracking"
              description="Monitor AI message volume, voice call duration, and support ticket metrics to optimize resource allocation and costs."
              index={4}
            />
            <FeatureCard
              icon={Globe}
              title="Multi-Property Management"
              description="Manage multiple hotel locations from a single dashboard. Centralized control with property-specific customization."
              index={5}
            />
          </div>
        </Container>
      </Section>

      {/* Security & Customization Features */}
      <Section background="gray">
        <Container>
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Security & Customization
            </h2>
            <p className="text-xl text-gray-600">
              Protect your data and customize the platform to match your brand identity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Lock}
              title="Role-Based Access Control"
              description="Granular permissions system with five role levels. Control exactly what each staff member can see and do in the system."
              index={0}
            />
            <FeatureCard
              icon={Shield}
              title="Data Encryption"
              description="End-to-end encryption for all guest data and communications. SOC 2 compliant with regular security audits."
              index={1}
            />
            <FeatureCard
              icon={Palette}
              title="White-Label Branding"
              description="Customize the entire platform with your hotel's logo, colors, and branding. Create a seamless experience for staff and guests."
              index={2}
            />
            <FeatureCard
              icon={Settings}
              title="API Integration"
              description="Powerful REST API for custom integrations. Connect with your existing tools and build custom workflows."
              index={3}
            />
            <FeatureCard
              icon={FileText}
              title="GDPR Compliance"
              description="Built-in compliance with GDPR, CCPA, and data protection regulations. Automatic data retention policies and guest privacy controls."
              index={4}
            />
            <FeatureCard
              icon={Users}
              title="SSO & Authentication"
              description="Single Sign-On support for enterprise customers. Integrate with Okta, Azure AD, and other identity providers."
              index={5}
            />
          </div>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section background="gradient">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to Experience These Features?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Start your free trial today and see how AI Hotel Assistant can transform your operations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Start Free Trial
              </a>
              <a
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg border-2 border-blue-600 hover:bg-blue-50 transition-all duration-300"
              >
                View Pricing
              </a>
            </div>
          </motion.div>
        </Container>
      </Section>

      <Footer />
    </div>
  )
}
