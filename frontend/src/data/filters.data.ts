import {
  FilterTab,
  SortByOption,
  CoverOption,
  RoomRentOption,
  PolicyBenefitOption,
  ExistingDiseaseWaitOption,
  PremiumOption,
  PortabilityOption,
  MaternityWaitOption,
  PolicyPeriodOption,
  MaternityCoverOption,
} from '../enums/filters.enum';

export interface TabMetadata {
  id: FilterTab;
  label: string;
  description: string;
}

export interface FilterOption<T> {
  id: T;
  label: string;
  badge?: string;
  subtext?: string;
}

export const FILTER_TABS_METADATA: TabMetadata[] = [
  {
    id: FilterTab.SORT_BY,
    label: 'Sort by',
    description: 'Plans with your preference will be shown first',
  },
  {
    id: FilterTab.COVER,
    label: 'Cover',
    description: 'Buying a higher cover reduces the chance of payment from your pocket in case your policy cover gets exhausted',
  },
  {
    id: FilterTab.ROOM_RENT_TYPE,
    label: 'Room rent type',
    description: 'It is the type of room you are eligible for in case of hospitalization',
  },
  {
    id: FilterTab.POLICY_BENEFITS,
    label: 'Policy benefits',
    description: 'These benefits are part of your insurance cover. You can check plans as per your desired benefits',
  },
  {
    id: FilterTab.EXISTING_DISEASE_WAIT,
    label: 'Existing disease waiting period',
    description: 'It is a time span before a select list of ailments get covered in your policy',
  },
  {
    id: FilterTab.PREMIUM_PER_MONTH,
    label: 'Premium (per month)',
    description: 'Filter plans by the monthly budget segment that fits your recurring needs',
  },
  {
    id: FilterTab.PORTABILITY,
    label: 'Portability',
    description: 'Filter standard plans or only show those with full portability features',
  },
  {
    id: FilterTab.MATERNITY_WAIT,
    label: 'Maternity cover waiting period',
    description: 'Specify your preference for when maternity expenses become fully payable',
  },
  {
    id: FilterTab.POLICY_PERIOD,
    label: 'Policy period',
    description: 'Select plans offering coverage durations that match your tenure needs',
  },
  {
    id: FilterTab.INSURER,
    label: 'Insurer',
    description: 'Filter plans and compare policies by specific health insurance providers',
  },
  {
    id: FilterTab.MATERNITY_COVER,
    label: 'Maternity cover',
    description: 'Select policies that cover standard or premium maternity expenses',
  },
];

export const SORT_BY_OPTIONS: FilterOption<SortByOption>[] = [
  { id: SortByOption.RELEVANCE, label: 'By relevance' },
  { id: SortByOption.PREMIUM_LOW_TO_HIGH, label: 'Premium low to high' },
  { id: SortByOption.CASHLESS_HOSPITALS, label: 'Cashless hospitals network' },
];

export const COVER_OPTIONS: FilterOption<CoverOption>[] = [
  { id: CoverOption.RECOMMENDED, label: 'Recommended' },
  { id: CoverOption.BELOW_5_LAKH, label: 'Below ₹5 Lakh' },
  { id: CoverOption.FIVE_TO_NINE_LAKH, label: '₹5-9 Lakh' },
  { id: CoverOption.TEN_TO_TWENTY_FOUR_LAKH, label: '₹10-24 Lakh', badge: 'Most popular' },
  { id: CoverOption.TWENTY_FIVE_TO_NINETY_NINE_LAKH, label: '₹25-99 Lakh' },
  { id: CoverOption.ONE_TO_TWO_CR, label: '₹1-1.99 Cr' },
  { id: CoverOption.TWO_TO_SIX_CR, label: '₹2-6 Cr' },
  { id: CoverOption.UNLIMITED, label: 'Unlimited' },
];

export const ROOM_RENT_OPTIONS: FilterOption<RoomRentOption>[] = [
  { id: RoomRentOption.NO_PREFERENCE, label: 'No preference' },
  { id: RoomRentOption.NO_ROOM_RENT_LIMIT, label: 'No room rent limit', badge: 'Recommended' },
  { id: RoomRentOption.SINGLE_PRIVATE_ROOM, label: 'Single Private Room' },
  { id: RoomRentOption.SHARED_ROOM, label: 'Shared room' },
];

export const BENEFITS_OPTIONS: FilterOption<PolicyBenefitOption>[] = [
  { id: PolicyBenefitOption.DIABETES_COVERED, label: 'Diabetes Covered' },
  { id: PolicyBenefitOption.PRE_HOSPITALIZATION_COVERED, label: 'Pre-hospitalization covered' },
  { id: PolicyBenefitOption.POST_HOSPITALIZATION_COVERED, label: 'Post-hospitalization covered' },
  { id: PolicyBenefitOption.DAY_CARE_TREATMENTS, label: 'Day Care Treatments' },
  { id: PolicyBenefitOption.NO_CLAIM_BONUS, label: 'No Claim Bonus' },
  { id: PolicyBenefitOption.RESTORATION_BENEFITS, label: 'Restoration benefits' },
  { id: PolicyBenefitOption.FREE_HEALTH_CHECKUP, label: 'Free Health Checkup' },
  { id: PolicyBenefitOption.DOCTOR_CONSULTATION_PHARMACY, label: 'Doctor Consultation and Pharmacy' },
];

export const EXISTING_DISEASE_WAIT_OPTIONS: FilterOption<ExistingDiseaseWaitOption>[] = [
  { id: ExistingDiseaseWaitOption.NO_PREFERENCE, label: 'No preference' },
  { id: ExistingDiseaseWaitOption.NO_WAITING_PERIOD, label: 'No waiting period', badge: 'Recommended' },
  { id: ExistingDiseaseWaitOption.ONE_YEAR, label: '1 year' },
  { id: ExistingDiseaseWaitOption.TWO_YEARS, label: '2 years' },
  { id: ExistingDiseaseWaitOption.THREE_YEARS, label: '3 years' },
];

export const PREMIUM_OPTIONS: FilterOption<PremiumOption>[] = [
  { id: PremiumOption.NO_PREFERENCE, label: 'No preference' },
  { id: PremiumOption.BELOW_1K, label: 'Below ₹1,000' },
  { id: PremiumOption.ONE_TO_TWO_K, label: '₹1,000 - ₹2,000' },
  { id: PremiumOption.TWO_TO_FOUR_K, label: '₹2,000 - ₹4,000' },
  { id: PremiumOption.ABOVE_FOURK, label: 'Above ₹4,000' },
];

export const PORTABILITY_OPTIONS: FilterOption<PortabilityOption>[] = [
  { id: PortabilityOption.NO_PREFERENCE, label: 'No preference' },
  { id: PortabilityOption.ONLY_PORTABLE, label: 'Only portable plans' },
];

export const MATERNITY_WAIT_OPTIONS: FilterOption<MaternityWaitOption>[] = [
  { id: MaternityWaitOption.NO_PREFERENCE, label: 'No preference' },
  { id: MaternityWaitOption.TWO_YEARS, label: '2 years', badge: 'Recommended' },
  { id: MaternityWaitOption.THREE_YEARS, label: '3 years' },
  { id: MaternityWaitOption.FOUR_YEARS, label: '4 years' },
];

export const POLICY_PERIOD_OPTIONS: FilterOption<PolicyPeriodOption>[] = [
  { id: PolicyPeriodOption.ONE_YEAR, label: '1 year' },
  { id: PolicyPeriodOption.TWO_YEARS, label: '2 years', subtext: 'Save up to 10% on premium' },
  { id: PolicyPeriodOption.THREE_YEARS, label: '3 years', subtext: 'Save up to 15% on premium', badge: 'Recommended' },
  { id: PolicyPeriodOption.FOUR_YEARS, label: '4 years', subtext: 'Save up to 16% on premium' },
  { id: PolicyPeriodOption.FIVE_YEARS, label: '5 years', subtext: 'Save up to 16% on premium' },
];

export const MATERNITY_COVER_OPTIONS: FilterOption<MaternityCoverOption>[] = [
  { id: MaternityCoverOption.NO_PREFERENCE, label: 'No preference' },
  { id: MaternityCoverOption.COVERED, label: 'Covered' },
];

export const INSURER_OPTIONS: string[] = [
  'Universal Sompo',
  'Aditya Birla',
  'Care Health',
  'Cholamandalam',
  'HDFC ERGO',
  'ICICI Lombard',
  'ManipalCigna',
  'Niva Bupa Health Insurance',
  'New India Assurance',
  'Oriental',
  'Star Health',
  'Tata AIG',
];
