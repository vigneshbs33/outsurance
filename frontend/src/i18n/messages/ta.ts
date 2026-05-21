import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const ta: Messages = mergeMessages(en, {
  nav: { dashboard: 'டாஷ்போர்டு', explorer: 'திட்ட ஆய்வு', forum: 'மதிப்புரை மன்றம்', saved: 'சேமித்த திட்டங்கள்', profile: 'சுயவிவரம்', newAssessment: 'புதிய மதிப்பீடு', signOut: 'வெளியேறு' },
  common: { continue: 'தொடரவும்', back: 'பின்', cancel: 'ரத்து', close: 'மூடு', loading: 'ஏற்றுகிறது…', search: 'தேடு', compare: 'ஒப்பிடு', clear: 'அழி', stepOf: 'படி {step} / {total}' },
  language: { choose: 'மொழி', fabLabel: 'மொழி மாற்று' },
  assessment: {
    cancelReassessment: 'மறு-மதிப்பீட்டை ரத்து செய்',
    reassessmentNote: 'உங்கள் சுயவிவரம் புதுப்பிக்கப்படுகிறது — எப்போதும் ரத்து செய்யலாம்.',
    chooseLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    selectCity: 'உங்கள் நகரத்தைத் தேர்ந்தெடுக்கவும்',
    findingPlans: 'சிறந்த திட்டங்களைத் தேடுகிறது',
  },
  explorer: { title: 'திட்ட ஆய்வு', updateAssessment: 'சுகாதார மதிப்பீட்டைப் புதுப்பிக்கவும்', tailoredFor: 'திட்டங்கள் இவர்களுக்கு' },
  plans: { criticalTitle: 'முக்கிய நிபந்தனைகள்', criticalSubtitle: 'மறைந்திருக்கும் பின்னடைவுகள்', viewList: 'பட்டியல்', addToCompare: 'ஒப்பிட்டில் சேர்' },
  dashboard: { advisor: 'அவுட்சூரன்ஸ் AI ஆலோசகர்', send: 'அனுப்பு' },
});
