import type { Messages } from './en';
import { mergeMessages } from '../mergeMessages';
import { en } from './en';

export const bn: Messages = mergeMessages(en, {
  nav: { dashboard: 'ড্যাশবোর্ড', explorer: 'প্ল্যান এক্সপ্লোরার', forum: 'রিভিউ ফোরাম', saved: 'সংরক্ষিত প্ল্যান', profile: 'প্রোফাইল', newAssessment: 'নতুন মূল্যায়ন', signOut: 'সাইন আউট' },
  common: { continue: 'চালিয়ে যান', back: 'পিছনে', cancel: 'বাতিল', close: 'বন্ধ', loading: 'লোড…', search: 'খুঁজুন', compare: 'তুলনা', clear: 'মুছুন', stepOf: 'ধাপ {step} / {total}' },
  language: { choose: 'ভাষা', fabLabel: 'ভাষা পরিবর্তন' },
  assessment: { cancelReassessment: 'পুনঃ-মূল্যায়ন বাতিল', chooseLanguage: 'ভাষা বেছে নিন', selectCity: 'শহর বেছে নিন', findingPlans: 'সেরা প্ল্যান খোঁজা হচ্ছে' },
  explorer: { title: 'প্ল্যান এক্সপ্লোরার', updateAssessment: 'স্বাস্থ্য মূল্যায়ন আপডেট' },
  plans: { criticalTitle: 'গুরুত্বপূর্ণ শর্ত', criticalSubtitle: 'লুকানো প্রধান ত্রুটি', viewList: 'তালিকা' },
  dashboard: { advisor: 'আউটশ্যোরেন্স AI উপদেষ্টা', send: 'পাঠান' },
});
