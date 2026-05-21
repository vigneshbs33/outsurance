'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TERM_INSURANCE_DETAILS } from '../data/checkout.data';

export function DetailsAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="border border-neutral-200 rounded-[2px] bg-white text-black font-mono">
      <button
        onClick={toggleOpen}
        type="button"
        className="w-full flex justify-between items-center px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors text-xs uppercase tracking-wider font-bold cursor-pointer outline-none"
      >
        <span>Know More about life insurance</span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-neutral-200 space-y-6 text-xs text-neutral-600 leading-relaxed max-h-[400px] overflow-y-auto">
          <div className="space-y-3">
            <h4 className="font-bold text-black uppercase tracking-wider text-[11px]">Term Life Insurance</h4>
            {TERM_INSURANCE_DETAILS.description.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-black uppercase tracking-wider text-[11px]">Benefits of Term Life Insurance</h4>
            {TERM_INSURANCE_DETAILS.benefits.map((benefit, index) => (
              <div key={index} className="space-y-1.5">
                <h5 className="font-bold text-neutral-800 uppercase text-[10px] tracking-wide">{benefit.title}</h5>
                <ul className="list-disc pl-4 space-y-1">
                  {benefit.bullets.map((bullet, bulletIdx) => (
                    <li key={bulletIdx}>{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-black uppercase tracking-wider text-[11px]">Key Terms when comparing Term Life insurance plans</h4>
            <ul className="list-disc pl-4 space-y-1">
              {TERM_INSURANCE_DETAILS.keyTerms.map((term, index) => (
                <li key={index}>{term}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
