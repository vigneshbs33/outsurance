import { IntakeLanguage } from '../enums/assessment.enum';

export type AppLocale = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'mr' | 'bn' | 'gu' | 'ml' | 'pa';

export const DEFAULT_LOCALE: AppLocale = 'en';

export const LOCALE_STORAGE_KEY = 'outsurance_app_locale';

export const LOCALE_OPTIONS: { code: AppLocale; intake: IntakeLanguage; label: string; native: string }[] = [
  { code: 'en', intake: IntakeLanguage.ENGLISH, label: 'English', native: 'English' },
  { code: 'hi', intake: IntakeLanguage.HINDI, label: 'Hindi', native: 'हिन्दी' },
  { code: 'kn', intake: IntakeLanguage.KANNADA, label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', intake: IntakeLanguage.TAMIL, label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', intake: IntakeLanguage.TELUGU, label: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', intake: IntakeLanguage.MARATHI, label: 'Marathi', native: 'मराठी' },
  { code: 'bn', intake: IntakeLanguage.BENGALI, label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', intake: IntakeLanguage.GUJARATI, label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ml', intake: IntakeLanguage.MALAYALAM, label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', intake: IntakeLanguage.PUNJABI, label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

export function intakeToLocale(intake: IntakeLanguage): AppLocale {
  return LOCALE_OPTIONS.find((o) => o.intake === intake)?.code ?? 'en';
}

export function localeToIntake(locale: AppLocale): IntakeLanguage {
  return LOCALE_OPTIONS.find((o) => o.code === locale)?.intake ?? IntakeLanguage.ENGLISH;
}
