import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const gu: Messages = mergeMessages(en, {
  nav: { dashboard: 'ડેશબોર્ડ', explorer: 'પ્લાન એક્સપ્લોરર', forum: 'રિવ્યૂ ફોરમ', saved: 'સાચવેલા પ્લાન', profile: 'પ્રોફાઇલ', newAssessment: 'નવું મૂલ્યાંકન', signOut: 'સાઇન આઉટ' },
  common: { continue: 'ચાલુ રાખો', back: 'પાછા', cancel: 'રદ', close: 'બંધ', loading: 'લોડ…', search: 'શોધો', compare: 'તુલના', clear: 'સાફ', stepOf: 'પગલું {step} / {total}' },
  language: { choose: 'ભાષા', fabLabel: 'ભાષા બદલો' },
  assessment: { cancelReassessment: 'પુનઃ-મૂલ્યાંકન રદ', chooseLanguage: 'ભાષા પસંદ કરો', selectCity: 'શહેર પસંદ કરો', findingPlans: 'શ્રેષ્ઠ પ્લાન શોધી રહ્યા છીએ' },
  explorer: { title: 'પ્લાન એક્સપ્લોરર', updateAssessment: 'આરોગ્ય મૂલ્યાંકન અપડેટ' },
  plans: { criticalTitle: 'મહત્વપૂર્ણ શરતો', criticalSubtitle: 'છુપાયેલા મુખ્ય નુકસાન', viewList: 'યાદી' },
  dashboard: { advisor: 'આઉટશ્યોરન્સ AI સલાહકાર', send: 'મોકલો' },
});
