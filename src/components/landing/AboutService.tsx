import HeroSection from "./HeroSection";
import ServiceDescription from "./ServiceDescription";
import Features from "./Features";
import Pricing from "./Pricing";
import Contact from "./Contact";

export default function AboutService() {
  return (
    <div>
      <HeroSection />
      <ServiceDescription />
      <Features />
      <Pricing />
      <Contact />
    </div>
  );
}