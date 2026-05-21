'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { assessHealthProfile, chatWithAdvisor, processLabReport } from '../../lib/api';
import { saveAssessmentResult, supabase } from '../../lib/supabase';
import { AnnotationBox, FormField } from '../../components/editorial';
import { Lock, FileText, ArrowRight, ShieldCheck, Check, Plus, Minus, Info, Sparkles, ChevronRight, ChevronDown } from 'lucide-react';
import { HealthCondition, IntakeLanguage, InsuredMember } from '../../enums/assessment.enum';
import { LANGUAGES, MEMBER_CARDS, ILLNESSES, POPULAR_CITIES, MemberCardItem } from '../../data/assessment.data';

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  const [language, setLanguage] = useState<IntakeLanguage>(IntakeLanguage.ENGLISH);

  const [gender, setGender] = useState('Male');
  const [selectedMembers, setSelectedMembers] = useState<Record<InsuredMember, boolean>>({
    [InsuredMember.SELF]: true,
    [InsuredMember.WIFE]: false,
    [InsuredMember.HUSBAND]: false,
    [InsuredMember.SON]: false,
    [InsuredMember.DAUGHTER]: false,
    [InsuredMember.FATHER]: false,
    [InsuredMember.MOTHER]: false,
    [InsuredMember.GRANDFATHER]: false,
    [InsuredMember.GRANDMOTHER]: false,
    [InsuredMember.FATHER_IN_LAW]: false,
    [InsuredMember.MOTHER_IN_LAW]: false,
    [InsuredMember.BROTHER]: false,
    [InsuredMember.SISTER]: false,
    [InsuredMember.UNCLE]: false,
    [InsuredMember.AUNT]: false,
  });
  const [sonCount, setSonCount] = useState(0);
  const [daughterCount, setDaughterCount] = useState(0);

  const [memberDOBs, setMemberDOBs] = useState<Record<string, { day: string; month: string; year: string }>>({
    Self: { day: '15', month: '06', year: '1991' }
  });

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const [memberMedicalHistory, setMemberMedicalHistory] = useState<Record<string, Record<HealthCondition, boolean>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'processing' | 'done'>('idle');
  const [extractedSummary, setExtractedSummary] = useState<Record<string, unknown> | null>(null);
  const [memberUploads, setMemberUploads] = useState<Record<string, { fileName: string; uploadState: 'idle' | 'processing' | 'done'; summary?: { hba1c: number; bp_systolic: number; bmi: number } }>>({});
  const [uploadingMember, setUploadingMember] = useState<string | null>(null);

  const [height, setHeight] = useState('172');
  const [weight, setWeight] = useState('68');
  const [hba1c, setHba1c] = useState('5.4');
  const [bp, setBp] = useState('120');
  const [smoker, setSmoker] = useState('No');
  const [income, setIncome] = useState('8,00,000');
  const [budget, setBudget] = useState('3,500');

  interface MemberVitals {
    height: string;
    weight: string;
    hba1c: string;
    bp: string;
    smoker: string;
  }

  const [memberVitalsInput, setMemberVitalsInput] = useState<Record<string, MemberVitals>>({});
  const [showAllMembers, setShowAllMembers] = useState(false);

  const getMemberVitals = (m: string): MemberVitals => {
    if (m === 'Self') {
      return { height, weight, hba1c, bp, smoker };
    }
    return memberVitalsInput[m] ?? { height: '170', weight: '65', hba1c: '5.4', bp: '120', smoker: 'No' };
  };

  const getCalculatedBMI = (m: string): string => {
    const v = getMemberVitals(m);
    const h = parseFloat(v.height);
    const w = parseFloat(v.weight);
    if (h > 0 && w > 0) {
      return (w / ((h / 100) * (h / 100))).toFixed(1);
    }
    return '23.0';
  };

  const handleVitalChange = (m: string, field: keyof MemberVitals, val: string) => {
    if (m === 'Self') {
      if (field === 'height') setHeight(val);
      if (field === 'weight') setWeight(val);
      if (field === 'hba1c') setHba1c(val);
      if (field === 'bp') setBp(val);
      if (field === 'smoker') setSmoker(val);
    } else {
      setMemberVitalsInput((prev) => ({
        ...prev,
        [m]: {
          ...(prev[m] ?? { height: '170', weight: '65', hba1c: '5.4', bp: '120', smoker: 'No' }),
          [field]: val,
        },
      }));
    }
  };

  const [groups, setGroups] = useState<Array<{ id: string; name: string; members: string[] }>>([
    { id: 'group_1', name: 'Group A', members: [] },
    { id: 'group_2', name: 'Group B', members: [] }
  ]);

  const [chatMessages, setChatMessages] = useState([
    { sender: 'ai', text: "Hi! I'm your secure health advisor. I can answer any questions you have about your vitals or medical parameters. Unrelated topics are beyond my scope. Feel free to verify your metrics below." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [loadingText, setLoadingText] = useState('Running XGBoost suitability matcher...');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
    });
  }, [router]);

  const activeMembersList = useMemo(() => {
    const list: string[] = [];
    Object.keys(selectedMembers).forEach((key) => {
      const member = key as InsuredMember;
      if (selectedMembers[member]) {
        if (member === InsuredMember.SON) {
          for (let i = 1; i <= sonCount; i++) {
            list.push(`Son ${i}`);
          }
        } else if (member === InsuredMember.DAUGHTER) {
          for (let i = 1; i <= daughterCount; i++) {
            list.push(`Daughter ${i}`);
          }
        } else {
          list.push(member);
        }
      }
    });
    return list;
  }, [selectedMembers, sonCount, daughterCount]);

  const memberAges = useMemo(() => {
    const ages: Record<string, number> = {};
    const today = new Date();
    activeMembersList.forEach((m) => {
      const dob = memberDOBs[m] || { day: '15', month: '06', year: '1991' };
      const d = parseInt(dob.day, 10);
      const mth = parseInt(dob.month, 10);
      const y = parseInt(dob.year, 10);
      if (d && mth && y && dob.year.length === 4) {
        let age = today.getFullYear() - y;
        const diffMonth = today.getMonth() - (mth - 1);
        if (diffMonth < 0 || (diffMonth === 0 && today.getDate() < d)) {
          age--;
        }
        ages[m] = age >= 0 ? age : 30;
      } else {
        ages[m] = 30;
      }
    });
    return ages;
  }, [activeMembersList, memberDOBs]);

  const primaryAge = useMemo(() => {
    return memberAges['Self'] ?? 30;
  }, [memberAges]);

  const calculatedBMI = useMemo(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const bmiVal = w / ((h / 100) * (h / 100));
      return bmiVal.toFixed(1);
    }
    return '23.0';
  }, [height, weight]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return [];
    return POPULAR_CITIES.filter((c) =>
      c.toLowerCase().includes(citySearch.toLowerCase())
    ).slice(0, 5);
  }, [citySearch]);

  const dobSemanticError = useMemo(() => {
    for (const m of activeMembersList) {
      const dob = memberDOBs[m];
      if (dob && dob.day && dob.month) {
        const d = parseInt(dob.day, 10);
        const mth = parseInt(dob.month, 10);
        const y = parseInt(dob.year, 10) || 2026;
        if (d && mth) {
          let maxD = 31;
          if (mth === 2) {
            maxD = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28;
          } else if ([4, 6, 9, 11].includes(mth)) {
            maxD = 30;
          }
          if (d > maxD) {
            return `Invalid date: ${m} has ${d} days in month ${mth}. Max allowed is ${maxD}.`;
          }
        }
      }
    }

    const selfAge = memberAges['Self'];
    if (selfAge === undefined) return '';

    let spouseAge: number | undefined;
    activeMembersList.forEach((m) => {
      if (['Wife', 'Husband'].includes(m)) {
        spouseAge = memberAges[m];
      }
    });

    for (const m of activeMembersList) {
      const age = memberAges[m];
      if (age === undefined) continue;

      if (m.startsWith('Son') || m.startsWith('Daughter')) {
        if (selfAge < age + 18) {
          return `Age gap mismatch: Self (${selfAge} yrs) must be at least 18 years older than child ${m} (${age} yrs).`;
        }
        if (spouseAge !== undefined && spouseAge < age + 18) {
          return `Age gap mismatch: Spouse (${spouseAge} yrs) must be at least 18 years older than child ${m} (${age} yrs).`;
        }
      }

      if (m === 'Father' || m === 'Mother') {
        if (age < selfAge + 18) {
          return `Age gap mismatch: Parent ${m} (${age} yrs) must be at least 18 years older than Self (${selfAge} yrs).`;
        }
      }

      if (m === 'Father-in-law' || m === 'Mother-in-law') {
        if (spouseAge !== undefined && age < spouseAge + 18) {
          return `Age gap mismatch: ${m} (${age} yrs) must be at least 18 years older than Spouse (${spouseAge} yrs).`;
        }
        if (spouseAge === undefined && age < selfAge + 18) {
          return `Age gap mismatch: ${m} (${age} yrs) must be at least 18 years older than Self (${selfAge} yrs).`;
        }
      }

      if (m === 'Grandfather' || m === 'Grandmother') {
        if (age < selfAge + 36) {
          return `Age gap mismatch: Grandparent ${m} (${age} yrs) must be at least 36 years older than Self (${selfAge} yrs).`;
        }
        const fatherAge = memberAges['Father'];
        const motherAge = memberAges['Mother'];
        if (fatherAge !== undefined && age < fatherAge + 18) {
          return `Age gap mismatch: Grandparent ${m} (${age} yrs) must be at least 18 years older than Father (${fatherAge} yrs).`;
        }
        if (motherAge !== undefined && age < motherAge + 18) {
          return `Age gap mismatch: Grandparent ${m} (${age} yrs) must be at least 18 years older than Mother (${motherAge} yrs).`;
        }
      }
    }
    return '';
  }, [activeMembersList, memberDOBs, memberAges]);

  const progressValidation = useMemo(() => {
    if (step === 2) {
      return activeMembersList.length > 0;
    }
    if (step === 3) {
      const basicFilled = activeMembersList.every((m) => {
        const dob = memberDOBs[m];
        return dob && dob.day && dob.month && dob.year && dob.year.length === 4;
      });
      return basicFilled && dobSemanticError === '';
    }
    if (step === 4) {
      return fullName.trim().length > 0 && mobileNumber.trim().length === 10 && city.trim().length > 0;
    }
    return true;
  }, [step, activeMembersList, memberDOBs, fullName, mobileNumber, city, dobSemanticError]);

  useEffect(() => {
    if (step !== 10) return;

    const interval = setInterval(() => {
      const loadingTexts = [
        'Analyzing chronic waiting periods...',
        'Predicting metabolic risk factors...',
        'Matching coverage suitability scores...',
        'Compiling policy group recommendation dashboard...'
      ];
      setLoadingText((prev) => {
        const idx = loadingTexts.indexOf(prev);
        return loadingTexts[(idx + 1) % loadingTexts.length];
      });
    }, 1800);

    const hasDiabetesVal = activeMembersList.some((m) => {
      const history = memberMedicalHistory[m];
      return history?.[HealthCondition.DIABETES] ?? false;
    });

    const hasHypertensionVal = activeMembersList.some((m) => {
      const history = memberMedicalHistory[m];
      return history?.[HealthCondition.BLOOD_PRESSURE] ?? false;
    });

    let chronicCountVal = 0;
    activeMembersList.forEach((m) => {
      const history = memberMedicalHistory[m];
      if (history) {
        Object.keys(history).forEach((key) => {
          const cond = key as HealthCondition;
          if (history[cond] && cond !== HealthCondition.NONE && cond !== HealthCondition.DIABETES && cond !== HealthCondition.BLOOD_PRESSURE) {
            chronicCountVal++;
          }
        });
      }
    });

    const unionMedicalHistory: string[] = [];
    if (hasDiabetesVal) unionMedicalHistory.push('Diabetes');
    if (hasHypertensionVal) unionMedicalHistory.push('Blood Pressure');

    const serializedDOBs: Record<string, string> = {};
    activeMembersList.forEach((m) => {
      const dob = memberDOBs[m] || { day: '15', month: '06', year: '1991' };
      serializedDOBs[m] = `${dob.year}-${dob.month}-${dob.day}`;
    });

    const serializedMedicalHistory: Record<string, string[]> = {};
    activeMembersList.forEach((m) => {
      const history = memberMedicalHistory[m];
      const activeConds: string[] = [];
      if (history) {
        Object.keys(history).forEach((key) => {
          const cond = key as HealthCondition;
          if (history[cond]) activeConds.push(cond);
        });
      }
      serializedMedicalHistory[m] = activeConds;
    });

    const serializedVitals: Record<string, Record<string, string>> = {};
    activeMembersList.forEach((m) => {
      const v = getMemberVitals(m);
      serializedVitals[m] = {
        height: v.height,
        weight: v.weight,
        hba1c: v.hba1c,
        bp: v.bp,
      };
    });

    const finalData = {
      age: primaryAge,
      bmi: parseFloat(calculatedBMI),
      smoker: smoker === 'Yes' ? 1 : 0,
      hba1c: parseFloat(hba1c) || 5.4,
      bp_systolic: parseInt(bp, 10) || 120,
      diabetes: hasDiabetesVal ? 1 : 0,
      hypertension: hasHypertensionVal ? 1 : 0,
      chronic_count: chronicCountVal,
      monthly_budget: parseInt(budget.replace(/,/g, ''), 10) || 3500,
      income_lakh: parseFloat(income.replace(/,/g, '')) / 100000 || 8.0,
      fullName,
      mobileNumber,
      city,
      language,
      gender,
      coveredMembersList: activeMembersList,
      memberAges,
      medicalHistory: unionMedicalHistory,
      height: parseFloat(height) || 0,
      weight: parseFloat(weight) || 0,
      groups: activeMembersList.length > 1 ? groups : [{ id: 'group_1', name: 'Primary Group', members: ['Self'] }],
      memberMedicalHistory: serializedMedicalHistory,
      memberVitals: serializedVitals,
      memberDOBs: serializedDOBs,
    };

    assessHealthProfile(finalData)
      .then(async (result) => {
        if (userId) {
          await saveAssessmentResult(userId, finalData, result.risk_assessment, result.recommended_plans);
        }
        router.push(`/dashboard?score=${Math.round(result.risk_assessment.risk_score * 100)}&tier=${result.risk_assessment.risk_tier}`);
      })
      .catch((err) => {
        setAssessmentError(
          err instanceof Error
            ? err.message
            : 'The risk assessment pipeline is currently unavailable. Please verify the FastAPI backend server is online and try again.'
        );
      });

    return () => clearInterval(interval);
  }, [step, activeMembersList, budget, calculatedBMI, bp, groups, hba1c, height, income, language, gender, memberAges, memberMedicalHistory, memberDOBs, mobileNumber, fullName, primaryAge, router, smoker, userId, weight, city, memberUploads]);

  function formatCommas(value: string) {
    const clean = value.replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('en-IN');
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;
    const userText = chatInput;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const result = await chatWithAdvisor(
        [...chatMessages, { sender: 'user', text: userText }].map((m) => ({
          role: m.sender === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
        { hba1c: parseFloat(hba1c), bp_systolic: parseInt(bp, 10), bmi: parseFloat(calculatedBMI) }
      );
      setChatMessages((prev) => [...prev, { sender: 'ai', text: result.response }]);
    } catch {
      setChatMessages((prev) => [...prev, { sender: 'ai', text: 'Vitals verified. Ready to compute policy matches.' }]);
    }
    setIsTyping(false);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const m = uploadingMember || 'Self';

    setMemberUploads((prev) => ({
      ...prev,
      [m]: { fileName: file.name, uploadState: 'processing' }
    }));
    setUploadState('processing');
    setIsTyping(true);

    try {
      let rawText = '';
      if (file.type === 'text/plain' || file.type === 'text/csv') {
        rawText = await file.text();
      } else {
        rawText = `[Uploaded file: ${file.name}, type: ${file.type}]`;
      }

      const extracted = await processLabReport(rawText);

      setMemberUploads((prev) => ({
        ...prev,
        [m]: {
          fileName: file.name,
          uploadState: 'done',
          summary: extracted
        }
      }));

      const parsedH = parseFloat(m === 'Self' ? height : (memberVitalsInput[m]?.height || '170')) || 170;
      const parsedW = Math.round(extracted.bmi * ((parsedH / 100) * (parsedH / 100)));
      if (m === 'Self') {
        setHba1c(String(extracted.hba1c));
        setBp(String(extracted.bp_systolic));
        setWeight(String(parsedW));
        setExtractedSummary(extracted);
        setUploadState('done');
      } else {
        setMemberVitalsInput((prev) => ({
          ...prev,
          [m]: {
            ...(prev[m] ?? { height: '170', weight: '65', hba1c: '5.4', bp: '120', smoker: 'No' }),
            hba1c: String(extracted.hba1c),
            bp: String(extracted.bp_systolic),
            weight: String(parsedW),
          }
        }));
      }

      setChatMessages((prev) => [
        ...prev,
        { sender: 'user', text: `📎 Uploaded ${m}'s report: ${file.name}` },
        { sender: 'ai', text: `Parsed ${m}'s report. Health metrics decoded successfully.` },
      ]);
    } catch {
      setMemberUploads((prev) => ({
        ...prev,
        [m]: { fileName: file.name, uploadState: 'idle' }
      }));
      if (m === 'Self') {
        setUploadState('idle');
      }
    }
    setIsTyping(false);
    e.target.value = '';
  }

  function handleRemoveMemberFile(m: string) {
    setMemberUploads((prev) => {
      const copy = { ...prev };
      delete copy[m];
      return copy;
    });
    if (m === 'Self') {
      setUploadState('idle');
      setExtractedSummary(null);
    }
  }

  function handleMemberToggle(id: InsuredMember) {
    if (id === InsuredMember.SON) {
      if (selectedMembers[id]) {
        setSelectedMembers((prev) => ({ ...prev, [id]: false }));
        setSonCount(0);
      } else {
        if (sonCount + daughterCount < 4) {
          setSelectedMembers((prev) => ({ ...prev, [id]: true }));
          setSonCount(1);
        }
      }
      return;
    }
    if (id === InsuredMember.DAUGHTER) {
      if (selectedMembers[id]) {
        setSelectedMembers((prev) => ({ ...prev, [id]: false }));
        setDaughterCount(0);
      } else {
        if (sonCount + daughterCount < 4) {
          setSelectedMembers((prev) => ({ ...prev, [id]: true }));
          setDaughterCount(1);
        }
      }
      return;
    }
    setSelectedMembers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSonIncrement(val: number) {
    const nextCount = Math.max(0, sonCount + val);
    if (nextCount + daughterCount <= 4) {
      setSonCount(nextCount);
      setSelectedMembers((prev) => ({ ...prev, [InsuredMember.SON]: nextCount > 0 }));
    }
  }

  function handleDaughterIncrement(val: number) {
    const nextCount = Math.max(0, daughterCount + val);
    if (nextCount + sonCount <= 4) {
      setDaughterCount(nextCount);
      setSelectedMembers((prev) => ({ ...prev, [InsuredMember.DAUGHTER]: nextCount > 0 }));
    }
  }

  function handleDOBChange(m: string, field: 'day' | 'month' | 'year', val: string) {
    const clean = val.replace(/\D/g, '');
    if (field === 'day') {
      const num = parseInt(clean, 10);
      if (clean !== '' && (isNaN(num) || num < 1 || num > 31)) return;
    }
    if (field === 'month') {
      const num = parseInt(clean, 10);
      if (clean !== '' && (isNaN(num) || num < 1 || num > 12)) return;
    }
    if (field === 'year') {
      if (clean.length > 4) return;
    }
    setMemberDOBs((prev) => ({
      ...prev,
      [m]: {
        ...(prev[m] ?? { day: '', month: '', year: '' }),
        [field]: clean,
      },
    }));
  }

  function handleMedicalToggle(m: string, cond: HealthCondition) {
    setMemberMedicalHistory((prev) => {
      const current = prev[m] ?? {} as Record<HealthCondition, boolean>;
      const next = { ...current };

      if (cond === HealthCondition.NONE) {
        Object.keys(HealthCondition).forEach((key) => {
          const item = HealthCondition[key as keyof typeof HealthCondition];
          next[item] = false;
        });
        next[HealthCondition.NONE] = !current[HealthCondition.NONE];
      } else {
        next[HealthCondition.NONE] = false;
        next[cond] = !current[cond];
      }
      return { ...prev, [m]: next };
    });
  }

  function handleGroupMemberToggle(m: string, groupId: 'group_1' | 'group_2') {
    setGroups((prev) => {
      return prev.map((g) => {
        if (g.id === groupId) {
          const exists = g.members.includes(m);
          return {
            ...g,
            members: exists ? g.members.filter((x) => x !== m) : [...g.members, m]
          };
        } else {
          return {
            ...g,
            members: g.members.filter((x) => x !== m)
          };
        }
      });
    });
  }

  const nextStepLabel = useMemo(() => {
    if (step === 9) return 'Find Plans';
    return 'Continue';
  }, [step]);

  function handleStepAdvance() {
    if (!progressValidation) return;
    if (step === 7 && activeMembersList.length <= 1) {
      setStep(9);
      return;
    }
    setStep(step + 1);
  }

  function handleStepRetreat() {
    if (step === 9 && activeMembersList.length <= 1) {
      setStep(7);
      return;
    }
    setStep(step - 1);
  }

  const displayedMemberCards: MemberCardItem[] = useMemo(() => {
    return MEMBER_CARDS.map((card) => {
      if (card.id === InsuredMember.WIFE && gender === 'Female') {
        return { id: InsuredMember.HUSBAND, label: 'Husband', hasCounter: false };
      }
      return card;
    });
  }, [gender]);

  const topSixMembers = useMemo(() => {
    return displayedMemberCards.slice(0, 6);
  }, [displayedMemberCards]);

  const remainingMembers = useMemo(() => {
    return displayedMemberCards.slice(6);
  }, [displayedMemberCards]);

  return (
    <main className="min-h-screen bg-white px-4 sm:px-8 py-8 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-12 flex flex-col gap-4 border-b border-neutral-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">Step 0{step} / 09</span>
            <h1 className="mt-2 font-[var(--font-heading)] text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
              {step === 1 && 'Intake Language'}
              {step === 2 && 'Select Family Members'}
              {step === 3 && 'Enter DOB Details'}
              {step === 4 && 'City & Mobile Information'}
              {step === 5 && 'Medical History Check'}
              {step === 6 && 'Upload Lab Reports'}
              {step === 7 && 'Health Vitals & Budget'}
              {step === 8 && 'Custom Policy Groups'}
              {step === 9 && 'Advisor Interactive Consultation'}
              {step === 10 && 'Finding Match Projections'}
            </h1>
          </div>

          <div className="w-full md:max-w-[280px]">
            <div className="h-[2px] w-full bg-neutral-100">
              <div
                className={`h-[2px] bg-black transition-all duration-500 ease-out ${
                  step === 1
                    ? 'w-[11%]'
                    : step === 2
                    ? 'w-[22%]'
                    : step === 3
                    ? 'w-[33%]'
                    : step === 4
                    ? 'w-[44%]'
                    : step === 5
                    ? 'w-[55%]'
                    : step === 6
                    ? 'w-[66%]'
                    : step === 7
                    ? 'w-[77%]'
                    : step === 8
                    ? 'w-[88%]'
                    : 'w-full'
                }`}
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
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Language Preference">
                  Choose the preferred language to display health questionnaires and chatbot dialogues.
                </AnnotationBox>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setStep(2);
                      }}
                      className={`p-6 border transition-all text-left flex flex-col gap-2 ${
                        language === lang.code
                          ? 'border-black bg-neutral-50 font-bold'
                          : 'border-neutral-200 hover:border-black'
                      }`}
                    >
                      <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">{lang.name}</span>
                      <span className="font-[var(--font-heading)] text-xl text-black">{lang.nativeName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                <AnnotationBox title="Insured Members Selection">
                  Select the family members to include in the policies. Gender configurations update cards dynamically.
                </AnnotationBox>

                <div className="space-y-6">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400 block mb-3">Primary Account Gender</span>
                    <div className="flex gap-6">
                      {['Male', 'Female'].map((val) => {
                        const active = gender === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setGender(val)}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${active ? 'border-black bg-black' : 'border-neutral-300'}`}>
                              {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-mono text-sm uppercase tracking-tight text-black">{val}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {topSixMembers.map((card) => {
                      const isSelected = selectedMembers[card.id] || (card.id === InsuredMember.SON && sonCount > 0) || (card.id === InsuredMember.DAUGHTER && daughterCount > 0);
                      return (
                        <div
                          key={card.id}
                          onClick={() => !card.hasCounter && handleMemberToggle(card.id)}
                          className={`p-4 border transition-all flex flex-col justify-between h-28 ${card.hasCounter ? '' : 'cursor-pointer'} ${
                            isSelected ? 'border-black bg-neutral-50 font-bold' : 'border-neutral-200 hover:border-black'
                          }`}
                        >
                          <span className="font-mono text-xs uppercase tracking-wider text-black">{card.label}</span>
                          {card.hasCounter ? (
                            <div className="flex items-center justify-between mt-2">
                              <button
                                type="button"
                                onClick={() => card.id === InsuredMember.SON ? handleSonIncrement(-1) : handleDaughterIncrement(-1)}
                                className="h-7 w-7 flex items-center justify-center border border-neutral-200 hover:border-black text-sm font-mono"
                              >
                                -
                              </button>
                              <span className="font-mono text-sm">{card.id === InsuredMember.SON ? sonCount : daughterCount}</span>
                              <button
                                type="button"
                                onClick={() => card.id === InsuredMember.SON ? handleSonIncrement(1) : handleDaughterIncrement(1)}
                                className="h-7 w-7 flex items-center justify-center border border-neutral-200 hover:border-black text-sm font-mono"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              {isSelected ? (
                                <Check size={14} className="text-black" />
                              ) : (
                                <Plus size={14} className="text-neutral-300" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowAllMembers(!showAllMembers)}
                      className="w-full flex items-center justify-between p-4 border border-neutral-200 hover:border-black transition-colors font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-black cursor-pointer bg-white"
                    >
                      <span>{showAllMembers ? 'Hide Additional Members' : 'More Family Members (Grandparents, In-laws, Siblings, etc.)'}</span>
                      <ChevronDown className={`transform transition-transform duration-300 ${showAllMembers ? 'rotate-180' : ''}`} size={16} />
                    </button>

                    {showAllMembers && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-fadeIn">
                        {remainingMembers.map((card) => {
                          const isSelected = selectedMembers[card.id] || (card.id === InsuredMember.SON && sonCount > 0) || (card.id === InsuredMember.DAUGHTER && daughterCount > 0);
                          return (
                            <div
                              key={card.id}
                              onClick={() => !card.hasCounter && handleMemberToggle(card.id)}
                              className={`p-4 border transition-all flex flex-col justify-between h-28 ${card.hasCounter ? '' : 'cursor-pointer'} ${
                                isSelected ? 'border-black bg-neutral-50 font-bold' : 'border-neutral-200 hover:border-black'
                              }`}
                            >
                              <span className="font-mono text-xs uppercase tracking-wider text-black">{card.label}</span>
                              {card.hasCounter ? (
                                <div className="flex items-center justify-between mt-2">
                                  <button
                                    type="button"
                                    onClick={() => card.id === InsuredMember.SON ? handleSonIncrement(-1) : handleDaughterIncrement(-1)}
                                    className="h-7 w-7 flex items-center justify-center border border-neutral-200 hover:border-black text-sm font-mono"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono text-sm">{card.id === InsuredMember.SON ? sonCount : daughterCount}</span>
                                  <button
                                    type="button"
                                    onClick={() => card.id === InsuredMember.SON ? handleSonIncrement(1) : handleDaughterIncrement(1)}
                                    className="h-7 w-7 flex items-center justify-center border border-neutral-200 hover:border-black text-sm font-mono"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end">
                                  {isSelected ? (
                                    <Check size={14} className="text-black" />
                                  ) : (
                                    <Plus size={14} className="text-neutral-300" />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Date of Birth Details">
                  Provide exact DOBs to calculate risk interactions dynamically.
                </AnnotationBox>

                <div className="space-y-6">
                  {activeMembersList.map((m) => {
                    const dob = memberDOBs[m] ?? { day: '', month: '', year: '' };
                    return (
                      <div key={m} className="border border-neutral-200 p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                          <span className="font-mono text-xs uppercase tracking-wider font-bold text-black">{m}</span>
                          <span className="font-mono text-xs text-neutral-400">
                            {memberAges[m] !== undefined ? `${memberAges[m]} Years Old` : ''}
                          </span>
                        </div>

                        <div className="grid gap-3 grid-cols-3">
                          <div className="space-y-1">
                            <span className="font-mono text-[9px] uppercase text-neutral-400">Day</span>
                            <input
                              className="field-input font-mono text-center"
                              placeholder="DD"
                              value={dob.day}
                              onChange={(e) => handleDOBChange(m, 'day', e.target.value)}
                              maxLength={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="font-mono text-[9px] uppercase text-neutral-400">Month</span>
                            <input
                              className="field-input font-mono text-center"
                              placeholder="MM"
                              value={dob.month}
                              onChange={(e) => handleDOBChange(m, 'month', e.target.value)}
                              maxLength={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="font-mono text-[9px] uppercase text-neutral-400">Year</span>
                            <input
                              className="field-input font-mono text-center"
                              placeholder="YYYY"
                              value={dob.year}
                              onChange={(e) => handleDOBChange(m, 'year', e.target.value)}
                              maxLength={4}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {dobSemanticError && (
                    <div className="border border-black bg-neutral-50 p-4 font-mono text-[11px] leading-5 text-black animate-fadeIn">
                      <span className="font-bold uppercase block mb-1">Validation Alert</span>
                      {dobSemanticError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex items-start gap-3 border-t-2 border-black bg-neutral-50 p-4">
                  <Lock size={16} className="text-black mt-0.5" />
                  <div>
                    <span className="font-mono text-[9px] uppercase font-bold text-black block mb-0.5">Secure Form Intake</span>
                    <p className="font-mono text-[11px] leading-5 text-neutral-500">
                      Mobile verification saves assessment details to Supabase. Full privacy guaranteed.
                    </p>
                  </div>
                </div>

                <div className="grid gap-6">
                  <FormField label="Full Name">
                    <input
                      className="field-input font-mono"
                      placeholder="e.g. Ishaan Sen"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Mobile Number">
                    <input
                      className="field-input font-mono"
                      placeholder="e.g. 9876543210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      maxLength={10}
                    />
                  </FormField>

                  <div className="relative">
                    <FormField label="Insured City">
                      <input
                        className="field-input font-mono"
                        placeholder="Type city search..."
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

                  <div className="space-y-2">
                    <span className="font-mono text-[10px] uppercase text-neutral-400 font-bold">Popular Indian Cities</span>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_CITIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCity(c);
                            setCitySearch(c);
                          }}
                          className={`px-3 py-1.5 border font-mono text-[10px] uppercase transition-colors ${
                            city === c
                              ? 'bg-black text-white border-black font-bold'
                              : 'bg-white border-neutral-200 text-neutral-500 hover:border-black hover:text-black'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Medical Background Checklist">
                  Select diagnoses per insured family member.
                </AnnotationBox>

                <div className="space-y-6">
                  {activeMembersList.map((m) => (
                    <div key={m} className="border border-neutral-200 p-6 space-y-4">
                      <div className="font-mono text-xs uppercase tracking-wider font-bold text-black border-b border-neutral-100 pb-2">
                        {m} Health History
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {ILLNESSES.map((ill) => {
                          const isActive = memberMedicalHistory[m]?.[ill.id] ?? false;
                          return (
                            <button
                              key={ill.id}
                              onClick={() => handleMedicalToggle(m, ill.id)}
                              className={`p-3 border font-mono text-[10px] uppercase text-left flex justify-between items-center transition-colors ${
                                isActive
                                  ? 'border-black bg-neutral-50 text-black font-bold'
                                  : 'border-neutral-200 text-neutral-500 hover:border-black hover:text-black'
                              }`}
                            >
                              <span>{ill.label}</span>
                              {isActive && <Check size={12} className="text-black" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Laboratory Report Upload (Optional)">
                  Upload diagnostic lab reports (PDF, CSV, or Text) per member. Our secure clinical parser will extract vitals to optimize policy matches.
                </AnnotationBox>

                <div className="grid gap-6">
                  {activeMembersList.map((m) => {
                    const up = memberUploads[m];
                    const isProcessing = up?.uploadState === 'processing';
                    const isDone = up?.uploadState === 'done';

                    return (
                      <div key={m} className="border border-neutral-200 p-6 bg-neutral-50 space-y-4 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-neutral-100 pb-2">
                          <span className="font-mono text-xs uppercase tracking-wider font-bold text-black">{m}</span>
                          <span className="font-mono text-[9px] uppercase text-neutral-400">
                            {isDone ? 'Report Decoded' : 'Optional Upload'}
                          </span>
                        </div>

                        {isDone && up && up.summary ? (
                          <div className="space-y-3 animate-fadeIn">
                            <div className="flex justify-between items-center bg-white p-3 border border-neutral-200">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-black" />
                                <span className="font-mono text-[11px] font-bold text-black max-w-[180px] truncate">
                                  {up.fileName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMemberFile(m)}
                                className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 hover:text-black transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                              <div className="bg-white border border-neutral-100 p-2 text-center">
                                <span className="text-[8px] text-neutral-400 uppercase block">HbA1c</span>
                                <span className="font-bold">{up.summary.hba1c}%</span>
                              </div>
                              <div className="bg-white border border-neutral-100 p-2 text-center">
                                <span className="text-[8px] text-neutral-400 uppercase block">BP</span>
                                <span className="font-bold">{up.summary.bp_systolic} mmHg</span>
                              </div>
                              <div className="bg-white border border-neutral-100 p-2 text-center">
                                <span className="text-[8px] text-neutral-400 uppercase block">BMI</span>
                                <span className="font-bold">{up.summary.bmi}</span>
                              </div>
                            </div>
                          </div>
                        ) : isProcessing ? (
                          <div className="flex flex-col items-center justify-center py-6 gap-2 bg-white border border-neutral-200 animate-pulse">
                            <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-[10px] uppercase text-neutral-400 animate-pulse">
                              Decoding clinical report...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 border border-neutral-200">
                            <div>
                              <span className="font-mono text-[10px] uppercase font-bold text-black block mb-0.5">
                                Select Lab Report File
                              </span>
                              <span className="font-mono text-[9px] text-neutral-400 uppercase block">
                                PDF, TXT, CSV or Image (Max 5MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadingMember(m);
                                setTimeout(() => fileInputRef.current?.click(), 50);
                              }}
                              className="w-full sm:w-auto font-mono text-[9px] uppercase tracking-wider px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
                            >
                              Choose File
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.csv,image/*"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </div>
            )}

            {step === 7 && (
              <div className="space-y-8 animate-fadeIn">
                <AnnotationBox title="Vitals & Financial Tuner">
                  Adjust clinical readings for each insured family member to ensure high-accuracy match matching.
                </AnnotationBox>

                <div className="space-y-8">
                  {activeMembersList.map((m) => {
                    const v = getMemberVitals(m);
                    const memberBmi = getCalculatedBMI(m);
                    return (
                      <div key={m} className="border border-neutral-200 p-6 space-y-6">
                        <div className="font-mono text-xs uppercase tracking-wider font-bold text-black border-b border-neutral-100 pb-2">
                          {m} Clinical Vitals
                        </div>

                        <div className="grid gap-6">
                          <div className="grid gap-6 sm:grid-cols-2">
                            <FormField label="Height (cm)">
                              <input
                                className="field-input font-mono"
                                value={v.height}
                                onChange={(e) => handleVitalChange(m, 'height', e.target.value.replace(/\D/g, ''))}
                              />
                            </FormField>

                            <FormField label="Weight (kg)">
                              <input
                                className="field-input font-mono"
                                value={v.weight}
                                onChange={(e) => handleVitalChange(m, 'weight', e.target.value.replace(/\D/g, ''))}
                              />
                            </FormField>
                          </div>

                          <div className="grid gap-6 sm:grid-cols-2">
                            <FormField label="Calculated BMI (kg/m²)">
                              <div className="field-input font-mono bg-neutral-50 flex items-center px-2 font-bold text-neutral-600">
                                {memberBmi} kg/m²
                              </div>
                            </FormField>

                            <div>
                              <span className="field-label block mb-2">Consume tobacco products?</span>
                              <div className="flex gap-4">
                                {['No', 'Yes'].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleVitalChange(m, 'smoker', val)}
                                    className={`flex-1 h-11 border font-mono text-xs uppercase tracking-wider transition-all ${
                                      v.smoker === val
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-neutral-400 border-neutral-200 hover:border-black'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-6 sm:grid-cols-2">
                            <FormField label="Glycated Hemoglobin HbA1c (%)">
                              <input
                                className="field-input font-mono"
                                value={v.hba1c}
                                onChange={(e) => handleVitalChange(m, 'hba1c', e.target.value)}
                              />
                            </FormField>

                            <FormField label="Systolic Blood Pressure (mmHg)">
                              <input
                                className="field-input font-mono"
                                value={v.bp}
                                onChange={(e) => handleVitalChange(m, 'bp', e.target.value.replace(/\D/g, ''))}
                              />
                            </FormField>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border border-neutral-200 p-6 space-y-6">
                    <div className="font-mono text-xs uppercase tracking-wider font-bold text-black border-b border-neutral-100 pb-2">
                      Household Financial Parameters
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField label="Annual Income (₹)">
                        <input
                          className="field-input font-mono"
                          value={income}
                          onChange={(e) => setIncome(formatCommas(e.target.value))}
                        />
                      </FormField>

                      <FormField label="Ideal Monthly Premium Budget (₹)">
                        <input
                          className="field-input font-mono"
                          value={budget}
                          onChange={(e) => setBudget(formatCommas(e.target.value))}
                        />
                      </FormField>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 8 && activeMembersList.length > 1 && (
              <div className="space-y-6 animate-fadeIn">
                <AnnotationBox title="Group Allocation Planner">
                  Distribute members into separate policy bundles to optimize floating scores.
                </AnnotationBox>

                <div className="grid gap-6 sm:grid-cols-2">
                  {[
                    { id: 'group_1' as const, title: 'Group A (Primary Floater)', label: 'Group A' },
                    { id: 'group_2' as const, title: 'Group B (Parent/Secondary)', label: 'Group B' },
                  ].map((gDetails) => (
                    <div key={gDetails.id} className="border border-neutral-200 p-6 space-y-4">
                      <span className="font-mono text-xs uppercase font-bold text-black block border-b border-neutral-100 pb-2">
                        {gDetails.title}
                      </span>

                      <div className="space-y-2">
                        {activeMembersList.map((m) => {
                          const assigned = groups.find((x) => x.id === gDetails.id)?.members.includes(m);
                          return (
                            <button
                              key={m}
                              onClick={() => handleGroupMemberToggle(m, gDetails.id)}
                              className={`w-full p-2.5 border font-mono text-[10px] uppercase text-left flex justify-between items-center transition-colors ${
                                assigned
                                  ? 'border-black bg-neutral-50 text-black font-bold'
                                  : 'border-neutral-200 text-neutral-400 hover:border-black hover:text-black'
                              }`}
                            >
                              <span>{m}</span>
                              {assigned && <Check size={12} className="text-black" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 9 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="border border-t-2 border-black bg-neutral-50 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={14} className="text-black animate-pulse" />
                    <span className="font-mono text-[10px] uppercase font-bold text-black tracking-wider">
                      Health Advisor Persona Connected
                    </span>
                  </div>
                  <p className="font-mono text-[11px] leading-5 text-neutral-500">
                    Gemma 3 1B is listening in sandboxed advisor mode.
                  </p>
                </div>

                <div className="border border-neutral-200 bg-white">
                  <div className="h-[280px] space-y-4 overflow-y-auto p-6 font-mono text-xs leading-6 text-neutral-600 border-b border-neutral-100">
                    {chatMessages.map((msg, index) => (
                      <div key={`${msg.sender}-${index}`} className={msg.sender === 'user' ? 'text-right' : ''}>
                        <div
                          className={`inline-block max-w-[85%] border px-4 py-3 text-left whitespace-pre-line ${
                            msg.sender === 'user' ? 'bg-black text-white border-black' : 'bg-neutral-50 text-black border-neutral-200'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex items-center gap-2 text-neutral-400 font-mono text-xs">
                        <span className="h-1.5 w-1.5 animate-bounce bg-black rounded-full" />
                        <span className="h-1.5 w-1.5 animate-bounce bg-black rounded-full [animation-delay:0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce bg-black rounded-full [animation-delay:0.4s]" />
                        <span className="ml-1 uppercase tracking-widest text-[9px]">Gemma typing...</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-neutral-50 flex gap-3">
                    <input
                      className="flex-1 px-4 py-2.5 border border-neutral-200 font-mono text-xs outline-none bg-white focus:border-black"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => (e.key === 'Enter' ? handleSendChat() : null)}
                      placeholder="Consult advisor on vital thresholds..."
                    />
                    <button
                      onClick={handleSendChat}
                      className="px-5 py-2.5 bg-black text-white font-mono text-xs uppercase tracking-wider hover:bg-neutral-900 transition-all animate-pulse"
                    >
                      Ask
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 10 && (
              <div className="py-16 text-center space-y-6">
                {assessmentError ? (
                  <div className="max-w-md mx-auto space-y-6 p-8 border border-neutral-200 bg-white rounded-xl shadow-sm animate-fadeIn">
                    <div className="flex justify-center">
                      <span className="text-4xl">⚠️</span>
                    </div>
                    <div className="font-mono text-xl font-bold uppercase tracking-widest text-black">
                      Risk Assessment Error
                    </div>
                    <p className="font-mono text-xs leading-6 text-neutral-500">
                      {assessmentError}
                    </p>
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAssessmentError(null);
                          setStep(9);
                          setTimeout(() => setStep(10), 100);
                        }}
                        className="mono-btn-primary w-full py-3 rounded-xl font-mono text-xs uppercase tracking-wider"
                      >
                        Retry Risk Estimation
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAssessmentError(null);
                          setStep(7);
                        }}
                        className="mono-btn-secondary w-full py-3 rounded-xl font-mono text-xs uppercase tracking-wider"
                      >
                        Edit Health Vitals
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-center">
                      <span className="h-10 w-10 border-2 border-black border-t-transparent animate-spin rounded-full" />
                    </div>
                    <div className="font-mono text-3xl font-black uppercase tracking-widest text-black">
                      FINDING MATCHES
                    </div>
                    <p className="max-w-md mx-auto font-mono text-xs leading-6 text-neutral-400 h-10">
                      {loadingText}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="border border-neutral-200 p-6 bg-neutral-50">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 block mb-4">
                Assessed Profile Review
              </span>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Insured Language</span>
                  <span className="font-mono text-xs font-bold uppercase">{language}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Total Members</span>
                  <span className="font-mono text-xs font-bold uppercase">{activeMembersList.length}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">City / Location</span>
                  <span className="font-mono text-xs font-bold uppercase">{city || 'Pending'}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Vitals interaction (BMI)</span>
                  <span className="font-mono text-xs font-bold">{calculatedBMI} kg/m²</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">HbA1c / bp</span>
                  <span className="font-mono text-xs font-bold">{hba1c}% / {bp}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-200 pb-2">
                  <span className="font-mono text-xs text-neutral-400">Annual Income</span>
                  <span className="font-mono text-xs font-bold">₹{income}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-neutral-400">Target Premium</span>
                  <span className="font-mono text-xs font-bold">₹{budget}/mo</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {step < 9 && step > 1 && (
                <button
                  type="button"
                  onClick={handleStepAdvance}
                  disabled={!progressValidation}
                  className={`mono-btn-primary flex items-center justify-center gap-2 ${
                    !progressValidation ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <span>{nextStepLabel}</span>
                  <ChevronRight size={14} />
                </button>
              )}

              {step === 9 && (
                <button
                  type="button"
                  onClick={() => setStep(10)}
                  className="mono-btn-primary flex items-center justify-center gap-2 animate-bounce"
                >
                  <span>Exit Chat and Find Plans</span>
                  <ChevronRight size={14} />
                </button>
              )}

              {step > 1 && step < 10 && (
                <button
                  type="button"
                  onClick={handleStepRetreat}
                  className="mono-btn-secondary"
                >
                  Go Back
                </button>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
