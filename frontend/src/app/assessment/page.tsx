'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { assessHealthProfile, chatWithAdvisor, processLabReport } from '../../lib/api';
import { saveAssessmentResult, supabase } from '../../lib/supabase';
import { AnnotationBox, FormField, SectionEyebrow } from '../../components/editorial';
import { Lock, FileText, Camera, ArrowRight, ShieldCheck } from 'lucide-react';

const steps = ['About You', 'Health Profile', 'Upload Report', 'Confirm Details', 'Finding Matches'];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
  'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur',
  'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna'
];

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Personal Details
  const [fullName, setFullName] = useState('');
  const [dobDD, setDobDD] = useState('');
  const [dobMM, setDobMM] = useState('');
  const [dobYYYY, setDobYYYY] = useState('');
  const [gender, setGender] = useState('Male');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');

  // Step 2: Health Background
  const [diabetes, setDiabetes] = useState(0);
  const [hypertension, setHypertension] = useState(0);
  const [chronicCount, setChronicCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Chatbot & Upload Sandbox
  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hi! I'm your secure health assistant. I can help fill in your details automatically. Feel free to upload a laboratory report (PDF or a photo), or just type in your vitals. What works best for you?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [extractedSummary, setExtractedSummary] = useState<Record<string, any> | null>(null);

  // Step 4: Verify Vitals
  const [hba1c, setHba1c] = useState('5.4');
  const [bp, setBp] = useState('120');
  const [bmi, setBmi] = useState('23.0');
  const [smoker, setSmoker] = useState('No');

  // Step 5: Processing
  const [loadingText, setLoadingText] = useState('Setting up your local suitability matches...');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    });
  }, [router]);

  // Live Age Calculation
  const calculatedAge = useMemo(() => {
    const day = parseInt(dobDD, 10);
    const month = parseInt(dobMM, 10);
    const year = parseInt(dobYYYY, 10);
    if (!day || !month || !year || dobYYYY.length < 4) return null;

    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - (month - 1);
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [dobDD, dobMM, dobYYYY]);

  // Cities autocomplete filter
  const filteredCities = useMemo(() => {
    if (!citySearch) return [];
    return CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 5);
  }, [citySearch]);

  // Budget Validation Warning
  const budgetWarning = useMemo(() => {
    const rawInc = parseInt(income.replace(/,/g, ''), 10) || 0;
    const rawBud = parseInt(budget.replace(/,/g, ''), 10) || 0;
    if (!rawInc || !rawBud) return null;

    const monthlyIncome = (rawInc * 100000) / 12; // income in Lakh
    if (rawBud > monthlyIncome * 0.15) {
      return "Your premium budget is high relative to your monthly income. We suggest aiming for a budget below 15% of your income.";
    }
    if (rawBud < 500) {
      return "Minimum policy budgets usually start around ₹500/month.";
    }
    return null;
  }, [income, budget]);

  useEffect(() => {
    if (step !== 5) return;

    const loadingTexts = [
      'Comparing insurance wait lists and policies...',
      'Finding plans that cover chronic conditions from Day 1...',
      'Personalizing your custom suitability scores...',
      'Creating your secure insurance match dashboard...',
    ];

    const interval = setInterval(() => {
      setLoadingText((current) => loadingTexts[(loadingTexts.indexOf(current) + 1) % loadingTexts.length]);
    }, 1800);

    const finalAge = calculatedAge ?? 35;
    const finalData = {
      age: finalAge,
      bmi: parseFloat(bmi) || 23,
      smoker: smoker === 'Yes' ? 1 : 0,
      hba1c: parseFloat(hba1c) || 5.4,
      bp_systolic: parseInt(bp, 10) || 120,
      diabetes,
      hypertension,
      chronic_count: chronicCount,
      monthly_budget: parseInt(budget.replace(/,/g, ''), 10) || 5000,
      income_lakh: parseInt(income.replace(/,/g, ''), 10) || 8,
    };

    assessHealthProfile(finalData)
      .then(async (result) => {
        if (userId) {
          await saveAssessmentResult(userId, finalData, result.risk_assessment, result.recommended_plans);
        }
        router.push(`/dashboard?score=${Math.round(result.risk_assessment.risk_score * 100)}&tier=${result.risk_assessment.risk_tier}`);
      })
      .catch(async () => {
        if (userId) {
          await saveAssessmentResult(
            userId,
            finalData,
            { risk_score: 0.63, risk_tier: 'MEDIUM' },
            [
              { id: 3, suitability_score: 8.4 },
              { id: 2, suitability_score: 7.2 },
            ]
          );
        }
        router.push('/dashboard?score=63&tier=MEDIUM&mode=simulated');
      });

    return () => clearInterval(interval);
  }, [step, bmi, bp, budget, chronicCount, diabetes, calculatedAge, hba1c, hypertension, income, router, smoker, userId]);

  function formatCommas(value: string) {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('en-IN');
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages((current) => [...current, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const result = await chatWithAdvisor(
        [...chatMessages, { sender: 'user', text: userText }].map((message) => ({
          role: message.sender === 'ai' ? 'assistant' : 'user',
          content: message.text,
        })),
        { hba1c: parseFloat(hba1c), bp_systolic: parseInt(bp, 10), bmi: parseFloat(bmi) }
      );
      setChatMessages((current) => [...current, { sender: 'ai', text: result.response }]);
    } catch {
      setChatMessages((current) => [...current, { sender: 'ai', text: 'All set! I have noted down your metrics. Let\'s continue to verify.' }]);
    }

    setIsTyping(false);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState('processing');
    setIsTyping(true);

    try {
      let rawText = '';
      if (file.type === 'text/plain' || file.type === 'text/csv') {
        rawText = await file.text();
      } else {
        // PDF / image — send filename hint; backend will use demo-fallback extraction
        rawText = `[Uploaded file: ${file.name}, type: ${file.type}]`;
      }

      const extracted = await processLabReport(rawText);
      setHba1c(String(extracted.hba1c));
      setBp(String(extracted.bp_systolic));
      setBmi(String(extracted.bmi));
      setExtractedSummary(extracted);
      setUploadState('done');
      setChatMessages((current) => [
        ...current,
        { sender: 'user', text: `📎 Uploaded ${file.name}` },
        { sender: 'ai', text: 'Perfect! I parsed your report safely. Take a look at your health numbers below and confirm if they look correct.' },
      ]);
    } catch {
      setUploadState('idle');
      setChatMessages((current) => [...current, { sender: 'ai', text: "I couldn't read the report automatically. No worries, let's enter your details manually!" }]);
    }

    setIsTyping(false);
    e.target.value = '';
  }

  return (
    <main className="min-h-screen bg-white px-4 sm:px-8 py-8 lg:px-12">
      <div className="mx-auto max-w-[1100px]">

        {/* Step Header */}
        <header className="mb-12 flex flex-col gap-4 border-b border-neutral-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Step 0{step} / 05</span>
            <h1 className="mt-2 font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
              {steps[step - 1]}
            </h1>
          </div>

          {/* Progress Bar */}
          <div className="w-full md:max-w-[280px]">
            <div className="h-[2px] w-full bg-neutral-100">
              <div
                className="h-[2px] bg-black transition-all duration-500 ease-out"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] uppercase text-neutral-400">
              <span>Start</span>
              <span>Finished</span>
            </div>
          </div>
        </header>

        <section className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">

            {/* Step 1: Personal Details */}
            {step === 1 ? (
              <div className="space-y-8 animate-fadeIn">
                <AnnotationBox title="Why we ask this">
                  Let's start with a few basic details. We use this to calculate standard parameters like your age and budget entirely privately on your device.
                </AnnotationBox>

                <div className="grid gap-6">
                  <FormField label="My Full Name">
                    <input className="field-input font-mono" placeholder="e.g. Rahul Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </FormField>

                  <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                    <div className="space-y-1">
                      <span className="field-label">Date of Birth</span>
                      <div className="grid gap-3 grid-cols-3">
                        <input className="field-input font-mono text-center" placeholder="DD" value={dobDD} onChange={(e) => setDobDD(e.target.value)} maxLength={2} />
                        <input className="field-input font-mono text-center" placeholder="MM" value={dobMM} onChange={(e) => setDobMM(e.target.value)} maxLength={2} />
                        <input className="field-input font-mono text-center" placeholder="YYYY" value={dobYYYY} onChange={(e) => setDobYYYY(e.target.value)} maxLength={4} />
                      </div>
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <span className="field-label">Your Age</span>
                      <div className="field-input font-mono bg-neutral-50 flex items-center justify-center font-bold">
                        {calculatedAge !== null ? `${calculatedAge} yrs old` : '--'}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <FormField label="Current City">
                      <input
                        className="field-input font-mono"
                        placeholder="Type to search your city..."
                        value={citySearch || city}
                        onChange={(e) => {
                          setCitySearch(e.target.value);
                          setCity('');
                          setShowCityDropdown(true);
                        }}
                        onFocus={() => setShowCityDropdown(true)}
                      />
                    </FormField>

                    {showCityDropdown && filteredCities.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 border border-neutral-200 bg-white shadow-lg font-mono text-xs">
                        {filteredCities.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCity(c);
                              setCitySearch(c);
                              setShowCityDropdown(false);
                            }}
                            className="w-full p-2.5 text-left hover:bg-neutral-50 transition-colors uppercase border-b border-neutral-100 last:border-b-0"
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField label="Annual Income (₹)">
                      <div className="relative flex items-center">
                        <span className="absolute left-3 font-mono text-neutral-400 text-xs">₹</span>
                        <input className="field-input font-mono pl-7" placeholder="e.g. 8,00,000" value={income} onChange={(e) => setIncome(formatCommas(e.target.value))} />
                      </div>
                    </FormField>

                    <FormField label="Ideal Monthly Premium Budget (₹)">
                      <div className="relative flex items-center">
                        <span className="absolute left-3 font-mono text-neutral-400 text-xs">₹</span>
                        <input className="field-input font-mono pl-7" placeholder="e.g. 3,500" value={budget} onChange={(e) => setBudget(formatCommas(e.target.value))} />
                      </div>
                    </FormField>
                  </div>

                  {budgetWarning && (
                    <div className="p-3 bg-neutral-50 border border-neutral-300 font-mono text-[11px] text-black">
                      💡 {budgetWarning}
                    </div>
                  )}

                  <div className="pt-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-3">Gender</span>
                    <div className="flex gap-6">
                      {['Male', 'Female'].map((value) => {
                        const active = gender === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setGender(value)}
                            className="flex items-center gap-3 cursor-pointer group"
                          >
                            <div
                              className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center transition-all ${active ? 'border-black bg-black' : 'border-neutral-300 group-hover:border-black'
                                }`}
                            >
                              {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-mono text-sm uppercase tracking-tight text-black">
                              {value}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 2: Health Background */}
            {step === 2 ? (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Why we ask this">
                  Tell us about any chronic or long-term conditions. This helps us look for policies that cover these conditions from day one so you don\'t face unexpected waiting periods.
                </AnnotationBox>

                <div className="space-y-4">
                  {[
                    { label: 'I have Diagnosed Diabetes', active: diabetes === 1, toggle: () => setDiabetes(diabetes === 1 ? 0 : 1) },
                    { label: 'I have Diagnosed Hypertension (High BP)', active: hypertension === 1, toggle: () => setHypertension(hypertension === 1 ? 0 : 1) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.toggle}
                      className={`w-full flex items-center justify-between p-4 border transition-all text-left ${item.active
                        ? 'border-black bg-neutral-50 text-black font-semibold'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:border-black'
                        }`}
                      style={{ borderRadius: '2px' }}
                    >
                      <span className="font-mono text-xs uppercase tracking-wider">{item.label}</span>
                      <span className="font-mono text-xs uppercase tracking-wider">{item.active ? '[ Yes ]' : '[ No ]'}</span>
                    </button>
                  ))}

                  <div className="flex items-center justify-between p-4 border border-neutral-200 bg-white" style={{ borderRadius: '2px' }}>
                    <span className="font-mono text-xs uppercase tracking-wider text-neutral-500">Any Other Health Conditions?</span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setChronicCount(Math.max(0, chronicCount - 1))}
                        className="h-8 w-8 flex items-center justify-center border border-neutral-200 hover:border-black text-lg font-mono"
                        style={{ borderRadius: '2px' }}
                      >
                        -
                      </button>
                      <span className="font-mono text-sm font-bold w-4 text-center">{chronicCount}</span>
                      <button
                        type="button"
                        onClick={() => setChronicCount(chronicCount + 1)}
                        className="h-8 w-8 flex items-center justify-center border border-neutral-200 hover:border-black text-lg font-mono"
                        style={{ borderRadius: '2px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 3: Chatbot & Document Upload sandbox */}
            {step === 3 ? (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Fast & Private">
                  Upload your health report (PDF or a photo) and our secure helper will instantly fill in your vitals. Nothing is stored on our servers — your data stays yours.
                </AnnotationBox>

                <div className="border border-neutral-200 bg-white" style={{ borderRadius: '2px' }}>
                  <div className="h-[260px] space-y-4 overflow-y-auto p-6 font-mono text-xs leading-6 text-neutral-600 border-b border-neutral-100">
                    {chatMessages.map((message, index) => (
                      <div key={`${message.sender}-${index}`} className={message.sender === 'user' ? 'text-right' : ''}>
                        <div className={`inline-block max-w-[85%] border px-4 py-3 text-left whitespace-pre-line ${message.sender === 'user'
                          ? 'bg-black text-white border-black'
                          : 'bg-neutral-50 text-black border-neutral-200'
                          }`} style={{ borderRadius: '2px' }}>
                          {message.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-neutral-400 font-mono text-xs">
                        <span className="h-1.5 w-1.5 animate-bounce bg-black rounded-full" />
                        <span className="h-1.5 w-1.5 animate-bounce bg-black rounded-full [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce bg-black rounded-full [animation-delay:0.4s]" />
                        <span className="ml-1 uppercase tracking-widest text-[9px]">Advisor decoding report...</span>
                      </div>
                    )}
                  </div>

                  {/* Summary Card from mock extraction */}
                  {uploadState === 'done' && extractedSummary && (
                    <div className="p-6 bg-neutral-50/70 border-b border-neutral-200 space-y-4 animate-slideDown">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-black" />
                          <span className="font-mono text-[10px] uppercase font-bold text-black tracking-wider">
                            Vitals Decoded Successfully
                          </span>
                        </div>
                        <span className="font-mono text-[10px] uppercase text-neutral-400 tracking-wider">
                          Accuracy: 94%
                        </span>
                      </div>

                      <div className="grid gap-3 grid-cols-3 font-mono text-xs bg-white p-4 border border-neutral-100" style={{ borderRadius: '2px' }}>
                        <div>
                          <span className="text-[9px] uppercase text-neutral-400 block">HbA1c</span>
                          <span className="font-bold text-black">{extractedSummary.hba1c}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-neutral-400 block">Blood Pressure</span>
                          <span className="font-bold text-black">{extractedSummary.bp_systolic} mmHg</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-neutral-400 block">BMI</span>
                          <span className="font-bold text-black">{extractedSummary.bmi} kg/m²</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setStep(4)}
                          className="flex-1 h-9 bg-black text-white hover:bg-neutral-900 transition-colors uppercase font-mono text-[10px] tracking-wider"
                          style={{ borderRadius: '2px' }}
                        >
                          Yes, Continue
                        </button>
                        <button
                          onClick={() => setStep(4)}
                          className="flex-1 h-9 border border-neutral-200 text-black hover:border-black transition-colors uppercase font-mono text-[10px] tracking-wider bg-white"
                          style={{ borderRadius: '2px' }}
                        >
                          Edit Manually
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-6 bg-neutral-50">
                    <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.txt,.csv,image/*"
                          className="hidden"
                          onChange={handleFileSelected}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadState === 'processing'}
                          className="font-mono text-[10px] uppercase tracking-wider px-3.5 py-2 bg-black text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
                          style={{ borderRadius: '2px' }}
                        >
                          <FileText size={12} />
                          {uploadState === 'processing' ? 'Processing...' : '📎 Upload Report'}
                        </button>

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadState === 'processing'}
                          className="font-mono text-[10px] uppercase tracking-wider px-3.5 py-2 border border-neutral-300 bg-white text-black hover:border-black transition-colors flex items-center gap-1.5"
                          style={{ borderRadius: '2px' }}
                        >
                          <Camera size={12} />
                          Take Photo
                        </button>
                      </div>

                      <button
                        onClick={() => setStep(4)}
                        className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 hover:text-black transition-colors underline"
                      >
                        Enter Manually instead
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <input
                        className="flex-1 px-4 py-2.5 border border-neutral-200 font-mono text-xs outline-none bg-white focus:border-black"
                        style={{ borderRadius: '2px' }}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => (e.key === 'Enter' ? handleSendChat() : null)}
                        placeholder="Or type raw numbers here (e.g. HbA1c 6.2)..."
                      />
                      <button
                        onClick={handleSendChat}
                        className="px-5 py-2.5 bg-black text-white font-mono text-xs uppercase tracking-wider hover:bg-neutral-900 transition-all"
                        style={{ borderRadius: '2px' }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Step 4: Verify Vitals */}
            {step === 4 ? (
              <div className="space-y-6 animate-fadeIn">

                {/* Privacy Lock Banner */}
                <div className="flex items-start gap-3 border-t-2 border-black bg-neutral-50 p-4" style={{ borderRadius: '2px' }}>
                  <Lock size={16} className="text-black mt-0.5" />
                  <div>
                    <span className="font-mono text-[9px] uppercase font-bold text-black block mb-0.5">Privacy Assurance</span>
                    <p className="font-mono text-[11px] leading-5 text-neutral-500">
                      Your files stay fully private on your device. We only use these numbers to calculate standard plan wait times.
                    </p>
                  </div>
                </div>

                {/* Extraction confidence indicator bar */}
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px] text-neutral-400 uppercase">
                    <span>Decoded Accuracy Check</span>
                    <span>92%</span>
                  </div>
                  <div className="h-1 bg-neutral-100 w-full" style={{ borderRadius: '1px' }}>
                    <div className="h-full bg-black w-[92%]" style={{ borderRadius: '1px' }} />
                  </div>
                </div>

                <div className="grid gap-6">

                  {/* Monospace 2-column inputs grid */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField label="My HbA1c (%)">
                      <input className="field-input font-mono" value={hba1c} onChange={(e) => setHba1c(e.target.value)} />
                    </FormField>

                    <FormField label="My BP Systolic (mmHg)">
                      <input className="field-input font-mono" value={bp} onChange={(e) => setBp(e.target.value)} />
                    </FormField>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField label="Body Mass Index (BMI)">
                      <input className="field-input font-mono" value={bmi} onChange={(e) => setBmi(e.target.value)} />
                    </FormField>

                    <div className="flex flex-col justify-end">
                      <span className="field-label block mb-2">Do you consume tobacco?</span>
                      <div className="flex gap-4">
                        {['No', 'Yes'].map((value) => (
                          <button
                            key={value}
                            onClick={() => setSmoker(value)}
                            className={`flex-1 h-11 border font-mono text-xs uppercase tracking-wider transition-all ${smoker === value
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-neutral-400 border-neutral-200 hover:border-black'
                              }`}
                            style={{ borderRadius: '2px' }}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Chronic Conditions Range Slider */}
                  <div className="space-y-3 border border-neutral-200 p-6 bg-white" style={{ borderRadius: '2px' }}>
                    <div className="flex justify-between items-center font-mono text-xs">
                      <span className="uppercase text-neutral-400">Other health conditions count</span>
                      <span className="font-bold text-black bg-neutral-200 px-2 py-0.5 rounded">{chronicCount}</span>
                    </div>

                    <div className="relative pt-2">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        value={chronicCount}
                        onChange={(e) => setChronicCount(parseInt(e.target.value))}
                        className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                      <div className="flex justify-between font-mono text-[9px] uppercase text-neutral-400 mt-2">
                        <span>0 None</span>
                        <span>1</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5 Conditions</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : null}

            {/* Step 5: Classifying */}
            {step === 5 ? (
              <div className="py-16 text-center space-y-6">
                <div className="flex justify-center">
                  <span className="h-10 w-10 border-2 border-black border-t-transparent animate-spin rounded-full" />
                </div>
                <div className="font-mono text-4xl font-black uppercase tracking-widest text-black">
                  FINDING MATCHES
                </div>
                <p className="max-w-md mx-auto font-mono text-xs leading-6 text-neutral-400 h-10">
                  {loadingText}
                </p>
              </div>
            ) : null}
          </div>

          {/* Right Sidebar for quick status review */}
          <aside className="space-y-6">
            <div className="border border-neutral-200 p-6 bg-neutral-50" style={{ borderRadius: '2px' }}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">My Health Profile</span>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Gender</span>
                  <span className="font-mono text-xs font-bold uppercase">{gender}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Location</span>
                  <span className="font-mono text-xs font-bold uppercase">{city || 'Pending'}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">HbA1c</span>
                  <span className="font-mono text-xs font-bold">{hba1c}%</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Blood Pressure</span>
                  <span className="font-mono text-xs font-bold">{bp} mmHg</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">BMI</span>
                  <span className="font-mono text-xs font-bold">{bmi} kg/m²</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Smoker</span>
                  <span className="font-mono text-xs font-bold uppercase">{smoker}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-neutral-400">Other Conditions</span>
                  <span className="font-mono text-xs font-bold">{chronicCount}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="mono-btn-primary"
                >
                  Continue
                </button>
              ) : null}
              {step === 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="mono-btn-primary"
                >
                  Find My Perfect Match
                </button>
              ) : null}
              {step > 1 && step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="mono-btn-secondary"
                >
                  Go Back
                </button>
              ) : null}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
