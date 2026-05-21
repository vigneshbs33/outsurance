export interface AdvantageItem {
  title: string;
  description: string;
  iconName: string;
}

export interface BulletBenefit {
  title: string;
  bullets: string[];
}

export interface TermInsuranceDetails {
  description: string[];
  benefits: BulletBenefit[];
  keyTerms: string[];
}

export const OUTSURANCE_ADVANTAGES: AdvantageItem[] = [
  {
    title: 'The Best Prices',
    description: 'Guaranteed lowest premiums',
    iconName: 'Coins',
  },
  {
    title: 'Unbiased Advice',
    description: 'Keeping customers first always',
    iconName: 'Scale',
  },
  {
    title: '100% Reliable',
    description: 'Fully regulated and secure',
    iconName: 'ShieldCheck',
  },
  {
    title: 'Claims Support',
    description: 'Made stress-free and smooth',
    iconName: 'Activity',
  },
  {
    title: 'Happy to Help',
    description: 'Available every day of the week',
    iconName: 'Clock',
  },
];

export const WHY_BUY_REASONS: string[] = [
  'Best Prices Guaranteed',
  'Dedicated Claim Assistance',
  'Unbiased & Certified Advisors',
  'One-Click Easy Refunds',
];

export const TERM_INSURANCE_DETAILS: TermInsuranceDetails = {
  description: [
    'Term Life insurance provides coverage for a fixed period of time at a fixed premium rate.',
    'In case of untimely death of the life insured during the policy term, the nominee of the life insured gets the Total Payout/Benefit. The benefit can be paid out as a lump sum payout or a combination of Lump sum & Monthly payout or only as a Monthly payout.',
    'Therefore Term insurance plans are pure protection plans which ensure financial stability of the dependants in case of untimely death of the life insured.',
  ],
  benefits: [
    {
      title: 'Death Benefit',
      bullets: [
        'Nominee receives the Total Payout as a Lump sum amount or combination of Lump sum & Monthly amount.',
        'Lump sum amount to take care of immediate financial liabilities.',
        'Monthly income to sustain the family lifestyle.',
      ],
    },
    {
      title: 'Tax Benefit',
      bullets: [
        'Premiums paid for Term Life Insurance are tax exempt under Section 80C up to ₹1,50,000.',
      ],
    },
    {
      title: 'Rider Benefits',
      bullets: [
        'Accidental Death Benefit offers additional sum assured if death occurs due to an accident.',
        'Accidental Disability offers immediate lump sum payment on occurrence of permanent disability.',
        'Critical Illness offers additional sum assured if diagnosed with critical illnesses.',
        'Waiver of Premium offers waiver of all future premiums if diagnosed with permanent disability or critical illness.',
      ],
    },
    {
      title: 'Option to Increase Death Benefit',
      bullets: [
        'Certain plans allow increasing the life cover at key life stages like marriage or birth of a child.',
      ],
    },
  ],
  keyTerms: [
    'Total Payout of each plan',
    'Premium amount paid for desired Total Payout',
    'Policy term offered',
    'High claim settlement ratio',
  ],
};
