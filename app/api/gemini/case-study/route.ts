import { NextRequest, NextResponse } from 'next/server';
import { ai, GEMINI_MODEL } from '@/lib/gemini';
import { authorizeAndSpend } from '@/lib/apiAuth';
import { createSupabaseAdmin } from '@/lib/supabaseAdmin';
import type { ModuleName } from '@/types';

interface CaseStudyPayload {
  module: ModuleName;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  material_id?: string;
  raw_feed?: string;
}

// In-memory cache for high-demand clinical cases (0 tokens, 0 latency)
const caseCache = new Map<string, any>();

function safeJsonParse(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return JSON.parse(cleaned.trim());
}

const FALLBACK_CASES: Record<ModuleName, any> = {
  CNS: {
    title: 'Acute Onset Fever, Severe Headache, and Nuchal Rigidity in an 18-Year-Old College Student',
    module: 'CNS',
    difficulty: 'intermediate',
    patient: {
      demographics: '18-year-old male university freshman',
      chiefComplaint: 'Rapid onset of fever (39.4°C), photophobia, severe throbbing headache, and neck stiffness for 18 hours.',
      physicalExam: 'Toxic appearance, Kernig’s and Brudzinski’s signs both markedly positive. Petechial purpuric rash observed on lower extremities.',
      labFindings: [
        'Lumbar Puncture: Opening pressure 280 mm H2O (elevated)',
        'CSF Appearance: Turbid, cloudy yellowish',
        'CSF WBC: 4,500/mm³ (92% neutrophils)',
        'CSF Protein: 220 mg/dL (markedly elevated)',
        'CSF Glucose: 18 mg/dL (serum glucose 105 mg/dL; ratio < 0.2)',
        'Gram Stain: Intracellular Gram-negative diplococci with adjacent indented sides (coffee-bean shape)',
      ],
    },
    question: 'What is the most likely causative organism, and what is the primary virulence factor responsible for evading complement-mediated killing?',
    options: [
      { id: 'A', text: 'Streptococcus pneumoniae — Pneumolysin toxin', isCorrect: false },
      { id: 'B', text: 'Neisseria meningitidis (Serogroup B/C/Y) — Antiphagocytic polysaccharide capsule and IgA1 protease', isCorrect: true },
      { id: 'C', text: 'Listeria monocytogenes — Listeriolysin O', isCorrect: false },
      { id: 'D', text: 'Haemophilus influenzae type b — Polyribosylribitol phosphate (PRP)', isCorrect: false },
    ],
    explanation: 'The classic clinical triad of acute bacterial meningitis along with petechial/purpuric rash and Gram-negative coffee-bean shaped diplococci points directly to Neisseria meningitidis (meningococcus). Its key virulence factors include the antiphagocytic polysaccharide capsule, lipooligosaccharide (LOS) endotoxin triggering septic shock and petechiae, and IgA1 protease aiding mucosal colonization.',
    clinicalPearls: [
      'Calibrated on Levinson & First Aid: Empirical therapy is IV Ceftriaxone + Vancomycin (plus Ampicillin if Listeria is suspected in neonates/elderly).',
      'Prophylaxis for close household/dorm contacts: Rifampin, Ciprofloxacin, or single-dose Ceftriaxone.',
    ],
  },
  URS: {
    title: 'Dysuria, Flank Pain, and CVA Tenderness in a 24-Year-Old Female',
    module: 'URS',
    difficulty: 'intermediate',
    patient: {
      demographics: '24-year-old female, sexually active',
      chiefComplaint: 'Burning on urination (dysuria), urinary frequency, chills, nausea, and right-sided flank pain for 2 days.',
      physicalExam: 'Temperature 38.8°C, tachycardia (104 bpm), marked right costovertebral angle (CVA) tenderness.',
      labFindings: [
        'Urinalysis: Cloudy, +++ Leukocyte Esterase, ++ Nitrites, microscopic hematuria',
        'Microscopy: >50 WBCs/HPF, White Blood Cell (WBC) casts present',
        'Urine Culture: >100,000 CFU/mL of lactose-fermenting, indole-positive Gram-negative bacilli on MacConkey agar (pink colonies)',
      ],
    },
    question: 'The presence of WBC casts indicates upper urinary tract involvement (acute pyelonephritis). Which specific virulence factor allows the causative pathogen to ascend from the bladder to the renal pelvis?',
    options: [
      { id: 'A', text: 'Type 1 fimbriae (mannose-sensitive adhesion to bladder uroepithelium only)', isCorrect: false },
      { id: 'B', text: 'P fimbriae (pyelonephritis-associated pili binding digalactoside Gala(1-4)Gal on uroepithelium)', isCorrect: true },
      { id: 'C', text: 'Urease enzyme generating alkaline ammonium ions', isCorrect: false },
      { id: 'D', text: 'Coagulase enzyme inducing fibrinous barrier', isCorrect: false },
    ],
    explanation: 'Uropathogenic Escherichia coli (UPEC) is the leading cause of both cystitis and acute pyelonephritis. While Type 1 fimbriae mediate binding to bladder epithelium, P fimbriae (pyelonephritis-associated pili) recognize Gala(1-4)Gal receptors present on renal tubular and uroepithelial cells, facilitating upward ascension to the renal parenchyma causing acute pyelonephritis.',
    clinicalPearls: [
      'Calibrated on Levinson & First Aid: WBC casts are the hallmark differentiator between upper UTI (pyelonephritis) vs lower UTI (cystitis).',
      'Proteus mirabilis produces urease, producing alkaline urine (pH > 7.5) and staghorn calculi (struvite stones).',
    ],
  },
  REP: {
    title: 'Painless Indurated Genital Ulcer in a 29-Year-Old Male',
    module: 'REP',
    difficulty: 'intermediate',
    patient: {
      demographics: '29-year-old male',
      chiefComplaint: 'Noticed a single, painless ulcer on the shaft of the penis for 10 days.',
      physicalExam: 'Circumscribed, 1.2 cm indurated ulcer with a clean base and raised, firm cartilaginous borders (chancre). Painless, non-tender bilateral inguinal lymphadenopathy.',
      labFindings: [
        'Standard Gram Stain: No organisms visible (cannot be visualized by light microscopy)',
        'Darkfield Microscopy of ulcer exudate: Slender, tightly wound corkscrew-motile spirochetes',
        'RPR / VDRL: Positive titer (1:16)',
        'Confirmatory FTA-ABS: Reactive',
      ],
    },
    question: 'What is the etiologic agent of this primary lesion, and what is the drug of choice for treatment?',
    options: [
      { id: 'A', text: 'Haemophilus ducreyi (Chancroid) — Oral Azithromycin', isCorrect: false },
      { id: 'B', text: 'Treponema pallidum subsp. pallidum (Primary Syphilis) — Benzathine Penicillin G (single IM dose)', isCorrect: true },
      { id: 'C', text: 'Herpes Simplex Virus Type 2 — Oral Acyclovir', isCorrect: false },
      { id: 'D', text: 'Chlamydia trachomatis L1-L3 (LGV) — Doxycycline 21 days', isCorrect: false },
    ],
    explanation: 'A single, painless, hard indurated ulcer (Hunterian chancre) accompanied by non-tender regional lymphadenopathy is pathognomonic for Primary Syphilis caused by Treponema pallidum. Because T. pallidum lacks peptidoglycan-remodeling enzymes leading to penicillin resistance, Benzathine Penicillin G remains 100% bactericidal and the gold standard drug of choice.',
    clinicalPearls: [
      'Calibrated on Levinson & First Aid: "Hard & Painless = Syphilis; Soft & Painful = Chancroid (Haemophilus ducreyi)".',
      'Watch out for the Jarisch-Herxheimer reaction (fever, chills, hypotension) hours after starting penicillin due to massive spirochetal endotoxin/antigen release.',
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: CaseStudyPayload = await req.json();
    const moduleName = body.module || 'URS';
    const topic = body.topic || '';
    const difficulty = body.difficulty || 'intermediate';

    let lectureFeedContext = (body.raw_feed || '').trim();
    let lectureFeedTitle = '';

    if (body.material_id) {
      const admin = createSupabaseAdmin();
      if (admin) {
        const { data: material } = await admin
          .from('materials')
          .select('title,ai_context,raw_quiz_text,custom_system_prompt')
          .eq('id', body.material_id)
          .maybeSingle();

        if (material) {
          lectureFeedTitle = material.title || '';
          const parts = [
            material.ai_context ? `Lecture Knowledge Context:\n${material.ai_context}` : '',
            material.raw_quiz_text ? `Lecture Core Focus & Practice Material:\n${material.raw_quiz_text}` : '',
            material.custom_system_prompt ? `Professor Instructions:\n${material.custom_system_prompt}` : '',
          ].filter(Boolean);

          if (parts.length > 0) {
            lectureFeedContext = (lectureFeedContext ? lectureFeedContext + '\n\n' : '') + parts.join('\n\n');
          }
        }
      }
    }

    const access = await authorizeAndSpend(req, 3);
    if ('response' in access) return access.response;

    // 1. Check in-memory edge cache only if no custom feed is provided
    const hasCustomFeed = Boolean(lectureFeedContext.trim());
    const cacheKey = `${moduleName}_${(topic || 'core').toLowerCase().trim()}_${difficulty}`;
    if (!hasCustomFeed && caseCache.has(cacheKey)) {
      return NextResponse.json({
        success: true,
        caseStudy: caseCache.get(cacheKey),
        source: 'cached_edge',
      });
    }

    if (ai) {
      const prompt = `Generate a realistic medical student microbiology case study vignette for MUST 301 Medical Microbiology, calibrated on Levinson (Review of Medical Microbiology & Immunology) and First Aid (USMLE Step 1).
Module: ${moduleName} (CNS: Central Nervous System, URS: Urinary System, REP: Reproductive System).
Specific Topic / Pathogen requested: ${topic || lectureFeedTitle || 'High-yield common pathology for this module'}.
Difficulty level: ${difficulty}.
${
  hasCustomFeed
    ? `\n--- RAW LECTURE FEED & KNOWLEDGE CONTEXT (${lectureFeedTitle ? `Lecture: ${lectureFeedTitle}` : 'Course Feed'}) ---
${lectureFeedContext.slice(0, 35_000)}

CRITICAL INSTRUCTION: You MUST ground this case study directly in the specific clinical facts, pathogens, diagnostic criteria, virulence factors, and professor emphases provided in the above raw lecture feed.\n`
    : ''
}
Return ONLY valid JSON matching this schema:
{
  "title": "Descriptive title of case",
  "module": "${moduleName}",
  "difficulty": "${difficulty}",
  "patient": {
    "demographics": "Age, sex, occupation",
    "chiefComplaint": "Patient symptoms and timeline",
    "physicalExam": "Vitals, key signs",
    "labFindings": ["Array of lab and diagnostic findings like CSF, Urine Culture, Gram stain, Serology"]
  },
  "question": "Clinical multiple-choice question testing microbiology pathogen identification, virulence factor, or treatment",
  "options": [
    { "id": "A", "text": "Option A", "isCorrect": false },
    { "id": "B", "text": "Option B", "isCorrect": true },
    { "id": "C", "text": "Option C", "isCorrect": false },
    { "id": "D", "text": "Option D", "isCorrect": false }
  ],
  "explanation": "Detailed clinical reasoning of why the answer is correct and why other options are wrong",
  "clinicalPearls": ["2-3 high yield exam tips or clinical pearls for MUST 301 students"]
}`;

      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = safeJsonParse(response.text);
          // Store in edge cache
          caseCache.set(cacheKey, parsed);
          return NextResponse.json({ success: true, caseStudy: parsed, source: 'gemini' });
        }
      } catch (genErr: any) {
        console.warn('Gemini case generation fallback:', genErr?.message || genErr);
      }
    }

    // High quality clinical bank fallback
    const fallbackCase = FALLBACK_CASES[moduleName] || FALLBACK_CASES.URS;
    return NextResponse.json({
      success: true,
      caseStudy: {
        ...fallbackCase,
        title: topic ? `${fallbackCase.title} [Focus: ${topic}]` : fallbackCase.title,
      },
      source: 'curated_bank',
      notice: 'AI Study Studio is currently cooling down due to high demand. Serving calibrated offline clinical case.',
    });
  } catch (error: any) {
    console.error('Case study API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate medical case study' },
      { status: 500 }
    );
  }
}
