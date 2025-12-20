import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'
import { LandingPageClient } from '@/components/marketing/LandingPageClient'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <LandingPageClient />
      </main>
      <Footer />
    </>
  )
}
