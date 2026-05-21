import type { Messages } from './en';
import { en } from './en';
import { hi } from './hi';
import { kn } from './kn';
import { ta } from './ta';
import { te } from './te';
import { mr } from './mr';
import { bn } from './bn';
import { gu } from './gu';
import { ml } from './ml';
import { pa } from './pa';
import type { AppLocale } from '../config';

export type { Messages };

export const messages: Record<AppLocale, Messages> = {
  en,
  hi,
  kn,
  ta,
  te,
  mr,
  bn,
  gu,
  ml,
  pa,
};
