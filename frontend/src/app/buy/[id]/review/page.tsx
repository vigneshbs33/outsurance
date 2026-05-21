'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanDetail } from '@/hooks/use-plan-detail';
import Sidebar from '@/components/Sidebar';
import { BuyPayFor, BuyPaymentMode } from '@/enums/buy.enum';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewPage({ params }: PageProps) {
  const router = useRouter();
  const { id: rawId } = use(params);
  const planId = parseInt(rawId, 10);
  const { plan, loading } = usePlanDetail(planId);

  const [checkoutData, setCheckoutData] = useState<Record<string, unknown> | null>(null);
  const [consentWhatsapp, setConsentWhatsapp] = useState(false);
  const [consentAutoDebit, setConsentAutoDebit] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sb-checkout-${planId}`);
      if (saved) {
        try {
          setCheckoutData(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [planId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white lg:flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <span className="h-8 w-8 border-2 border-black border-t-transparent animate-spin rounded-full inline-block" />
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest">Loading review...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!plan || !checkoutData) {
    return (
      <div className="min-h-screen bg-white lg:flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-[480px] mx-auto pt-16">
            <p className="font-mono text-xs text-neutral-500">Checkout session not found.</p>
            <button
              onClick={() => router.push(`/buy/${planId}`)}
              className="mt-4 px-4 py-2 border border-black font-mono text-[10px] uppercase tracking-wider hover:bg-neutral-50 transition-colors rounded-[2px]"
            >
              Start checkout
            </button>
          </div>
        </main>
      </div>
    );
  }

  const annualPremium = plan.annual_premium;
  const isMonthly = checkoutData.paymentMode === BuyPaymentMode.MONTHLY;
  const estimatedPremium = isMonthly ? Math.round(annualPremium / 12) : annualPremium;

  const handleCheckout = () => {
    if (!consentTerms) {
      alert('You must agree to the Terms and Conditions to proceed.');
      return;
    }
    router.push(`/buy/${planId}/payment`);
  };

  return (
    <div className="min-h-screen bg-white lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 py-8 md:px-8 bg-white text-black">
        <div className="max-w-[720px] mx-auto space-y-8 pb-24">
          
          <header className="flex justify-between items-center border-b border-neutral-200 pb-4">
            <button
              onClick={() => router.push(`/buy/${planId}`)}
              className="font-mono text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors cursor-pointer"
            >
              ← Edit Details
            </button>
            <span className="font-mono text-xs font-bold text-black uppercase tracking-wider">
              {plan.insurer}
            </span>
          </header>

          <div className="space-y-2">
            <h1 className="font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight text-black leading-tight">
              Review Purchase Details
            </h1>
            <p className="font-mono text-xs text-neutral-500">
              Please verify all details before payment. They cannot be modified after compilation.
            </p>
          </div>

          <div className="space-y-6">
            <div className="border border-neutral-200 p-6 rounded-[2px] space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold block">
                Personal Information
              </span>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 font-mono text-xs text-black border-t border-neutral-100 pt-3">
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Full Name</span>
                  <span className="font-bold">{String(checkoutData.username)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Email</span>
                  <span className="font-bold">{String(checkoutData.email)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Annual Income</span>
                  <span className="font-bold">₹{Number(checkoutData.income).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Occupation</span>
                  <span className="font-bold uppercase">{String(checkoutData.occupation)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Education</span>
                  <span className="font-bold uppercase">{String(checkoutData.education)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Nationality</span>
                  <span className="font-bold uppercase">{String(checkoutData.nationality)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">PIN Code</span>
                  <span className="font-bold">{String(checkoutData.pincode)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">City</span>
                  <span className="font-bold">{String(checkoutData.city)}</span>
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 p-6 rounded-[2px] space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold block">
                Medical & Risk Details
              </span>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 font-mono text-xs text-black border-t border-neutral-100 pt-3">
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Tobacco User</span>
                  <span className="font-bold">NO</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Medical History</span>
                  <span className="font-bold uppercase">{String(checkoutData.medicalhistory)}</span>
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 p-6 rounded-[2px] space-y-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 font-bold block">
                Plan Selection Info
              </span>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 font-mono text-xs text-black border-t border-neutral-100 pt-3">
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Life Cover Sum</span>
                  <span className="font-bold uppercase">{String(checkoutData.lifeCover)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Cover For Age</span>
                  <span className="font-bold uppercase">{String(checkoutData.CoverFor)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Pay Policy For</span>
                  <span className="font-bold uppercase">{String(checkoutData.payFor)}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Payment Mode</span>
                  <span className="font-bold uppercase">{String(checkoutData.paymentMode)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-400 block text-[9px] uppercase">Riders / Upgrades Selected</span>
                  <span className="font-bold uppercase">{String(checkoutData.planOptions)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-neutral-200 pt-6">
              <label className="flex items-start gap-3 cursor-pointer text-xs font-mono text-black">
                <input
                  type="checkbox"
                  checked={consentWhatsapp}
                  onChange={(e) => setConsentWhatsapp(e.target.checked)}
                  className="accent-black h-4 w-4 mt-0.5"
                />
                <span>I hereby consent to receive communication from {plan.insurer} or its authorized representatives through WhatsApp.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer text-xs font-mono text-black">
                <input
                  type="checkbox"
                  checked={consentAutoDebit}
                  onChange={(e) => setConsentAutoDebit(e.target.checked)}
                  className="accent-black h-4 w-4 mt-0.5"
                />
                <span>I agree to opt for Auto Debit for all the future premium payments of this policy.</span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer text-xs font-mono text-black">
                <input
                  type="checkbox"
                  checked={consentTerms}
                  onChange={(e) => setConsentTerms(e.target.checked)}
                  className="accent-black h-4 w-4 mt-0.5"
                />
                <span className="font-bold">I agree to the terms and conditions and confirm that the details provided are correct.</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center border-t border-neutral-200 pt-6 gap-4">
              <div className="text-center sm:text-left space-y-1">
                <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 block">Total Premium Due</span>
                <span className="font-mono text-2xl font-black text-black">
                  ₹{estimatedPremium.toLocaleString('en-IN')}
                  <span className="text-xs font-normal lowercase text-neutral-500">
                    /{isMonthly ? 'mo' : 'yr'}
                  </span>
                </span>
                <span className="font-mono text-[9px] text-neutral-400 block">Inclusive of GST</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full sm:w-auto px-8 h-12 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-[2px] cursor-pointer"
              >
                Checkout & Pay
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
