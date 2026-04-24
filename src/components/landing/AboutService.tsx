import HeroSection from "./HeroSection";
import ServiceDescription from "./ServiceDescription";
import Features from "./Features";
import Pricing from "./Pricing";
import { Dispatch, SetStateAction } from "react";
 
type AboutServiceProps = {
  setActiveTab: Dispatch<SetStateAction<"about" | "get" | "admin">>;
};

export default function AboutService({setActiveTab}: AboutServiceProps) {
  return (
    <div>
      <HeroSection setActiveTab={setActiveTab} />
      <ServiceDescription />
      <Features />
      <Pricing />
    </div>
  );
}