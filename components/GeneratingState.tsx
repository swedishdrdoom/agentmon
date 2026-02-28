"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Parsing files", icon: "📄", duration: 2000 },
  { label: "Analyzing agent", icon: "🔍", duration: 8000 },
  { label: "Generating card profile", icon: "🎨", duration: 10000 },
  { label: "Rendering card image", icon: "🖼️", duration: 10000 },
];

interface GeneratingStateProps {
  /** If provided, jump to this step immediately */
  currentStep?: number;
}

export function GeneratingState({ currentStep }: GeneratingStateProps) {
  const [activeStep, setActiveStep] = useState(currentStep ?? 0);

  useEffect(() => {
    if (currentStep !== undefined) {
      setActiveStep(currentStep);
      return;
    }

    // Auto-advance steps based on duration
    let totalDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (let i = 1; i < STEPS.length; i++) {
      totalDelay += STEPS[i - 1].duration;
      const timeout = setTimeout(() => setActiveStep(i), totalDelay);
      timeouts.push(timeout);
    }

    return () => timeouts.forEach(clearTimeout);
  }, [currentStep]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      {/* Spinning card animation */}
      <div className="relative w-32 h-44">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl animate-bounce">
            {STEPS[activeStep]?.icon}
          </span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {STEPS.map((step, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;

          return (
            <div
              key={step.label}
              className={`
                flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-500
                ${isActive ? "bg-primary/10 text-foreground" : ""}
                ${isComplete ? "text-muted-foreground" : ""}
                ${!isActive && !isComplete ? "text-muted-foreground/40" : ""}
              `}
            >
              <span className="w-5 text-center text-sm">
                {isComplete ? "✓" : isActive ? "◉" : "○"}
              </span>
              <span
                className={`text-sm ${isActive ? "font-medium" : ""}`}
              >
                {step.label}
                {isActive && (
                  <span className="inline-block ml-1 animate-pulse">...</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        This usually takes 15-30 seconds
      </p>
    </div>
  );
}
