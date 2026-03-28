import { HeroSection } from './components/hero-section';
import { FeaturesSection } from './components/features-section';
import { CtaSection } from './components/auth-section';

export function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <FeaturesSection />
      <div className="relative overflow-hidden">
        <CtaSection />
      </div>
    </main>
  );
}
