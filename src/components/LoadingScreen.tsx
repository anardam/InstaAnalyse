"use client";

import { useState, useEffect } from "react";

const STEPS = [
  { message: "Connecting to Instagram...", icon: "🔗" },
  { message: "Fetching profile data...", icon: "📊" },
  { message: "Analyzing engagement metrics...", icon: "📈" },
  { message: "Evaluating content strategy...", icon: "🎯" },
  { message: "Running AI deep analysis...", icon: "🤖" },
  { message: "Generating growth roadmap...", icon: "🗺️" },
  { message: "Computing monetisation potential...", icon: "💰" },
  { message: "Compiling your report...", icon: "📋" },
];

export default function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0a0a0f]/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Animated gradient orb */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-pulse-slow opacity-80 blur-sm" />
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 animate-pulse absolute opacity-60" />
        </div>

        <h2 className="text-2xl font-bold text-center mb-2 gradient-text">
          Analyzing Profile
        </h2>
        <p className="text-gray-400 text-center mb-8 text-sm">
          This may take 2-4 minutes — generating a detailed report
        </p>

        {/* Progress steps */}
        <div className="space-y-3">
          {STEPS.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-500 ${
                index < currentStep
                  ? "bg-purple-500/10 text-purple-300"
                  : index === currentStep
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white"
                    : "text-gray-600"
              }`}
            >
              <span className="text-lg w-8 text-center">
                {index < currentStep ? (
                  <svg
                    className="w-5 h-5 text-green-400 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : index === currentStep ? (
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <span className="opacity-40">{step.icon}</span>
                )}
              </span>
              <span className="text-sm font-medium">{step.message}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${((currentStep + 1) / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
