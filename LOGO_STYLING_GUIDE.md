/* ============================================
   LOGO STYLING SYSTEM - USAGE EXAMPLES
   CSS Variables + Tailwind Utilities
   
   Works with existing logo PNG:
   /public/images/ai-hotel-asistant.png
   ============================================ */

/* ============================================
   1. NAVBAR USAGE
   ============================================ */

// Navbar.tsx
<Image
  src="/images/ai-hotel-asistant.png"
  alt="AI Hotel Assistant Logo"
  width={40}
  height={40}
  className="logo logo-md logo-on-light"
/>

// With hover effect
<Image
  src="/images/ai-hotel-asistant.png"
  alt="Logo"
  className="logo logo-md logo-hover"
/>

// Responsive sizing
<Image
  src="/images/ai-hotel-asistant.png"
  alt="Logo"
  className="logo logo-responsive"
/>


/* ============================================
   2. FOOTER USAGE
   ============================================ */

<Image
  src="/images/ai-hotel-asistant.png"
  alt="AI Hotel Assistant Logo"
  width={40}
  height={40}
  className="logo logo-md logo-on-dark"
/>

// With glow on dark background
<Image
  src="/images/ai-hotel-asistant.png"
  alt="Logo"
  className="logo logo-md logo-on-dark logo-glow-soft"
/>


/* ============================================
   3. HERO SECTION USAGE
   ============================================ */

<Image
  src="/images/ai-hotel-asistant.png"
  alt="AI Hotel Assistant"
  width={96}
  height={96}
  className="logo logo-xl logo-glow-intense logo-float"
/>

// Or use Tailwind utilities directly
<Image
  src="/images/ai-hotel-asistant.png"
  alt="Logo"
  className="w-logo-xl animate-logo-float drop-shadow-logo-glow-intense"
/>


/* ============================================
   4. ICON-ONLY USAGE (Mobile)
   ============================================ */

// Show only logo on mobile, add text on desktop
<div className="flex items-center gap-2">
  <Image
    src="/images/ai-hotel-asistant.png"
    alt="Logo"
    className="logo logo-icon-only logo-sm"
  />
  <span className="logo-with-text text-xl font-bold">AI Hotel Assistant</span>
</div>


/* ============================================
   5. DIFFERENT SIZE VARIANTS
   ============================================ */

// Extra small - 24px
<Image src="/images/ai-hotel-asistant.png" className="logo logo-xs" />

// Small - 32px
<Image src="/images/ai-hotel-asistant.png" className="logo logo-sm" />

// Medium - 40px (default navbar)
<Image src="/images/ai-hotel-asistant.png" className="logo logo-md" />

// Large - 64px
<Image src="/images/ai-hotel-asistant.png" className="logo logo-lg" />

// Extra large - 96px (hero sections)
<Image src="/images/ai-hotel-asistant.png" className="logo logo-xl" />


/* ============================================
   6. GLOW EFFECTS
   ============================================ */

// Standard glow (for light backgrounds)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-md logo-glow"
/>

// Soft glow (subtle, for navbar)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-md logo-glow-soft"
/>

// Accent glow (green, for hover states)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-md logo-glow-accent"
/>

// Intense glow (for hero sections)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-xl logo-glow-intense"
/>


/* ============================================
   7. HOVER & INTERACTIVE STATES
   ============================================ */

// Lift up and glow on hover
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-md logo-hover"
/>

// Scale up and glow on hover
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-md logo-hover-scale"
/>

// Just glow on hover
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-md logo-hover-glow"
/>

// Clickable logo in button
<button className="flex items-center gap-2">
  <Image
    src="/images/ai-hotel-asistant.png"
    className="logo logo-sm logo-hover"
  />
  <span>Get Started</span>
</button>


/* ============================================
   8. BACKGROUND VARIANTS
   ============================================ */

// For light backgrounds (default)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-on-light"
/>

// For dark backgrounds
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-on-dark"
/>

// High contrast mode
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-high-contrast"
/>


/* ============================================
   9. ANIMATION CLASSES
   ============================================ */

// Float animation (smooth up/down)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-float"
/>

// Pulse animation (opacity + glow pulse)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-pulse"
/>

// Slow spin animation
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-spin"
/>

// Combine float + glow for hero
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo logo-xl logo-glow-intense logo-float"
/>


/* ============================================
   10. PRESET COMBINATIONS (Utility Classes)
   ============================================ */

// Navigation logo (40px, on light, hover effect)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo-nav"
/>

// Hero logo (96px, intense glow, floating)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo-hero"
/>

// Footer logo (32px, on dark background)
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo-footer"
/>

// Button icon logo
<Image
  src="/images/ai-hotel-asistant.png"
  className="logo-button"
/>


/* ============================================
   11. TAILWIND UTILITIES (Direct Usage)
   ============================================ */

// Using Tailwind width utilities
<Image
  src="/images/ai-hotel-asistant.png"
  className="w-logo-md"  // 40px
/>

// Using Tailwind drop shadow utilities
<Image
  src="/images/ai-hotel-asistant.png"
  className="drop-shadow-logo-glow"
/>

<Image
  src="/images/ai-hotel-asistant.png"
  className="drop-shadow-logo-glow-intense"
/>

// Using Tailwind animations
<Image
  src="/images/ai-hotel-asistant.png"
  className="animate-logo-float"
/>

<Image
  src="/images/ai-hotel-asistant.png"
  className="animate-logo-pulse"
/>

<Image
  src="/images/ai-hotel-asistant.png"
  className="animate-logo-spin"
/>


/* ============================================
   12. CSS VARIABLES (For Custom Styling)
   ============================================ */

// Access color variables directly
<div style={{
  color: 'var(--logo-primary)',
  textShadow: '0 0 12px var(--logo-glow-color)'
}}>
  Custom Element
</div>

// Or in custom CSS
.my-custom-logo {
  width: var(--logo-size-md);
  filter: drop-shadow(0 0 12px var(--logo-glow-color));
  transition: var(--logo-transition);
}


/* ============================================
   13. COMPLETE NAVBAR EXAMPLE
   ============================================ */

<nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
  <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
    
    {/* Logo + Text */}
    <Link href="/" className="flex items-center gap-2 group">
      <Image
        src="/images/ai-hotel-asistant.png"
        alt="AI Hotel Assistant"
        width={40}
        height={40}
        className="logo logo-md logo-on-light group-hover:logo-glow"
      />
      <span className="text-lg font-bold text-gray-900">
        AI Hotel Assistant
      </span>
    </Link>

    {/* Navigation Links */}
    <div className="flex items-center gap-6">
      <Link href="/features">Features</Link>
      <Link href="/pricing">Pricing</Link>
      <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <Image
          src="/images/ai-hotel-asistant.png"
          alt="Logo"
          width={20}
          height={20}
          className="logo logo-xs"
        />
        Get Started
      </button>
    </div>
  </div>
</nav>


/* ============================================
   14. COMPLETE HERO EXAMPLE
   ============================================ */

<section className="py-20 bg-gradient-to-br from-slate-950 to-slate-900">
  <div className="max-w-7xl mx-auto px-4 text-center">
    
    {/* Logo with animation */}
    <div className="flex justify-center mb-6">
      <Image
        src="/images/ai-hotel-asistant.png"
        alt="AI Hotel Assistant"
        width={96}
        height={96}
        className="logo-hero"  // Uses logo-xl + logo-glow-intense + logo-float
      />
    </div>

    {/* Heading */}
    <h1 className="text-5xl font-bold text-white mb-6">
      Transform Your Hotel Operations
    </h1>

    {/* CTA Button */}
    <button className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all">
      Get Started
    </button>
  </div>
</section>


/* ============================================
   15. FOOTER EXAMPLE
   ============================================ */

<footer className="bg-gray-900 text-white py-12">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-start gap-4 mb-8">
      <Image
        src="/images/ai-hotel-asistant.png"
        alt="Logo"
        width={40}
        height={40}
        className="logo-footer"
      />
      <div>
        <h3 className="text-xl font-bold mb-2">AI Hotel Assistant</h3>
        <p className="text-gray-400">
          AI-powered hotel operations platform
        </p>
      </div>
    </div>

    {/* Footer Links */}
    <div className="grid grid-cols-3 gap-8">
      <div>
        <h4 className="font-semibold mb-4">Product</h4>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/features">Features</Link></li>
          <li><Link href="/pricing">Pricing</Link></li>
        </ul>
      </div>
      {/* More columns */}
    </div>
  </div>
</footer>
