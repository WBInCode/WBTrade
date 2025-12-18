'use client';

import React from 'react';

interface CheckoutStepsProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: 'Adres', shortName: 'Adres' },
  { id: 2, name: 'Dostawa', shortName: 'Dostawa' },
  { id: 3, name: 'Płatność', shortName: 'Płatność' },
  { id: 4, name: 'Podsumowanie', shortName: 'Suma' },
];

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.id}
            className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}
          >
            {/* Connector line */}
            {stepIdx !== steps.length - 1 && (
              <div
                className="absolute top-4 left-7 -right-5 sm:left-8 sm:-right-12 h-0.5"
                aria-hidden="true"
              >
                <div
                  className={`h-full ${
                    step.id < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}

            <div className="relative flex flex-col items-center group">
              {/* Step circle */}
              <span
                className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium
                  transition-all duration-200
                  ${step.id < currentStep
                    ? 'bg-orange-500 text-white'
                    : step.id === currentStep
                    ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {step.id < currentStep ? (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </span>

              {/* Step name */}
              <span
                className={`
                  mt-2 text-xs sm:text-sm font-medium
                  ${step.id <= currentStep ? 'text-orange-600' : 'text-gray-500'}
                `}
              >
                <span className="hidden sm:inline">{step.name}</span>
                <span className="sm:hidden">{step.shortName}</span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
