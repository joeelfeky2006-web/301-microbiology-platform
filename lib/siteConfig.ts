import type { SiteContent } from '@/types';

/** Beta: hide Support / payment UI until real channels are configured. */
export const SHOW_SUPPORT = true;

/** Official channels. They are always listed, even when saved site content predates them. */
export const OFFICIAL_SOCIAL = [
  { label: 'Instagram', url: 'https://www.instagram.com/medatlas_eg' },
  { label: 'WhatsApp Channel', url: 'https://whatsapp.com/channel/0029Vb8pcwu7oQhgGeoAhp2M' },
];

const sameLink = (a: string, b: string) => {
  try { const x = new URL(a); const y = new URL(b); return x.hostname.replace(/^www\./, '') === y.hostname.replace(/^www\./, '') && x.pathname.replace(/\/$/, '') === y.pathname.replace(/\/$/, ''); } catch { return false; }
};

/** Public, editable copy defaults. Keep credentials and security policy out of this object. */
export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    name: 'MedAtlas Egypt', shortName: 'MedAtlas Egypt', tagline: 'AI Clinical Lab',
    description: 'MedAtlas Egypt: Next-Gen AI Training for Medical Students. Micro 301 — Culturing Curiosity, with interactive case studies, practical records, and exam-focused learning.', logo: '/logo.svg',
    affiliation: 'Independent student-built study resource. Not an official university publication.',
    contactEmail: 'mucizedoctorseg@gmail.com', teamName: 'MedAtlas Egypt Team', foundedYear: '2026',
    social: OFFICIAL_SOCIAL,
  },
  navigation: { home: 'Home', modules: 'Modules', cns: 'CNS', urs: 'Urinary System', rep: 'Reproductive System', about: 'About', contact: 'Contact', privacy: 'Privacy', terms: 'Terms', copyright: 'Copyright & Content' },
  navigationOrder: ['home', 'modules', 'about', 'contact'],
  footer: { explore: 'Explore', company: 'Company', legal: 'Legal', copyright: '© {year} {owner}. All rights reserved.', disclaimer: 'For educational purposes only. This platform does not provide medical advice.' },
  home: {
    headline: 'MedAtlas Egypt: Next-Gen AI Training for Medical Students.',
    description: 'A time-efficient, AI-driven platform built specifically to help medical students master complex infectious diseases and excel in their exams.',
    tagline: 'MedAtlas Egypt Academic Network', ctaPrimary: 'Sign in to Portal', ctaSecondary: 'Create Account',
    features: ['Time-Efficient High-Yield Notes', 'Bedside AI Case Vignettes', 'Practice with structured, step-by-step feedback'],
  },
  pages: {
    about: { title: 'About MedAtlas Egypt', description: 'Our mission and learning resources.', lastUpdated: '2026-10-03', visible: true, sections: [
      { heading: 'Our mission', body: 'MedAtlas Egypt helps Micro 301 students study central nervous system, urinary, and reproductive microbiology.', visible: true },
      { heading: 'Learning resources', body: 'The platform brings together lectures, recordings, mind maps, question-bank practice, and Dr. Atlas study tools. AI output can be inaccurate and should be checked against course materials.', visible: true },
      { heading: 'Content and team', body: 'Resources are prepared by students and contributors. Contact the team at the address listed on the Contact page to report a content issue.', visible: true },
      { heading: 'Affiliation', body: 'Independent student-built study resource. Not an official university publication.', visible: true },
    ] },
    contact: { title: 'Contact', description: 'Contact the MedAtlas Egypt team.', lastUpdated: '2026-10-03', visible: true, sections: [
      { heading: 'Email', body: 'For questions, content corrections, privacy requests, or copyright notices, contact {email}. We aim to reply within 2 working days.', visible: true },
      { heading: 'Report a content error', body: 'Include the page or resource URL, the specific issue, and a reliable correction source.', visible: true },
    ] },
    privacy: { title: 'Privacy', description: 'How MedAtlas Egypt handles account and platform data.', lastUpdated: '2026-10-03', visible: true, sections: [
      { heading: 'Information in your account', body: 'Supabase Auth manages sign-in. The application uses account email and user metadata such as name and, when provided, University ID. The app does not read your password.', visible: true },
      { heading: 'Credits and activity', body: 'The platform stores AI credit balances and a bounded credit activity ledger for your account. Sponsored placements are shown without click or impression telemetry from this application.', visible: true },
      { heading: 'AI features', body: 'Relevant lecture source text and the text you submit to AI study tools may be sent to Google Gemini to generate a response. Do not submit personal, confidential, or patient-identifying information. Check AI output against course materials.', visible: true },
      { heading: 'Browser storage and persistence', body: 'Browser storage keys used by the app include theme, student_group_preference, medatlas_profile_preferences, medatlas_student_progress, and announcement-dismissed:<content-hash>. Supabase Auth stores its session using the SDK-managed browser storage key. The local fallback uses micro_atlas_session, micro_atlas_mock_accounts, and micro_atlas_materials. In that development-only fallback, entered password values are stored in browser local storage and are not hashed: never use a real password in fallback mode. With Supabase configured, Supabase Auth handles passwords. Reviewed AI chat and quiz UI code keeps prompts and responses in page state and does not write chat transcripts, answers, or reports to Supabase.', visible: true },
      { heading: 'Requests and retention', body: 'For access, correction, or deletion requests, email {email}. Account and operational records may remain while needed to provide the service or meet applicable obligations. Contact the team for current retention details.', visible: true },
      { heading: 'Third parties and security', body: 'Supabase provides the configured authentication, database, and storage services. Google Gemini processes requests made to AI study features. The deployment may use additional infrastructure providers; confirm the live deployment configuration before relying on this draft.', visible: true },
      { heading: 'Access controls', body: 'The application uses authenticated sessions and database row-level policies for restricted data, alongside browser security response headers. No security control eliminates all risk; keep account credentials private and report suspected unauthorized access to {email}.', visible: true },
      { heading: 'Minimum-Age Requirement & Legal Capacity', body: 'By accessing and using Micro 301 / MedAtlas, you represent and warrant that you are at least 15 years of age, establishing the legal capacity to consent to personal data processing under Egyptian law. If you are under the age of 15, you are strictly prohibited from creating an account, using this platform, or providing any personal data without the explicit, written consent of your parent or legal guardian.\n\nIn strict compliance with the Egyptian Personal Data Protection Law (PDPL) No. 151 of 2020 and its Executive Regulations (Decree No. 816 of 2025), we reserve the right to request official proof of age or documented guardian consent at any time. We do not knowingly collect, process, or track the personal data of children under 15 without verifiable authorization, nor do we collect more data than is strictly necessary for platform functionality. If we discover that personal data has been collected from a user under 15 without verified guardian consent, we will immediately terminate the account and permanently delete all associated data from our servers.', visible: true },
      { heading: 'شرط الحد الأدنى للعمر والأهلية القانونية', body: 'من خلال الوصول إلى واستخدام منصة Micro 301 / MedAtlas، فإنك تقر وتتعهد بأن عمرك لا يقل عن 15 عاماً، مما يثبت أهليتك القانونية للموافقة على معالجة البيانات الشخصية بموجب القانون المصري. إذا كان عمرك يقل عن 15 عاماً، يُحظر عليك تماماً إنشاء حساب، أو استخدام هذه المنصة، أو تقديم أي بيانات شخصية دون الحصول على موافقة كتابية صريحة من والديك أو ولي أمرك القانوني.\n\nفي إطار الامتثال التام لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 ولائحته التنفيذية (القرار رقم 816 لسنة 2025)، نحتفظ بالحق في طلب إثبات رسمي للعمر أو موافقة موثقة من ولي الأمر في أي وقت. نحن لا نقوم عن قصد بجمع أو معالجة أو تتبع البيانات الشخصية للأطفال دون سن 15 عاماً دون تفويض يمكن التحقق منه، كما أننا لا نجمع بيانات أكثر مما هو ضروري للغاية لتشغيل المنصة. إذا اكتشفنا أنه تم جمع بيانات شخصية من مستخدم يقل عمره عن 15 عاماً دون موافقة مؤكدة من ولي الأمر، فسنقوم على الفور بإغلاق الحساب وحذف جميع البيانات المرتبطة به نهائياً من خوادمنا.', visible: true },
    ] },
    terms: { title: 'Terms of Use', description: 'Terms for using MedAtlas Egypt.', lastUpdated: '2026-10-03', visible: true, sections: [
      { heading: 'Minimum age and legal capacity', body: 'By using Micro 301 / MedAtlas you confirm that you are at least 15 years of age, or that you have explicit written consent from a parent or legal guardian. Users under 15 may not create an account or provide personal data without such consent. See the Privacy Policy for full age and PDPL wording (English and Arabic).', visible: true },
      { heading: 'Acceptable use and account responsibility', body: 'Use the platform lawfully for personal study. Keep your account credentials secure and do not disrupt the service, bypass access controls, or misuse other users’ information.', visible: true },
      { heading: 'Educational use only', body: 'Content and AI features are for education, not medical advice, diagnosis, or treatment. AI responses may be incomplete or inaccurate; verify important information with authoritative course resources.', visible: true },
      { heading: 'Content and personal study', body: 'Respect the rights of instructors and third-party authors. Platform materials are provided for personal study; do not redistribute materials without permission.', visible: true },
      { heading: 'Sponsored content', body: 'Some placements may contain sponsored content. Sponsorship does not imply endorsement of educational claims.', visible: true },
      { heading: 'Availability, liability, and termination', body: 'The platform may change, pause, or end features as it is developed. Use is at your discretion. Governing law: [TODO: obtain qualified legal review and specify applicable law]. Access may be suspended for misuse.', visible: true },
      { heading: 'Contact and review', body: 'Questions: {email}. Draft. Have a qualified lawyer review before launch (Egypt Personal Data Protection Law No. 151 of 2020).', visible: true },
    ] },
    copyright: { title: 'Copyright & Content', description: 'Content ownership and takedown requests.', lastUpdated: '2026-10-03', visible: true, sections: [
      { heading: 'Ownership', body: 'Course materials belong to their respective authors and instructors. Platform-authored text and design are © {owner}.', visible: true },
      { heading: 'Student use', body: 'Platform materials are provided for personal study. Third-party sources should be attributed to their respective rights holders.', visible: true },
      { heading: 'Takedown requests', body: 'Send requests to {email} with the material URL, rights-holder details, and an explanation of the concern.', visible: true },
    ] },
  },
  modules: {
    CNS: { label: 'Central Nervous System', summary: 'Meningitis, encephalitis, CSF analysis, and neuro-infectious syndromes.' },
    URS: { label: 'Urinary System', summary: 'Urinary tract infections, pyelonephritis, urine culture, and nephropathogens.' },
    REP: { label: 'Reproductive System', summary: 'Sexually transmitted infections, genital ulcers, and reproductive microbiology.' },
  },
  auth: { signInTitle: 'Welcome back', signInHelp: 'Sign in to continue your MedAtlas Egypt studies.', signUpTitle: 'Create your student account', signUpHelp: 'Use your email to access MedAtlas Egypt learning resources.' },
  campaigns: { title: 'Student support', description: 'Partner offers help support learning resources.', cta: 'Learn more', url: '', discountCode: '', disclosure: 'Sponsored content', active: false },
};

export function mergeSiteContent(value: unknown): SiteContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_SITE_CONTENT;
  const input = value as Partial<SiteContent>;
  const savedSocial = Array.isArray(input.brand?.social) ? input.brand.social.filter((item) => item && typeof item.label === 'string' && typeof item.url === 'string' && (() => { try { return new URL(item.url).protocol === 'https:'; } catch { return false; } })()) : [];
  return {
    ...DEFAULT_SITE_CONTENT, ...input,
    brand: { ...DEFAULT_SITE_CONTENT.brand, ...input.brand, social: [
      ...OFFICIAL_SOCIAL.map((official) => savedSocial.find((item) => sameLink(item.url, official.url)) ?? official),
      ...savedSocial.filter((item) => !OFFICIAL_SOCIAL.some((official) => sameLink(item.url, official.url))),
    ] },
    navigation: { ...DEFAULT_SITE_CONTENT.navigation, ...input.navigation },
    navigationOrder: Array.isArray(input.navigationOrder) ? Array.from(new Set(input.navigationOrder.filter((route): route is SiteContent['navigationOrder'][number] => ['home', 'modules', 'about', 'contact'].includes(route)))) : DEFAULT_SITE_CONTENT.navigationOrder,
    footer: { ...DEFAULT_SITE_CONTENT.footer, ...input.footer },
    home: { ...DEFAULT_SITE_CONTENT.home, ...input.home, features: Array.isArray(input.home?.features) ? input.home.features : DEFAULT_SITE_CONTENT.home.features },
    pages: Object.fromEntries(Object.keys(DEFAULT_SITE_CONTENT.pages).map((key) => {
      const pageKey = key as keyof SiteContent['pages']; const incoming = input.pages?.[pageKey];
      return [pageKey, { ...DEFAULT_SITE_CONTENT.pages[pageKey], ...incoming, sections: Array.isArray(incoming?.sections) ? incoming.sections.filter((s) => s && typeof s.heading === 'string' && typeof s.body === 'string') : DEFAULT_SITE_CONTENT.pages[pageKey].sections }];
    })) as SiteContent['pages'],
    modules: { ...DEFAULT_SITE_CONTENT.modules, ...input.modules }, auth: { ...DEFAULT_SITE_CONTENT.auth, ...input.auth },
    campaigns: { ...DEFAULT_SITE_CONTENT.campaigns, ...input.campaigns },
  };
}
