import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { authorizeAndSpend } from '@/lib/apiAuth';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ChatRequestPayload {
  message: string;
  history?: ChatMessage[];
  taskComplexity?: 'general' | 'complex' | 'fast';
}

const SYSTEM_INSTRUCTION = `You are Dr. Atlas, a senior medical microbiology professor and clinical infectious diseases tutor for MedAtlas Egypt (Micro 301 course).
You specialize in:
1. Central Nervous System (CNS) Infections: Acute bacterial meningitis (N. meningitidis, S. pneumoniae, H. influenzae, L. monocytogenes), viral meningoencephalitis, CSF analysis, and OSPE gram-staining.
2. Urinary System (URS) Infections: Uropathogenic E. coli (UPEC, P-fimbriae), acute pyelonephritis vs cystitis, Proteus mirabilis (urease, struvite stones), urine culture AST on MacConkey and CLED agar.
3. Reproductive System (REP) Infections: Treponema pallidum (Syphilis staging, darkfield microscopy, serology), Neisseria gonorrhoeae, Chlamydia trachomatis, and genital ulcer differentials.

Provide high-yield, exam-focused, and clinically grounded explanations for Egyptian medical students. Include clinical pearls, mnemonic memory aids, and differential diagnosis tables when relevant. Maintain a professional, encouraging academic tone.`;

// Intelligent fallback responses when offline or without API key
function getFallbackAnswer(msg: string): string {
  const query = msg.toLowerCase();
  if (query.includes('csf') || query.includes('meningitis') || query.includes('cns')) {
    return `**Dr. Atlas Clinical Review: CSF Interpretation in Meningitis**

1. **Acute Bacterial Meningitis:**
   - **Opening Pressure:** Elevated (>200-300 mm H₂O)
   - **Appearance:** Turbid / Purulent
   - **WBC Count:** Markedly elevated (>1,000-5,000/μL), >80-90% PMNs (Neutrophils)
   - **Protein:** Markedly increased (>100-500 mg/dL)
   - **Glucose:** Markedly decreased (<40 mg/dL or CSF:serum ratio < 0.4)
   - **Key Pathogens:** *N. meningitidis* (Gram-negative coffee-bean diplococci), *S. pneumoniae* (Gram-positive lancet diplococci), *L. monocytogenes* in neonates/elderly.

2. **Viral (Aseptic) Meningitis:**
   - **Opening Pressure:** Normal to slightly elevated
   - **Appearance:** Clear
   - **WBC Count:** Moderately elevated (50-500/μL), predominantly **Lymphocytes**
   - **Protein:** Normal to mildly elevated
   - **Glucose:** Normal (CSF:serum ratio > 0.6)
   - **Key Pathogens:** Enteroviruses (Coxsackie, Echovirus), HSV-2, Arboviruses.

*Clinical Pearl:* Always initiate empiric Ceftriaxone + Vancomycin immediately. Add Ampicillin if *Listeria* is a concern!`;
  }

  if (query.includes('uti') || query.includes('urinary') || query.includes('pyelonephritis') || query.includes('proteus') || query.includes('e. coli')) {
    return `**Dr. Atlas Clinical Review: Urinary System (URS) Pathogens**

1. **Uropathogenic E. coli (UPEC) - ~80% of UTIs:**
   - **Key Virulence:** **Type 1 fimbriae** (binds bladder uroplakin; cystitis) & **P-fimbriae / Pyelonephritis-associated pili** (binds Gal-Gal receptors in renal parenchyma; enables upward ascent causing acute pyelonephritis).
   - **Culture Hallmark:** Pink lactose-fermenting colonies on MacConkey agar; Green metallic sheen on EMB agar.
   - **Clinical Indicator:** **WBC Casts** in urinalysis confirm upper tract involvement (Acute Pyelonephritis).

2. **Proteus mirabilis:**
   - **Key Virulence:** Potent **Urease** production, hydrolyzing urea to ammonia + CO₂.
   - **Diagnostic Hallmark:** Alkaline urine (pH > 7.5-8.0), formation of magnesium ammonium phosphate (**Struvite / Staghorn calculi**), and characteristic **swarming motility** on non-inhibitory blood agar.
   - **Culture:** Colorless non-lactose fermenting colonies on MacConkey agar.`;
  }

  if (query.includes('syphilis') || query.includes('rep') || query.includes('chancre') || query.includes('gonorrhea') || query.includes('ulcer')) {
    return `**Dr. Atlas Clinical Review: Reproductive System (REP) Genital Ulcers**

1. **Primary Syphilis (*Treponema pallidum*):**
   - **Lesion:** Single, **painless**, indurated ulcer with clean base and raised cartilaginous borders (Hard/Hunterian Chancre).
   - **Lymphadenopathy:** Non-tender, bilateral inguinal.
   - **Microscopy:** Cannot be seen on standard light microscopy; visible as slender motile corkscrew spirochetes on **Darkfield Microscopy**.
   - **Drug of Choice:** Benzathine Penicillin G (Single IM dose).

2. **Chancroid (*Haemophilus ducreyi*):**
   - **Lesion:** Multiple, **extremely painful**, soft, ragged ulcer with necrotic purulent base.
   - **Mnemonic:** *"You DO CRY with Ducreyi because it is painful!"*`;
  }

  return `**Dr. Atlas's Medical Guidance:**

Thank you for your question regarding **Micro 301**. Here are the core academic principles to keep in mind:

- Always correlate the patient's anatomical presentation with primary microbiological diagnostic tests (direct microscopy, Gram stain morphology, and selective culture media).
- On **MacConkey Agar**: Lactose fermenters (*E. coli*, *Klebsiella*) turn pink; non-fermenters (*Proteus*, *Pseudomonas*, *Salmonella*) remain pale/transparent.
- For **CNS Infections**: Lumbar puncture with immediate Gram stain and CSF glucose/protein ratio is critical.
- For **Urinary System**: Differentiate upper UTI (Pyelonephritis with WBC casts and flank tenderness) from lower UTI (Cystitis).

Feel free to ask about any specific bacterium, virus, virulence factor, OSPE practical station, or clinical case study!`;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestPayload = await req.json();
    const { message, history = [], taskComplexity = 'general' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const access = await authorizeAndSpend(req, 1);
    if ('response' in access) return access.response;

    // Select recommended model:
    // gemini-3.1-pro-preview for complex tasks, gemini-3.5-flash for general tasks, gemini-3.1-flash-lite for fast tasks.
    const model =
      taskComplexity === 'complex'
        ? 'gemini-3.5-flash' // using 3.5-flash for complex/general stability
        : taskComplexity === 'fast'
        ? 'gemini-3.1-flash-lite'
        : 'gemini-3.5-flash';

    if (ai) {
      try {
        const formattedHistory = history.map((item) => ({
          role: item.role,
          parts: [{ text: item.text }],
        }));

        const chat = ai.chats.create({
          model,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            topP: 0.95,
          },
          history: formattedHistory,
        });

        const response = await chat.sendMessage({
          message: message.trim(),
        });

        const responseText = response.text || '';
        if (responseText) {
          return NextResponse.json({
            reply: responseText,
            modelUsed: model,
            source: 'gemini',
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini chat API fallback to domain tutor:', geminiError);
      }
    }

    // High quality clinical tutor fallback
    const fallbackText = getFallbackAnswer(message);
    return NextResponse.json({
      reply: fallbackText,
      modelUsed: 'dr-atlas-curated-tutor',
      source: 'curated_tutor',
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
