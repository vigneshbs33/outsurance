/** Maps insurer display names to logo files under /logos (from assets/logos). */
const LOGO_FILES: Record<string, string> = {
  'Star Health': '/logos/star_health_new_logo_Blue_6a4457e498.svg',
  'HDFC ERGO': '/logos/logo_hdfc.png',
  'Niva Bupa': '/logos/Niva-Bupa-Logo.svg',
  'Max Bupa': '/logos/Niva-Bupa-Logo.svg',
  'Care Health': '/logos/care_health_insurance_logo.svg',
  'Care Health (Religare)': '/logos/care_health_insurance_logo.svg',
  'Care Health Insurance': '/logos/care_health_insurance_logo.svg',
  'LIC': '/logos/lic_log_updated.svg',
  'ICICI Lombard': '/logos/lombard-brand-logo.webp',
  'Bajaj Allianz': '/logos/BGIL-logo.gif',
  'Tata AIG': '/logos/TataAigLogoNew.svg',
  'SBI General': '/logos/sbig-logo.webp',
  'ManipalCigna': '/logos/manipal-logo-new.png',
  'Max Life': '/logos/axis-max-life-insurance-logo.svg',
  'United India': '/logos/uiiclogo_new.png',
  'New India Assurance': '/logos/NIA_logo.png',
  'National Insurance': '/logos/NIA_logo.png',
  'Universal Sompo': '/logos/usgi-logo.svg',
  'Oriental Insurance': '/logos/logo-1.svg',
  'Reliance General': '/logos/logo_f4a3ce7ab4.svg',
  'Future Generali': '/logos/logo.svg',
  'Cholamandalam MS': '/logos/logo.png',
  'Kotak Mahindra': '/logos/Logo_76d09944ee.svg',
  'IFFCO Tokio': '/logos/download.png',
  'Liberty General': '/logos/gradient-horizontal.svg',
  'Magma HDI': '/logos/logo1.avif',
  'Royal Sundaram': '/logos/Frame.svg',
  'Shriram General': '/logos/logo-1.jpg',
  'Raheja QBE': '/logos/logo_hdfc.png',
  'Zuno General': '/logos/logo.svg',
  'Acko General': '/logos/logo.svg',
  'Aditya Birla': '/logos/logo_f4a3ce7ab4.svg',
  'Navi General': '/logos/logo.svg',
};

export function getInsurerLogoSrc(insurer: string): string | null {
  if (!insurer) return null;
  if (LOGO_FILES[insurer]) return LOGO_FILES[insurer];
  const key = Object.keys(LOGO_FILES).find(
    (k) => k.toLowerCase() === insurer.toLowerCase() || insurer.toLowerCase().includes(k.toLowerCase())
  );
  return key ? LOGO_FILES[key] : null;
}

export const INSURER_BORDER: Record<string, string> = {
  'Star Health': 'border-[#0a4da2]',
  'HDFC ERGO': 'border-[#e21b22]',
  'Niva Bupa': 'border-[#009b9e]',
  'Care Health': 'border-[#f0b429]',
  'Care Health (Religare)': 'border-[#f0b429]',
  'Care Health Insurance': 'border-[#f0b429]',
  'LIC': 'border-[#1b365d]',
  'ICICI Lombard': 'border-[#e87722]',
  'Bajaj Allianz': 'border-[#006db7]',
  'Aditya Birla': 'border-[#c0242a]',
  'ManipalCigna': 'border-[#0077b6]',
  'Tata AIG': 'border-[#003087]',
  'Max Bupa': 'border-[#d40f7d]',
  'SBI General': 'border-[#6c287a]',
};
