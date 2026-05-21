import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const mr: Messages = mergeMessages(en, {
  nav: { dashboard: 'डॅशबोर्ड', explorer: 'प्लान एक्सप्लोरर', forum: 'रिव्ह्यू फोरम', saved: 'सेव्ह केलेले प्लान', profile: 'प्रोफाइल', newAssessment: 'नवीन मूल्यांकन', signOut: 'साइन आउट' },
  common: { continue: 'पुढे', back: 'मागे', cancel: 'रद्द', close: 'बंद', loading: 'लोड…', search: 'शोध', compare: 'तुलना', clear: 'साफ', stepOf: 'पायरी {step} / {total}' },
  language: { choose: 'भाषा', fabLabel: 'भाषा बदला' },
  assessment: { cancelReassessment: 'पुन्हा-मूल्यांकन रद्द', chooseLanguage: 'भाषा निवडा', selectCity: 'शहर निवडा', findingPlans: 'सर्वोत्तम प्लान शोधत आहे' },
  explorer: { title: 'प्लान एक्सप्लोरर', updateAssessment: 'आरोग्य मूल्यांकन अपडेट' },
  plans: { criticalTitle: 'महत्त्वाच्या अटी', criticalSubtitle: 'लपलेले मुख्य तोटे', viewList: 'यादी पहा' },
  dashboard: { advisor: 'आउटश्योरन्स AI सल्लागार', send: 'पाठवा' },
});
