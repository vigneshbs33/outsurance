import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const pa: Messages = mergeMessages(en, {
  nav: { dashboard: 'ਡੈਸ਼ਬੋਰਡ', explorer: 'ਪਲਾਨ ਐਕਸਪਲੋਰਰ', forum: 'ਰਿਵਿਊ ਫੋਰਮ', saved: 'ਸੇਵ ਕੀਤੇ ਪਲਾਨ', profile: 'ਪ੍ਰੋਫਾਈਲ', newAssessment: 'ਨਵਾਂ ਮੁਲਾਂਕਣ', signOut: 'ਸਾਈਨ ਆਉਟ' },
  common: { continue: 'ਜਾਰੀ ਰੱਖੋ', back: 'ਪਿੱਛੇ', cancel: 'ਰੱਦ', close: 'ਬੰਦ', loading: 'ਲੋਡ…', search: 'ਖੋਜ', compare: 'ਤੁਲਨਾ', clear: 'ਸਾਫ', stepOf: 'ਕਦਮ {step} / {total}' },
  language: { choose: 'ਭਾਸ਼ਾ', fabLabel: 'ਭਾਸ਼ਾ ਬਦਲੋ' },
  assessment: { cancelReassessment: 'ਮੁੜ-ਮੁਲਾਂਕਣ ਰੱਦ', chooseLanguage: 'ਭਾਸ਼ਾ ਚੁਣੋ', selectCity: 'ਸ਼ਹਿਰ ਚੁਣੋ', findingPlans: 'ਸਭ ਤੋਂ ਵਧੀਆ ਪਲਾਨ ਲੱਭੇ ਜਾ ਰਹੇ ਹਨ' },
  explorer: { title: 'ਪਲਾਨ ਐਕਸਪਲੋਰਰ', updateAssessment: 'ਸਿਹਤ ਮੁਲਾਂਕਣ ਅਪਡੇਟ' },
  plans: { criticalTitle: 'ਮਹੱਤਵਪੂਰਨ ਸ਼ਰਤਾਂ', criticalSubtitle: 'ਛੁਪੇ ਹੋਏ ਮੁੱਖ ਨੁਕਸਾਨ', viewList: 'ਸੂਚੀ' },
  dashboard: { advisor: 'ਆਊਟਸ਼ੁਰੈਂਸ AI ਸਲਾਹਕਾਰ', send: 'ਭੇਜੋ' },
});
