'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buyDetailsSchema, type BuyDetailsInput } from '../../../lib/validators/buy.validators';
import {
  BuyOccupation,
  BuyEducation,
  BuyNationality,
  BuyMedicalHistory,
  BuyPlanOption,
  BuyPayFor,
  BuyPaymentMode,
} from '../../../enums/buy.enum';
import { usePlanDetail } from '../../../hooks/use-plan-detail';
import Sidebar from '../../../components/Sidebar';
import { DetailsAccordion } from '../../../components/DetailsAccordion';
import { OUTSURANCE_ADVANTAGES, WHY_BUY_REASONS } from '../../../data/checkout.data';
import { Coins, Scale, ShieldCheck, Activity, Clock, CheckCircle2 } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Coins,
  Scale,
  ShieldCheck,
  Activity,
  Clock,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BuyPage({ params }: PageProps) {
  const router = useRouter();
  const { id: rawId } = use(params);
  const planId = parseInt(rawId, 10);
  const { plan, loading } = usePlanDetail(planId);

  const [activeStep, setActiveStep] = useState(0);
  const [toast, setToast] = useState<{ content: string; title: string } | null>(null);
  const prevValuesRef = React.useRef({
    lifeCover: '',
    CoverFor: '',
    payFor: '',
    paymentMode: '',
  });

  const [isReady, setIsReady] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BuyDetailsInput>({
    resolver: zodResolver(buyDetailsSchema),
    defaultValues: {
      username: '',
      email: '',
      income: 0,
      occupation: BuyOccupation.SALARIED,
      education: BuyEducation.GRADUATE,
      lifeCover: '1crore',
      CoverFor: '35years',
      payFor: BuyPayFor.TEN_YEARS,
      paymentMode: BuyPaymentMode.MONTHLY,
      pincode: '',
      city: '',
      nationality: BuyNationality.RESIDENT_INDIAN,
      medicalhistory: BuyMedicalHistory.NO,
      planOptions: BuyPlanOption.ICRORE,
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sb-checkout-${planId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach((key) => {
            setValue(key as keyof BuyDetailsInput, parsed[key]);
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [planId, setValue]);

  const watchedValues = watch();

  useEffect(() => {
    const timer = setTimeout(() => {
      prevValuesRef.current = {
        lifeCover: watchedValues.lifeCover,
        CoverFor: watchedValues.CoverFor,
        payFor: watchedValues.payFor,
        paymentMode: watchedValues.paymentMode,
      };
      setIsReady(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const prev = prevValuesRef.current;
    let content = '';
    let title = '';

    if (watchedValues.lifeCover !== prev.lifeCover) {
      content = 'Life Cover updated to';
      const formatted = watchedValues.lifeCover.replace('crore', ' Crore').replace('lakh', ' Lacs');
      title = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } else if (watchedValues.CoverFor !== prev.CoverFor) {
      content = 'Cover For Age updated to';
      title = watchedValues.CoverFor.replace('years', ' Years');
    } else if (watchedValues.payFor !== prev.payFor) {
      content = 'Pay Policy For updated to';
      title = watchedValues.payFor === BuyPayFor.ONE_TIME ? 'One Time' : watchedValues.payFor.replace('years', ' Years');
    } else if (watchedValues.paymentMode !== prev.paymentMode) {
      content = 'Payment Frequency updated to';
      title = watchedValues.paymentMode === BuyPaymentMode.MONTHLY ? 'Monthly' : 'Yearly';
    }

    if (content && title) {
      setToast({ content, title });
      const timer = setTimeout(() => setToast(null), 3000);
      prevValuesRef.current = {
        lifeCover: watchedValues.lifeCover,
        CoverFor: watchedValues.CoverFor,
        payFor: watchedValues.payFor,
        paymentMode: watchedValues.paymentMode,
      };
      return () => clearTimeout(timer);
    }
  }, [watchedValues.lifeCover, watchedValues.CoverFor, watchedValues.payFor, watchedValues.paymentMode, isReady]);

  const handleNext = async () => {
    if (activeStep === 0) {
      if (!watchedValues.username || errors.username || !watchedValues.email || errors.email || !watchedValues.income || errors.income || errors.occupation || errors.education) {
        alert('Please fill out all fields in Step 1 correctly before proceeding.');
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (!watchedValues.pincode || errors.pincode || !watchedValues.city || errors.city || errors.nationality || errors.medicalhistory) {
        alert('Please fill out all fields in Step 2 correctly before proceeding.');
        return;
      }
      setActiveStep(2);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) setActiveStep((prev) => prev - 1);
  };

  const onSubmit = (data: BuyDetailsInput) => {
    localStorage.setItem(`sb-checkout-${planId}`, JSON.stringify(data));
    router.push(`/buy/${planId}/review`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0fdf4] lg:flex">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <span className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full inline-block" />
            <p className="text-sm text-emerald-700">Loading details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#f0fdf4] lg:flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <p className="text-sm text-neutral-500">Plan not found.</p>
        </main>
      </div>
    );
  }

  const steps = ['Personal Details', 'Additional Info', 'Plan Options'];

  const inputClass =
    'w-full h-11 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white';
  const selectClass =
    'w-full h-11 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all bg-white';
  const labelClass = 'block text-xs font-semibold text-gray-600 mb-1.5';

  return (
    <div className="min-h-screen bg-[#f0fdf4] lg:flex">
      <Sidebar />
      <main className="flex-1 px-4 py-8 md:px-10">
        <div className="max-w-[1040px] mx-auto space-y-8 pb-24">

          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/explorer/${planId}`)}
              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              ← Back
            </button>
            <span className="text-sm font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              {plan.insurer}
            </span>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-5">

              {/* Step progress */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
                <div className="flex items-center justify-between mb-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 flex-1">
                      <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 transition-all
                        ${i < activeStep ? 'bg-emerald-500 text-white' : i === activeStep ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {i < activeStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${i === activeStep ? 'text-emerald-700' : i < activeStep ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {step}
                      </span>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-[2px] mx-2 rounded-full ${i < activeStep ? 'bg-emerald-400' : 'bg-gray-100'}`} />
                      )}
                    </div>
                  ))}
                </div>
                {/* thin progress bar */}
                <div className="w-full bg-gray-100 h-1 rounded-full">
                  <div
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
                    style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Form card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <h2 className="text-lg font-bold text-gray-800 mb-6">{steps[activeStep]}</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {activeStep === 0 && (
                    <div className="space-y-5">
                      <div>
                        <label className={labelClass}>Full Name as per ID Proof</label>
                        <input type="text" {...register('username')} className={inputClass} placeholder="Enter your full name" />
                        {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
                      </div>

                      <div>
                        <label className={labelClass}>Email Address</label>
                        <input type="email" {...register('email')} className={inputClass} placeholder="email@example.com" />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                      </div>

                      <div>
                        <label className={labelClass}>Annual Income (₹)</label>
                        <input type="number" {...register('income', { valueAsNumber: true })} className={inputClass} placeholder="e.g. 800000" />
                        {errors.income && <p className="text-xs text-red-500 mt-1">{errors.income.message}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Occupation</label>
                          <select {...register('occupation')} className={selectClass}>
                            <option value={BuyOccupation.SALARIED}>Salaried</option>
                            <option value={BuyOccupation.SELF_EMPLOYED}>Self Employed</option>
                            <option value={BuyOccupation.RETIRED}>Retired</option>
                            <option value={BuyOccupation.STUDENT}>Student</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Education</label>
                          <select {...register('education')} className={selectClass}>
                            <option value={BuyEducation.POST_GRADUATE_AND_ABOVE}>Post-Graduate & Above</option>
                            <option value={BuyEducation.GRADUATE}>Graduate</option>
                            <option value={BuyEducation.TWELFTH}>12th Pass</option>
                            <option value={BuyEducation.TENTH}>10th Pass</option>
                            <option value={BuyEducation.BELOW_TENTH}>Below 10th</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Pincode</label>
                          <input type="text" {...register('pincode')} className={inputClass} placeholder="e.g. 110001" />
                          {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode.message}</p>}
                        </div>
                        <div>
                          <label className={labelClass}>City</label>
                          <input type="text" {...register('city')} className={inputClass} placeholder="e.g. New Delhi" />
                          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>}
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Nationality</label>
                        <select {...register('nationality')} className={selectClass}>
                          <option value={BuyNationality.RESIDENT_INDIAN}>Resident Indian</option>
                        </select>
                      </div>

                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Medical History
                        </label>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                          Is there any personal medical history of Heart Disease, Cancer, Stroke, Brain Tumor, Organ Transplant or severe chronic conditions?
                        </p>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="radio"
                              value={BuyMedicalHistory.YES}
                              {...register('medicalhistory')}
                              className="accent-emerald-500 h-4 w-4"
                            />
                            <span className="text-sm font-medium text-gray-700">Yes</span>
                          </label>
                          <label className="flex items-center gap-2.5 cursor-pointer group">
                            <input
                              type="radio"
                              value={BuyMedicalHistory.NO}
                              {...register('medicalhistory')}
                              className="accent-emerald-500 h-4 w-4"
                            />
                            <span className="text-sm font-medium text-gray-700">No</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="space-y-3">
                      <label className={labelClass}>Plan Payout / Upgrade Options</label>
                      {[
                        {
                          value: BuyPlanOption.ICRORE,
                          title: 'Base Cover Instalment',
                          desc: 'Full coverage sum paid in a single lump-sum instalment.',
                        },
                        {
                          value: BuyPlanOption.TEN_LAKH,
                          title: 'Lumpsum + Monthly Income (15 Yrs)',
                          desc: '₹10 Lakhs paid immediately, plus ₹49,320 monthly income paid to beneficiaries for 15 years.',
                        },
                        {
                          value: BuyPlanOption.TEN_LAKH_PLUS,
                          title: 'Lumpsum + Increasing Monthly Income (15 Yrs)',
                          desc: '₹10 Lakhs immediately, plus monthly income that increases annually up to ₹1,18,368.',
                        },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-all
                            ${watchedValues.planOptions === opt.value
                              ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-300'
                              : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'}`}
                        >
                          <input
                            type="radio"
                            value={opt.value}
                            {...register('planOptions')}
                            className="accent-emerald-500 h-4 w-4 mt-0.5 shrink-0"
                          />
                          <div>
                            <span className="text-sm font-semibold text-gray-800 block">{opt.title}</span>
                            <span className="text-xs text-gray-500 mt-0.5 block leading-relaxed">{opt.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={activeStep === 0}
                      className="px-5 h-10 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-all disabled:opacity-30 cursor-pointer"
                    >
                      Back
                    </button>

                    {activeStep < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm"
                      >
                        Continue →
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
                      >
                        Review & Proceed →
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div id="details-accordion" className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100">
                <DetailsAccordion />
              </div>
            </div>

            {/* Right: Plan Summary Sidebar */}
            <div className="space-y-4">
              {/* Plan card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 space-y-5">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold block mb-1">Active Plan</span>
                  <span className="text-base font-bold text-gray-800 block leading-snug">{plan.name}</span>
                  <span className="text-xs text-gray-400 block mt-0.5">{plan.insurer}</span>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Life Cover Limit', name: 'lifeCover', options: [
                      { value: '25lakh', label: '₹25 Lacs' },
                      { value: '50lakh', label: '₹50 Lacs' },
                      { value: '75lakh', label: '₹75 Lacs' },
                      { value: '1crore', label: '₹1 Crore' },
                      { value: '1.5crore', label: '₹1.5 Crore' },
                      { value: '2crore', label: '₹2 Crore' },
                      { value: '5crore', label: '₹5 Crore' },
                    ]},
                    { label: 'Cover For Age', name: 'CoverFor', options: [
                      { value: '32years', label: '32 Years' },
                      { value: '35years', label: '35 Years' },
                      { value: '40years', label: '40 Years' },
                      { value: '45years', label: '45 Years' },
                      { value: '50years', label: '50 Years' },
                      { value: '60years', label: '60 Years' },
                      { value: '75years', label: '75 Years' },
                    ]},
                    { label: 'Pay Policy For', name: 'payFor', options: [
                      { value: BuyPayFor.ONE_TIME, label: 'One Time' },
                      { value: BuyPayFor.FIVE_YEARS, label: '5 Years' },
                      { value: BuyPayFor.TEN_YEARS, label: '10 Years' },
                      { value: BuyPayFor.TWENTY_YEARS, label: '20 Years' },
                    ]},
                    { label: 'Payment Frequency', name: 'paymentMode', options: [
                      { value: BuyPaymentMode.MONTHLY, label: 'Monthly' },
                      { value: BuyPaymentMode.YEARLY, label: 'Yearly' },
                    ]},
                  ].map(({ label, name, options }) => (
                    <div key={name}>
                      <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">{label}</label>
                      <select
                        name={name}
                        value={(watchedValues as unknown as Record<string, string>)[name]}
                        onChange={(e) => setValue(name as keyof BuyDetailsInput, e.target.value as never)}
                        className="w-full h-9 border border-gray-200 rounded-lg px-2.5 text-xs bg-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      >
                        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold block mb-1">Estimated Premium</span>
                  <span className="text-2xl font-black text-gray-800">
                    ₹{watchedValues.paymentMode === BuyPaymentMode.MONTHLY
                      ? Math.round(plan.annual_premium / 12).toLocaleString('en-IN')
                      : plan.annual_premium.toLocaleString('en-IN')
                    }
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    /{watchedValues.paymentMode === BuyPaymentMode.MONTHLY ? 'month' : 'year'}
                  </span>
                  <p className="text-[10px] text-emerald-600 mt-1">Inclusive of GST</p>
                </div>
              </div>

              {/* Why buy */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Why Buy From Outsurance?</h3>
                <ul className="space-y-2">
                  {WHY_BUY_REASONS.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full h-8 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-all cursor-pointer"
                  onClick={() => {
                    document.getElementById('details-accordion')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Know More
                </button>
              </div>
            </div>
          </div>

          {/* Advantages section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-800">Outsurance Advantage</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-[700px]">
                When you buy insurance from us, you get more than just financial safety — simplified terms, claims support, and round-the-clock help.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {OUTSURANCE_ADVANTAGES.map((adv, idx) => {
                const IconComponent = iconMap[adv.iconName] || Coins;
                return (
                  <div key={idx} className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                    <div className="h-9 w-9 bg-emerald-500 text-white flex items-center justify-center rounded-lg">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{adv.title}</h4>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">{adv.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
            <span>{toast.content} <strong>{toast.title}</strong></span>
          </div>
        )}
      </main>
    </div>
  );
}
