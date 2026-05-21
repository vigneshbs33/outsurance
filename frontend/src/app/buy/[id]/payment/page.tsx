'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { paymentCardSchema, type PaymentCardInput } from '@/lib/validators/payment.validators';
import { usePlanDetail } from '@/hooks/use-plan-detail';
import Sidebar from '@/components/Sidebar';
import { BuyPaymentMethod, BuyPaymentMode } from '@/enums/buy.enum';
import { Check } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentPage({ params }: PageProps) {
  const router = useRouter();
  const { id: rawId } = use(params);
  const planId = parseInt(rawId, 10);
  const { plan, loading } = usePlanDetail(planId);

  const [checkoutData, setCheckoutData] = useState<Record<string, unknown> | null>(null);
  const [activeMethod, setActiveMethod] = useState<BuyPaymentMethod>(BuyPaymentMethod.DEBIT);
  const [showSuccess, setShowSuccess] = useState(false);
  const [simulatedUpi, setSimulatedUpi] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentCardInput>({
    resolver: zodResolver(paymentCardSchema),
    defaultValues: {
      cardNumber: '',
      cardName: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
    },
  });

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
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-widest">Loading gateway...</p>
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

  const handlePay = () => {
    setShowSuccess(true);
  };

  const handleUpiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedUpi.includes('@')) {
      alert('Please enter a valid UPI ID (e.g. user@okaxis)');
      return;
    }
    setShowSuccess(true);
  };

  return (
    <div className="min-h-screen bg-white lg:flex relative">
      <Sidebar />
      <main className="flex-1 px-4 py-8 md:px-8 bg-white text-black">
        <div className="max-w-[1000px] mx-auto space-y-8 pb-24">
          
          <header className="flex justify-between items-center border-b border-neutral-200 pb-4">
            <button
              onClick={() => router.push(`/buy/${planId}/review`)}
              className="font-mono text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors cursor-pointer"
            >
              ← Back to Review
            </button>
            <span className="font-mono text-xs font-bold text-black uppercase tracking-wider">
              Secure Checkout
            </span>
          </header>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-1">
                <h1 className="font-[var(--font-heading)] text-2xl font-black uppercase tracking-tight text-black leading-tight">
                  Choose Payment Method
                </h1>
                <p className="font-mono text-xs text-neutral-500">
                  Select your preferred payment channel to complete secure policy setup.
                </p>
              </div>

              <div className="grid grid-cols-5 border border-neutral-200 p-1 bg-neutral-50 rounded-[2px]">
                {Object.values(BuyPaymentMethod).map((method) => (
                  <button
                    key={method}
                    onClick={() => setActiveMethod(method)}
                    className={`h-9 font-mono text-[10px] uppercase tracking-wider transition-colors rounded-[2px] cursor-pointer ${
                      activeMethod === method
                        ? 'bg-black text-white'
                        : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="border border-neutral-200 p-6 rounded-[2px] bg-white space-y-6">
                {(activeMethod === BuyPaymentMethod.DEBIT || activeMethod === BuyPaymentMethod.CREDIT) && (
                  <form onSubmit={handleSubmit(handlePay)} className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                        {activeMethod} Card Details
                      </h3>
                      <div className="w-full h-[1px] bg-neutral-100" />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                        Card Number
                      </label>
                      <input
                        type="text"
                        {...register('cardNumber')}
                        placeholder="XXXX XXXX XXXX XXXX"
                        className="w-full h-10 border-b border-neutral-200 focus:border-black outline-none font-mono text-sm transition-all pb-1 rounded-[2px]"
                      />
                      {errors.cardNumber && (
                        <p className="font-mono text-[10px] text-neutral-500">{errors.cardNumber.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                        Name on Card
                      </label>
                      <input
                        type="text"
                        {...register('cardName')}
                        placeholder="Enter cardholder name"
                        className="w-full h-10 border-b border-neutral-200 focus:border-black outline-none font-mono text-sm transition-all pb-1 rounded-[2px]"
                      />
                      {errors.cardName && (
                        <p className="font-mono text-[10px] text-neutral-500">{errors.cardName.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                          Expiry Month
                        </label>
                        <select
                          {...register('expiryMonth')}
                          className="w-full h-10 border-b border-neutral-200 focus:border-black outline-none font-mono text-sm bg-white rounded-[2px]"
                        >
                          <option value="">MM</option>
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        {errors.expiryMonth && (
                          <p className="font-mono text-[10px] text-neutral-500">{errors.expiryMonth.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                          Expiry Year
                        </label>
                        <select
                          {...register('expiryYear')}
                          className="w-full h-10 border-b border-neutral-200 focus:border-black outline-none font-mono text-sm bg-white rounded-[2px]"
                        >
                          <option value="">YYYY</option>
                          {Array.from({ length: 15 }, (_, i) => String(2026 + i)).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                        {errors.expiryYear && (
                          <p className="font-mono text-[10px] text-neutral-500">{errors.expiryYear.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                          CVV
                        </label>
                        <input
                          type="password"
                          maxLength={3}
                          {...register('cvv')}
                          placeholder="***"
                          className="w-full h-10 border-b border-neutral-200 focus:border-black outline-none font-mono text-sm transition-all pb-1 rounded-[2px] text-center"
                        />
                        {errors.cvv && (
                          <p className="font-mono text-[10px] text-neutral-500">{errors.cvv.message}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-[2px] cursor-pointer mt-4"
                    >
                      Pay ₹{estimatedPremium.toLocaleString('en-IN')} Secured
                    </button>
                  </form>
                )}

                {activeMethod === BuyPaymentMethod.UPI && (
                  <form onSubmit={handleUpiSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                        UPI Address (VPA)
                      </h3>
                      <div className="w-full h-[1px] bg-neutral-100" />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-mono text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                        UPI ID
                      </label>
                      <input
                        type="text"
                        value={simulatedUpi}
                        onChange={(e) => setSimulatedUpi(e.target.value)}
                        placeholder="e.g. mobile@upi"
                        className="w-full h-10 border-b border-neutral-200 focus:border-black outline-none font-mono text-sm transition-all pb-1 rounded-[2px]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-[2px] cursor-pointer mt-4"
                    >
                      Verify & Pay ₹{estimatedPremium.toLocaleString('en-IN')}
                    </button>
                  </form>
                )}

                {(activeMethod === BuyPaymentMethod.NETBANKING || activeMethod === BuyPaymentMethod.WALLET) && (
                  <div className="space-y-4 text-center py-6">
                    <p className="font-mono text-xs text-neutral-500">
                      Simulated Netbanking / Wallet provider redirection interface.
                    </p>
                    <button
                      onClick={handlePay}
                      className="px-6 h-11 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-[2px] cursor-pointer"
                    >
                      Complete payment of ₹{estimatedPremium.toLocaleString('en-IN')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="border border-neutral-200 p-6 rounded-[2px] bg-neutral-50 space-y-4 font-mono text-xs">
                <span className="font-bold text-[10px] uppercase tracking-widest text-neutral-400 block pb-1 border-b border-neutral-200">
                  Proposer Details
                </span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Email</span>
                    <span className="font-bold">{String(checkoutData.email)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Contact</span>
                    <span className="font-bold">8******467</span>
                  </div>
                </div>
              </div>

              <div className="border border-neutral-200 p-6 rounded-[2px] bg-neutral-50 space-y-4 font-mono text-xs">
                <div className="flex justify-between items-center pb-1 border-b border-neutral-200">
                  <span className="font-bold text-[10px] uppercase tracking-widest text-neutral-400">
                    Your Cart
                  </span>
                  <span className="text-[10px] text-neutral-400 uppercase">
                    Order No. PG-{planId}-7150
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Insurer</span>
                    <span className="font-bold uppercase">{plan.insurer}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Policy Type</span>
                    <span className="font-bold uppercase">{plan.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Policy No.</span>
                    <span className="font-bold">PB27442600194285454</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Amount</span>
                    <span className="font-bold">₹{estimatedPremium.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="border-t border-neutral-200 pt-4 flex justify-between items-center font-bold text-sm">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400">Total Premium</p>
                    <p className="text-[9px] text-neutral-400 font-normal lowercase tracking-normal">(Inclusive GST)</p>
                  </div>
                  <span className="text-black">₹{estimatedPremium.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-black p-8 max-w-[400px] w-full text-center space-y-6 rounded-[2px] animate-scaleUp">
            <div className="h-16 w-16 bg-black text-white mx-auto flex items-center justify-center rounded-full">
              <Check className="h-8 w-8 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <h3 className="font-[var(--font-heading)] text-lg font-black uppercase tracking-tight text-black">
                Order Complete
              </h3>
              <p className="font-mono text-xs leading-5 text-neutral-500">
                Your health policy has been successfully issued. Secure documents have been compiled and sent to your email.
              </p>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem(`sb-checkout-${planId}`);
                router.push('/dashboard');
              }}
              className="w-full h-11 bg-black text-white hover:bg-neutral-900 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-[2px] cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
