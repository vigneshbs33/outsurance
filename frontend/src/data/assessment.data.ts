import { HealthCondition, IntakeLanguage, InsuredMember } from '../enums/assessment.enum';

export interface LanguageItem {
  code: IntakeLanguage;
  name: string;
  nativeName: string;
}

export interface MemberCardItem {
  id: InsuredMember;
  label: string;
  hasCounter: boolean;
}

export const LANGUAGES: LanguageItem[] = [
  { code: IntakeLanguage.ENGLISH, name: 'English', nativeName: 'English' },
  { code: IntakeLanguage.HINDI, name: 'Hindi', nativeName: 'हिन्दी' },
  { code: IntakeLanguage.KANNADA, name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: IntakeLanguage.TAMIL, name: 'Tamil', nativeName: 'தமிழ்' },
  { code: IntakeLanguage.TELUGU, name: 'Telugu', nativeName: 'తెలుగు' },
  { code: IntakeLanguage.MARATHI, name: 'Marathi', nativeName: 'मराठी' },
  { code: IntakeLanguage.BENGALI, name: 'Bengali', nativeName: 'বাংলা' },
  { code: IntakeLanguage.GUJARATI, name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: IntakeLanguage.MALAYALAM, name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: IntakeLanguage.PUNJABI, name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export const MEMBER_CARDS: MemberCardItem[] = [
  { id: InsuredMember.SELF, label: 'Self', hasCounter: false },
  { id: InsuredMember.WIFE, label: 'Wife', hasCounter: false },
  { id: InsuredMember.SON, label: 'Son', hasCounter: true },
  { id: InsuredMember.DAUGHTER, label: 'Daughter', hasCounter: true },
  { id: InsuredMember.FATHER, label: 'Father', hasCounter: false },
  { id: InsuredMember.MOTHER, label: 'Mother', hasCounter: false },
  { id: InsuredMember.GRANDFATHER, label: 'Grandfather', hasCounter: false },
  { id: InsuredMember.GRANDMOTHER, label: 'Grandmother', hasCounter: false },
  { id: InsuredMember.FATHER_IN_LAW, label: 'Father-in-law', hasCounter: false },
  { id: InsuredMember.MOTHER_IN_LAW, label: 'Mother-in-law', hasCounter: false },
  { id: InsuredMember.BROTHER, label: 'Brother', hasCounter: false },
  { id: InsuredMember.SISTER, label: 'Sister', hasCounter: false },
  { id: InsuredMember.UNCLE, label: 'Uncle', hasCounter: false },
  { id: InsuredMember.AUNT, label: 'Aunt', hasCounter: false },
  { id: InsuredMember.LIVE_IN_PARTNER_MALE, label: 'Live-in Partner (Male)', hasCounter: false },
  { id: InsuredMember.LIVE_IN_PARTNER_FEMALE, label: 'Live-in Partner (Female)', hasCounter: false },
];

export const ILLNESSES = [
  { id: HealthCondition.DIABETES, label: 'Diabetes' },
  { id: HealthCondition.BLOOD_PRESSURE, label: 'Blood Pressure' },
  { id: HealthCondition.HEART_DISEASE, label: 'Heart disease' },
  { id: HealthCondition.ANY_SURGERY, label: 'Any Surgery' },
  { id: HealthCondition.THYROID, label: 'Thyroid' },
  { id: HealthCondition.ASTHMA, label: 'Asthma' },
  { id: HealthCondition.OTHER_DISEASE, label: 'Other disease' },
  { id: HealthCondition.NONE, label: 'None of these' },
];

export const POPULAR_CITIES = [
  'Bengaluru',
  'Mysore',
  'Belgaum',
  'Udupi and Uttara Kannada',
  'Dakshina Kannada',
  'Dharwad',
  'Bellary',
  'Tumkur',
  'Kolar',
  'Shimoga',
];
