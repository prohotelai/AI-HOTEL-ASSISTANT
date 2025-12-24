'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-brand-card border-b border-brand-border sticky top-0 z-50 backdrop-blur-md bg-brand-card/95 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity" aria-label="AI Hotel Assistant Home">
            <Image
              src="/images/logo.png"
              alt="AI Hotel Assistant Logo"
              width={56}
              height={56}
              className="logo logo-md logo-on-light"
              priority
            />
            <span className="text-xl font-bold text-brand-text tracking-tight">AI Hotel Assistant</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/features" 
              className="text-brand-muted hover:text-brand-primary transition-colors font-medium"
              aria-label="View Features"
            >
              Features
            </Link>
            <Link 
              href="/pricing" 
              className="text-brand-muted hover:text-brand-primary transition-colors font-medium"
              aria-label="View Pricing"
            >
              Pricing
            </Link>
            <Link 
              href="/login" 
              className="text-brand-muted hover:text-brand-primary transition-colors font-medium"
              aria-label="Login to your account"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="bg-brand-primary text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-primary-dark transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
              aria-label="Get started with AI Hotel Assistant"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-brand-text hover:bg-brand-bg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-brand-border animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link 
                href="/features" 
                className="text-brand-muted hover:text-brand-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-brand-bg active:scale-95 transition-transform"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="/pricing" 
                className="text-brand-muted hover:text-brand-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-brand-bg active:scale-95 transition-transform"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                href="/login" 
                className="text-brand-muted hover:text-brand-primary transition-colors font-medium py-2 px-3 rounded-lg hover:bg-brand-bg active:scale-95 transition-transform"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                href="/register" 
                className="bg-brand-primary text-white px-6 py-3.5 rounded-xl font-semibold text-center hover:bg-brand-primary-dark transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 mt-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
