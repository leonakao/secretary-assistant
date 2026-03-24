import { HeroSection } from './components/hero-section';
import { FeaturesSection } from './components/features-section';

export function HomePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <HeroSection />
      <FeaturesSection />
    </main>
  );
}
