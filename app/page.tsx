'use client'

import { LandingHeader } from './components/LandingHeader'
import { LandingHero } from './components/LandingHero'
import { FeaturesStrip } from './components/FeaturesStrip'

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <LandingHero />
      <FeaturesStrip />
    </>
  )
}
