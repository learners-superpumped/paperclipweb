"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  { text: "Setting up your company...", delay: 0 },
  { text: "CEO agent is getting ready to work", delay: 2000 },
  { text: "Starting market research...", delay: 4000 },
  { text: "Analyzing competitors...", delay: 7000 },
  { text: "Preparing your first task...", delay: 10000 },
  { text: "Setup complete!", delay: 13000 },
];

interface LoadingAnimationProps {
  onComplete: () => void;
}

export function LoadingAnimation({ onComplete }: LoadingAnimationProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
        if (index > 0) {
          setCompletedSteps((prev) => [...prev, index - 1]);
        }
      }, step.delay);
      timers.push(timer);
    });

    const finalTimer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, STEPS.length - 1]);
    }, 14000);
    timers.push(finalTimer);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 16000);
    timers.push(completeTimer);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-12">
          <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>

        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            const isCurrent = currentStep === index && !isCompleted;
            const isVisible = index <= currentStep;

            if (!isVisible) return null;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
              >
                {isCompleted ? (
                  <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : isCurrent ? (
                  <Loader2 className="h-6 w-6 text-primary animate-spin shrink-0" />
                ) : (
                  <div className="h-6 w-6 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    isCompleted
                      ? "text-secondary-400"
                      : isCurrent
                      ? "text-white font-medium"
                      : "text-secondary-500"
                  }`}
                >
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
