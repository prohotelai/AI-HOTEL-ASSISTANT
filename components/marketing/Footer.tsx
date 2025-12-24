import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, MapPin } from 'lucide-react'
import Container from './Container'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-brand-dark-bg text-gray-300 border-t border-brand-text/10">
      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {/* Company Info */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity w-fit">
              <Image
                src="/images/logo-ai-assistant.png"
                alt="AI Hotel Assistant Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
              <span className="text-xl font-bold text-white tracking-tight">AI Hotel Assistant</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              An all-in-one AI-powered hotel operating system for modern properties.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-brand-muted" aria-hidden="true" />
                <span className="text-gray-400">
                  2 Frederick Street, Kings Cross<br />
                  London, WC1X 0ND, UK
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/features" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/#contact" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="https://docs.aihotelassistant.com" className="text-sm hover:text-brand-accent transition-colors inline-block">
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Get in Touch</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="tel:+447448810068" 
                  className="flex items-center gap-2 text-sm hover:text-brand-accent transition-colors group"
                  aria-label="Call us at +44 7448 810068"
                >
                  <Phone className="w-4 h-4 text-brand-muted group-hover:text-brand-accent transition-colors" aria-hidden="true" />
                  +44 7448 810068
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@aihotelassistant.com" 
                  className="flex items-center gap-2 text-sm hover:text-white transition-colors group"
                >
                  <Mail className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                  support@aihotelassistant.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © {currentYear} PROINVEST GLOBAL LTD. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  )
}
