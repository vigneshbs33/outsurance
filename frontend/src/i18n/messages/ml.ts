import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const ml: Messages = mergeMessages(en, {
  nav: { dashboard: 'ഡാഷ്‌ബോർഡ്', explorer: 'പ്ലാൻ എക്സ്പ്ലോറർ', forum: 'റിവ്യൂ ഫോറം', saved: 'സേവ് ചെയ്ത പ്ലാനുകൾ', profile: 'പ്രൊഫൈൽ', newAssessment: 'പുതിയ വിലയിരുത്തൽ', signOut: 'സൈൻ ഔട്ട്' },
  common: { continue: 'തുടരുക', back: 'പിന്നോട്ട്', cancel: 'റദ്ദാക്കുക', close: 'അടയ്ക്കുക', loading: 'ലോഡ്…', search: 'തിരയുക', compare: 'താരതമ്യം', clear: 'മായ്ക്കുക', stepOf: 'ഘട്ടം {step} / {total}' },
  language: { choose: 'ഭാഷ', fabLabel: 'ഭാഷ മാറ്റുക' },
  assessment: { cancelReassessment: 'വീണ്ടും-വിലയിരുത്തൽ റദ്ദാക്കുക', chooseLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക', selectCity: 'നഗരം തിരഞ്ഞെടുക്കുക', findingPlans: 'മികച്ച പ്ലാനുകൾ കണ്ടെത്തുന്നു' },
  explorer: { title: 'പ്ലാൻ എക്സ്പ്ലോറർ', updateAssessment: 'ആരോഗ്യ വിലയിരുത്തൽ അപ്ഡേറ്റ്' },
  plans: { criticalTitle: 'നിർണായക നിബന്ധനകൾ', criticalSubtitle: 'മറച്ചിരിക്കുന്ന പ്രധാന പിഴവുകൾ', viewList: 'പട്ടിക' },
  dashboard: { advisor: 'ഔട്ട്ഷ്യോറൻസ് AI ഉപദേഷ്ടാവ്', send: 'അയയ്ക്കുക' },
});
