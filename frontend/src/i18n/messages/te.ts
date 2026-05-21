import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const te: Messages = mergeMessages(en, {
  nav: { dashboard: 'డాష్‌బోర్డ్', explorer: 'ప్లాన్ ఎక్స్‌ప్లోరర్', forum: 'రివ్యూ ఫోరం', saved: 'సేవ్ చేసిన ప్లాన్లు', profile: 'ప్రొఫైల్', newAssessment: 'కొత్త అసెస్‌మెంట్', signOut: 'సైన్ అవుట్' },
  common: { continue: 'కొనసాగించు', back: 'వెనక్కి', cancel: 'రద్దు', close: 'మూసివేయి', loading: 'లోడ్…', search: 'వెతకండి', compare: 'పోల్చండి', clear: 'క్లియర్', stepOf: 'దశ {step} / {total}' },
  language: { choose: 'భాష', fabLabel: 'భాష మార్చు' },
  assessment: { cancelReassessment: 'రీ-అసెస్‌మెంట్ రద్దు', chooseLanguage: 'మీ భాష ఎంచుకోండి', selectCity: 'మీ నగరం ఎంచుకోండి', findingPlans: 'మీ ఉత్తమ ప్లాన్లు కనుగొనబడుతున్నాయి' },
  explorer: { title: 'ప్లాన్ ఎక్స్‌ప్లోరర్', updateAssessment: 'ఆరోగ్య అసెస్‌మెంట్ నవీకరించండి' },
  plans: { criticalTitle: 'క్రిటికల్ నిబంధనలు', criticalSubtitle: 'దాచిన ప్రధాన లోపాలు', viewList: 'జాబితా చూడండి' },
  dashboard: { advisor: 'ఔట్‌ష్యూరెన్స్ AI సలహాదారు', send: 'పంపు' },
});
