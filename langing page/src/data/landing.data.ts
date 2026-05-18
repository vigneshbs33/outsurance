export interface FeatureItem {
  num: string;
  label: string;
}

export interface AnnotationItem {
  id: string;
  labelLines?: string[];
  isBoldLast?: boolean;
}

export interface CrossMarkerPosition {
  left: string;
  top: string;
}

export const CORE_FEATURES: FeatureItem[] = [
  { num: '01', label: 'UPLOAD YOUR LAB REPORT' },
  { num: '02', label: 'AI READS IT INSTANTLY' },
  { num: '03', label: 'GET MATCHED TO PLANS' },
  { num: '04', label: 'COMPARE AND CHOOSE' },
];

export const ANNOTATIONS: AnnotationItem[] = [
  {
    id: 'A',
    labelLines: ['THE RIGHT PLAN', 'FOR YOUR FAMILY', 'IN 3 MINUTES'],
  },
  {
    id: 'B',
  },
  {
    id: 'C',
  },
  {
    id: 'D',
    labelLines: ['NO PAPERWORK.', 'NO CONFUSION.', 'JUST COVERAGE.'],
  },
  {
    id: 'E',
    labelLines: ['YOUR HEALTH DATA', 'NEVER LEAVES', 'YOUR PHONE'],
  },
];

export const CROSS_MARKERS: CrossMarkerPosition[] = [
  { left: '18vw', top: '38vh' },
  { left: '74vw', top: '22vh' },
  { left: '12vw', top: '72vh' },
  { left: '80vw', top: '68vh' },
];
