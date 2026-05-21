'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { FilterTab, SortByOption, CoverOption, RoomRentOption, PolicyBenefitOption, ExistingDiseaseWaitOption, PremiumOption, PortabilityOption, MaternityWaitOption, PolicyPeriodOption, MaternityCoverOption } from '../enums/filters.enum';
import { FILTER_TABS_METADATA, SORT_BY_OPTIONS, COVER_OPTIONS, ROOM_RENT_OPTIONS, BENEFITS_OPTIONS, EXISTING_DISEASE_WAIT_OPTIONS, PREMIUM_OPTIONS, PORTABILITY_OPTIONS, MATERNITY_WAIT_OPTIONS, POLICY_PERIOD_OPTIONS, MATERNITY_COVER_OPTIONS, INSURER_OPTIONS } from '../data/filters.data';

export interface Plan {
  id: number;
  name: string;
  insurer: string;
  coverage: number;
  annual_premium: number;
  room_rent_limit?: string;
  diabetes_day1?: boolean;
  hypertension_day1?: boolean;
  pre_existing_wait_years?: number;
  preexisting_wait_years?: number;
  no_claim_bonus_pct?: number;
  restoration_benefit?: boolean;
  restore_benefit?: boolean;
  coverage_highlights?: string[];
  exclusions?: string[];
  pros?: string[];
  cons?: string[];
  type?: string;
  claim_settlement_ratio?: number;
  cosine_similarity?: number;
  link?: string;
  [key: string]: unknown;
}

export interface FilterState {
  sortBy: SortByOption;
  cover: CoverOption;
  roomRent: RoomRentOption;
  benefits: PolicyBenefitOption[];
  existingDiseaseWait: ExistingDiseaseWaitOption;
  premiumPerMonth: PremiumOption;
  portability: PortabilityOption;
  maternityWait: MaternityWaitOption;
  policyPeriod: PolicyPeriodOption;
  selectedInsurers: string[];
  maternityCover: MaternityCoverOption;
}

interface FilterPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPlans: Plan[];
  activeFilters: FilterState;
  onChangeFilters: (filters: FilterState) => void;
  onClearAll: () => void;
}

export function FilterPlansModal({
  isOpen,
  onClose,
  allPlans,
  activeFilters,
  onChangeFilters,
  onClearAll,
}: FilterPlansModalProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>(FilterTab.SORT_BY);
  const [tempFilters, setTempFilters] = useState<FilterState>({ ...activeFilters });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setTempFilters({ ...activeFilters });
      }, 0);
    }
  }, [isOpen, activeFilters]);

  const uniqueInsurers = useMemo(() => {
    const set = new Set<string>();
    (allPlans ?? []).forEach((p) => {
      if (p.insurer) set.add(p.insurer);
    });
    return Array.from(set).sort();
  }, [allPlans]);

  const filteredPlansCount = useMemo(() => {
    let list = [...(allPlans ?? [])];

    if (tempFilters.cover !== CoverOption.RECOMMENDED) {
      if (tempFilters.cover === CoverOption.BELOW_5_LAKH) {
        list = list.filter((p) => p.coverage < 500000);
      } else if (tempFilters.cover === CoverOption.FIVE_TO_NINE_LAKH) {
        list = list.filter((p) => p.coverage >= 500000 && p.coverage <= 900000);
      } else if (tempFilters.cover === CoverOption.TEN_TO_TWENTY_FOUR_LAKH) {
        list = list.filter((p) => p.coverage >= 1000000 && p.coverage <= 2400000);
      } else if (tempFilters.cover === CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH) {
        list = list.filter((p) => p.coverage >= 2500000 && p.coverage <= 9900000);
      } else if (tempFilters.cover === CoverOption.ONE_TO_TWO_CR) {
        list = list.filter((p) => p.coverage >= 10000000 && p.coverage <= 20000000);
      } else if (tempFilters.cover === CoverOption.TWO_TO_SIX_CR) {
        list = list.filter((p) => p.coverage >= 20000000 && p.coverage <= 60000000);
      } else if (tempFilters.cover === CoverOption.UNLIMITED) {
        list = list.filter((p) => p.coverage > 60000000 || p.coverage >= 5000000);
      }
    }

    if (tempFilters.roomRent !== RoomRentOption.NO_PREFERENCE) {
      if (tempFilters.roomRent === RoomRentOption.NO_ROOM_RENT_LIMIT) {
        list = list.filter(
          (p) =>
            p.room_rent_limit?.toLowerCase().includes('no limit') ||
            p.room_rent_limit?.toLowerCase().includes('any room') ||
            p.room_rent_limit === 'N/A'
        );
      } else if (tempFilters.roomRent === RoomRentOption.SINGLE_PRIVATE_ROOM) {
        list = list.filter((p) => p.room_rent_limit?.toLowerCase().includes('single private'));
      } else if (tempFilters.roomRent === RoomRentOption.SHARED_ROOM) {
        list = list.filter(
          (p) =>
            p.room_rent_limit?.toLowerCase().includes('shared') ||
            p.room_rent_limit?.toLowerCase().includes('twin sharing')
        );
      }
    }

    tempFilters.benefits.forEach((benefit) => {
      if (benefit === PolicyBenefitOption.DIABETES_COVERED) {
        list = list.filter((p) => p.diabetes_day1 === true);
      } else if (benefit === PolicyBenefitOption.NO_CLAIM_BONUS) {
        list = list.filter((p) => p.no_claim_bonus_pct && p.no_claim_bonus_pct > 0);
      } else if (benefit === PolicyBenefitOption.RESTORATION_BENEFITS) {
        list = list.filter((p) => p.restoration_benefit === true || p.restore_benefit === true);
      } else if (benefit === PolicyBenefitOption.FREE_HEALTH_CHECKUP) {
        list = list.filter(
          (p) =>
            p.coverage_highlights?.some(
              (h) => h.toLowerCase().includes('check-up') || h.toLowerCase().includes('checkup')
            ) || p.pros?.some((h) => h.toLowerCase().includes('checkup'))
        );
      } else if (benefit === PolicyBenefitOption.DOCTOR_CONSULTATION_PHARMACY) {
        list = list.filter(
          (p) =>
            p.coverage_highlights?.some((h) => h.toLowerCase().includes('opd')) ||
            p.pros?.some((h) => h.toLowerCase().includes('opd'))
        );
      } else if (benefit === PolicyBenefitOption.DAY_CARE_TREATMENTS) {
        list = list.filter(
          (p) =>
            p.coverage_highlights?.some(
              (h) => h.toLowerCase().includes('day care') || h.toLowerCase().includes('daycare')
            )
        );
      }
    });

    if (tempFilters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE) {
      if (tempFilters.existingDiseaseWait === ExistingDiseaseWaitOption.NO_WAITING_PERIOD) {
        list = list.filter((p) => (p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4) === 0);
      } else if (tempFilters.existingDiseaseWait === ExistingDiseaseWaitOption.ONE_YEAR) {
        list = list.filter((p) => (p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4) <= 1);
      } else if (tempFilters.existingDiseaseWait === ExistingDiseaseWaitOption.TWO_YEARS) {
        list = list.filter((p) => (p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4) <= 2);
      } else if (tempFilters.existingDiseaseWait === ExistingDiseaseWaitOption.THREE_YEARS) {
        list = list.filter((p) => (p.pre_existing_wait_years ?? p.preexisting_wait_years ?? 4) <= 3);
      }
    }

    if (tempFilters.premiumPerMonth !== PremiumOption.NO_PREFERENCE) {
      if (tempFilters.premiumPerMonth === PremiumOption.BELOW_1K) {
        list = list.filter((p) => p.annual_premium / 12 < 1000);
      } else if (tempFilters.premiumPerMonth === PremiumOption.ONE_TO_TWO_K) {
        list = list.filter((p) => p.annual_premium / 12 >= 1000 && p.annual_premium / 12 <= 2000);
      } else if (tempFilters.premiumPerMonth === PremiumOption.TWO_TO_FOUR_K) {
        list = list.filter((p) => p.annual_premium / 12 >= 2000 && p.annual_premium / 12 <= 4000);
      } else if (tempFilters.premiumPerMonth === PremiumOption.ABOVE_FOURK) {
        list = list.filter((p) => p.annual_premium / 12 > 4000);
      }
    }

    if (tempFilters.portability === PortabilityOption.ONLY_PORTABLE) {
      list = list.filter((p) => p.type?.toLowerCase() !== 'basic');
    }

    if (tempFilters.maternityWait !== MaternityWaitOption.NO_PREFERENCE) {
      if (tempFilters.maternityWait === MaternityWaitOption.TWO_YEARS) {
        list = list.filter((p) => p.annual_premium > 12000);
      } else if (tempFilters.maternityWait === MaternityWaitOption.THREE_YEARS) {
        list = list.filter((p) => p.annual_premium > 10000);
      } else if (tempFilters.maternityWait === MaternityWaitOption.FOUR_YEARS) {
        list = list.filter((p) => p.annual_premium <= 10000);
      }
    }

    if (tempFilters.selectedInsurers.length > 0) {
      list = list.filter((p) => tempFilters.selectedInsurers.some((ins) => ins.toLowerCase() === p.insurer?.toLowerCase()));
    }

    if (tempFilters.maternityCover === MaternityCoverOption.COVERED) {
      list = list.filter(
        (p) =>
          p.coverage_highlights?.some((h) => h.toLowerCase().includes('maternity')) ||
          p.pros?.some((h) => h.toLowerCase().includes('maternity'))
      );
    }

    return list.length;
  }, [allPlans, tempFilters]);

  const activeTabMetadata = useMemo(() => {
    return FILTER_TABS_METADATA.find((t) => t.id === activeTab) || FILTER_TABS_METADATA[0];
  }, [activeTab]);

  function handleSelectRadio<T>(field: keyof FilterState, value: T) {
    setTempFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleToggleCheckbox<T>(field: 'benefits' | 'selectedInsurers', value: T) {
    setTempFilters((prev) => {
      const currentList = prev[field] as T[];
      const exists = currentList.includes(value);
      const updatedList = exists
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];

      return {
        ...prev,
        [field]: updatedList,
      };
    });
  }

  function handleRemoveChip(chip: { type: keyof FilterState; value: unknown; label: string }) {
    if (chip.type === 'benefits' || chip.type === 'selectedInsurers') {
      handleToggleCheckbox(chip.type, chip.value);
    } else {
      let defaultValue: unknown;
      if (chip.type === 'sortBy') defaultValue = SortByOption.RELEVANCE;
      else if (chip.type === 'cover') defaultValue = CoverOption.RECOMMENDED;
      else if (chip.type === 'roomRent') defaultValue = RoomRentOption.NO_PREFERENCE;
      else if (chip.type === 'existingDiseaseWait') defaultValue = ExistingDiseaseWaitOption.NO_PREFERENCE;
      else if (chip.type === 'premiumPerMonth') defaultValue = PremiumOption.NO_PREFERENCE;
      else if (chip.type === 'portability') defaultValue = PortabilityOption.NO_PREFERENCE;
      else if (chip.type === 'maternityWait') defaultValue = MaternityWaitOption.NO_PREFERENCE;
      else if (chip.type === 'policyPeriod') defaultValue = PolicyPeriodOption.ONE_YEAR;
      else if (chip.type === 'maternityCover') defaultValue = MaternityCoverOption.NO_PREFERENCE;

      setTempFilters((prev) => ({
        ...prev,
        [chip.type]: defaultValue,
      }));
    }
  }

  const activeChips = useMemo(() => {
    const chips: { type: keyof FilterState; value: unknown; label: string }[] = [];

    if (tempFilters.sortBy !== SortByOption.RELEVANCE) {
      const match = SORT_BY_OPTIONS.find((o) => o.id === tempFilters.sortBy);
      if (match) chips.push({ type: 'sortBy', value: tempFilters.sortBy, label: `Sort: ${match.label}` });
    }
    if (tempFilters.cover !== CoverOption.RECOMMENDED) {
      const match = COVER_OPTIONS.find((o) => o.id === tempFilters.cover);
      if (match) chips.push({ type: 'cover', value: tempFilters.cover, label: `Cover: ${match.label}` });
    }
    if (tempFilters.roomRent !== RoomRentOption.NO_PREFERENCE) {
      const match = ROOM_RENT_OPTIONS.find((o) => o.id === tempFilters.roomRent);
      if (match) chips.push({ type: 'roomRent', value: tempFilters.roomRent, label: `Room: ${match.label}` });
    }
    tempFilters.benefits.forEach((b) => {
      const match = BENEFITS_OPTIONS.find((o) => o.id === b);
      if (match) chips.push({ type: 'benefits', value: b, label: match.label });
    });
    if (tempFilters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE) {
      const match = EXISTING_DISEASE_WAIT_OPTIONS.find((o) => o.id === tempFilters.existingDiseaseWait);
      if (match) chips.push({ type: 'existingDiseaseWait', value: tempFilters.existingDiseaseWait, label: `Wait: ${match.label}` });
    }
    if (tempFilters.premiumPerMonth !== PremiumOption.NO_PREFERENCE) {
      const match = PREMIUM_OPTIONS.find((o) => o.id === tempFilters.premiumPerMonth);
      if (match) chips.push({ type: 'premiumPerMonth', value: tempFilters.premiumPerMonth, label: `Premium: ${match.label}` });
    }
    if (tempFilters.portability !== PortabilityOption.NO_PREFERENCE) {
      const match = PORTABILITY_OPTIONS.find((o) => o.id === tempFilters.portability);
      if (match) chips.push({ type: 'portability', value: tempFilters.portability, label: match.label });
    }
    if (tempFilters.maternityWait !== MaternityWaitOption.NO_PREFERENCE) {
      const match = MATERNITY_WAIT_OPTIONS.find((o) => o.id === tempFilters.maternityWait);
      if (match) chips.push({ type: 'maternityWait', value: tempFilters.maternityWait, label: `Maternity Wait: ${match.label}` });
    }
    tempFilters.selectedInsurers.forEach((ins) => {
      chips.push({ type: 'selectedInsurers', value: ins, label: ins });
    });
    if (tempFilters.maternityCover !== MaternityCoverOption.NO_PREFERENCE) {
      chips.push({ type: 'maternityCover', value: tempFilters.maternityCover, label: 'Maternity Covered' });
    }

    return chips;
  }, [tempFilters]);

  const hasFilterInTab = useMemo(() => {
    const map: Record<FilterTab, boolean> = {
      [FilterTab.SORT_BY]: tempFilters.sortBy !== SortByOption.RELEVANCE,
      [FilterTab.COVER]: tempFilters.cover !== CoverOption.RECOMMENDED,
      [FilterTab.ROOM_RENT_TYPE]: tempFilters.roomRent !== RoomRentOption.NO_PREFERENCE,
      [FilterTab.POLICY_BENEFITS]: tempFilters.benefits.length > 0,
      [FilterTab.EXISTING_DISEASE_WAIT]: tempFilters.existingDiseaseWait !== ExistingDiseaseWaitOption.NO_PREFERENCE,
      [FilterTab.PREMIUM_PER_MONTH]: tempFilters.premiumPerMonth !== PremiumOption.NO_PREFERENCE,
      [FilterTab.PORTABILITY]: tempFilters.portability !== PortabilityOption.NO_PREFERENCE,
      [FilterTab.MATERNITY_WAIT]: tempFilters.maternityWait !== MaternityWaitOption.NO_PREFERENCE,
      [FilterTab.POLICY_PERIOD]: tempFilters.policyPeriod !== PolicyPeriodOption.ONE_YEAR,
      [FilterTab.INSURER]: tempFilters.selectedInsurers.length > 0,
      [FilterTab.MATERNITY_COVER]: tempFilters.maternityCover !== MaternityCoverOption.NO_PREFERENCE,
    };
    return map;
  }, [tempFilters]);

  function handleApplyFilters() {
    onChangeFilters(tempFilters);
    onClose();
  }

  function handleLocalClearAll() {
    setTempFilters({
      sortBy: SortByOption.RELEVANCE,
      cover: CoverOption.RECOMMENDED,
      roomRent: RoomRentOption.NO_PREFERENCE,
      benefits: [],
      existingDiseaseWait: ExistingDiseaseWaitOption.NO_PREFERENCE,
      premiumPerMonth: PremiumOption.NO_PREFERENCE,
      portability: PortabilityOption.NO_PREFERENCE,
      maternityWait: MaternityWaitOption.NO_PREFERENCE,
      policyPeriod: PolicyPeriodOption.ONE_YEAR,
      selectedInsurers: [],
      maternityCover: MaternityCoverOption.NO_PREFERENCE,
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-0 sm:p-4 md:p-6 animate-fadeIn">
      <div className="relative w-full max-w-[960px] h-full sm:h-[85vh] bg-white sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="font-[var(--font-heading)] text-lg font-black tracking-tight uppercase text-slate-900">
            Filter plans
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 items-center">
            {activeChips.map((chip, idx) => (
              <span
                key={`${chip.type}-${idx}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs bg-white text-slate-700 border border-slate-200 rounded-full shadow-sm"
              >
                <span>{chip.label}</span>
                <button
                  onClick={() => handleRemoveChip(chip)}
                  className="hover:text-red-500 font-bold transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 flex min-h-0 bg-white">
          <aside className="w-1/3 bg-slate-50/75 border-r border-slate-100 overflow-y-auto">
            <nav className="flex flex-col">
              {FILTER_TABS_METADATA.map((tab) => {
                const isActive = activeTab === tab.id;
                const hasFilters = hasFilterInTab[tab.id];
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative w-full text-left py-4 px-6 text-xs sm:text-sm font-semibold tracking-tight transition-all flex justify-between items-center border-b border-slate-100/50 ${
                      isActive
                        ? 'bg-white text-emerald-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-100/40'
                    }`}
                  >
                    <span className="truncate pr-2">{tab.label}</span>
                    {hasFilters && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="w-2/3 bg-white p-6 sm:p-8 overflow-y-auto flex flex-col justify-start">
            <div className="space-y-1.5 mb-6">
              <h3 className="font-[var(--font-heading)] text-base font-black text-slate-900 tracking-tight">
                {activeTabMetadata.label}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-mono uppercase">
                {activeTabMetadata.description}
              </p>
            </div>

            <div className="flex-1">
              {activeTab === FilterTab.SORT_BY && (
                <div className="grid grid-cols-1 gap-3">
                  {SORT_BY_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('sortBy', opt.id)}
                        className={`w-full flex items-center justify-between border p-4 text-left transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-slate-900 text-sm">{opt.label}</span>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white font-bold" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.COVER && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COVER_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.cover === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('cover', opt.id)}
                        className={`w-full flex flex-col justify-center border p-4 text-left transition-all cursor-pointer rounded-xl relative ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2.5 left-4 bg-indigo-50 text-indigo-700 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold shadow-sm border border-indigo-100">
                            {opt.badge}
                          </span>
                        )}
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-slate-900 text-sm mt-1">{opt.label}</span>
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white font-bold" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.ROOM_RENT_TYPE && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROOM_RENT_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.roomRent === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('roomRent', opt.id)}
                        className={`w-full flex flex-col justify-center border p-4 text-left transition-all cursor-pointer rounded-xl relative ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2.5 left-4 bg-emerald-50 text-emerald-700 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold shadow-sm border border-emerald-100">
                            {opt.badge}
                          </span>
                        )}
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-slate-900 text-sm mt-1">{opt.label}</span>
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white font-bold" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.POLICY_BENEFITS && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {BENEFITS_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.benefits.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleToggleCheckbox('benefits', opt.id)}
                        className={`w-full flex items-center justify-between border p-4 text-left transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-slate-900 text-sm">{opt.label}</span>
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={12} className="font-bold" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.EXISTING_DISEASE_WAIT && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXISTING_DISEASE_WAIT_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.existingDiseaseWait === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('existingDiseaseWait', opt.id)}
                        className={`w-full flex flex-col justify-center border p-4 text-left transition-all cursor-pointer rounded-xl relative ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2.5 left-4 bg-emerald-50 text-emerald-700 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold shadow-sm border border-emerald-100">
                            {opt.badge}
                          </span>
                        )}
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold text-slate-900 text-sm mt-1">{opt.label}</span>
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white font-bold" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.PREMIUM_PER_MONTH && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PREMIUM_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.premiumPerMonth === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('premiumPerMonth', opt.id)}
                        className={`w-full flex items-center justify-between border p-4 text-left transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-slate-900 text-sm">{opt.label}</span>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white font-bold" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.PORTABILITY && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PORTABILITY_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.portability === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('portability', opt.id)}
                        className={`w-full flex items-center justify-between border p-4 text-left transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-slate-900 text-sm">{opt.label}</span>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white font-bold" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.MATERNITY_WAIT && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MATERNITY_WAIT_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.maternityWait === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('maternityWait', opt.id)}
                        className={`w-full flex items-center border p-4 text-left transition-all cursor-pointer rounded-xl relative ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2.5 left-4 bg-indigo-50 text-indigo-700 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold shadow-sm border border-indigo-100">
                            {opt.badge}
                          </span>
                        )}
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mr-3 transition-all ${
                            isSelected ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>{opt.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.POLICY_PERIOD && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {POLICY_PERIOD_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.policyPeriod === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('policyPeriod', opt.id)}
                        className={`w-full flex items-center border p-4 text-left transition-all cursor-pointer rounded-xl relative ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2.5 left-4 bg-indigo-50 text-indigo-700 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold shadow-sm border border-indigo-100">
                            {opt.badge}
                          </span>
                        )}
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mr-3 transition-all ${
                            isSelected ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-900'}`}>{opt.label}</span>
                          {opt.subtext && <span className="text-[11px] text-emerald-600 font-medium mt-0.5">{opt.subtext}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.INSURER && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INSURER_OPTIONS.map((insurer) => {
                    const isSelected = tempFilters.selectedInsurers.some(
                      (ins) => ins.toLowerCase() === insurer.toLowerCase()
                    );
                    return (
                      <button
                        key={insurer}
                        onClick={() => handleToggleCheckbox('selectedInsurers', insurer)}
                        className={`w-full flex items-center border p-4 text-left transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 mr-3 transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check size={12} className="font-bold" />}
                        </div>
                        <span className="font-semibold text-slate-900 text-sm">{insurer}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === FilterTab.MATERNITY_COVER && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {MATERNITY_COVER_OPTIONS.map((opt) => {
                    const isSelected = tempFilters.maternityCover === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectRadio('maternityCover', opt.id)}
                        className={`w-full flex items-center justify-between border p-4 text-left transition-all cursor-pointer rounded-xl ${
                          isSelected ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="font-semibold text-slate-900 text-sm">{opt.label}</span>
                        <div
                          className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white font-bold" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-white select-none">
          <button
            onClick={handleLocalClearAll}
            className="text-xs sm:text-sm font-extrabold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider cursor-pointer font-mono"
          >
            Clear filters
          </button>
          
          <button
            onClick={handleApplyFilters}
            className="px-8 h-12 bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-colors shadow-lg cursor-pointer rounded-xl flex items-center gap-1.5"
          >
            <span>Show {filteredPlansCount} plans</span>
            <span>&gt;</span>
          </button>
        </div>

      </div>
    </div>
  );
}
