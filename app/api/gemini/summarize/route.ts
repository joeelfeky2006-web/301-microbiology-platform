import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/gemini';
import { MODULE_TITLES, type ModuleName } from '@/types';

interface SummarizePayload {
  module: ModuleName;
  topic: string;
  focusArea?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SummarizePayload = await req.json();
    const moduleName = body.module || 'URS';
    const topic = body.topic || 'Core High-Yield Microorganisms';
    const moduleFullName = MODULE_TITLES[moduleName] || 'Medical Microbiology';

    if (ai) {
      const prompt = `You are a microbiology professor for MUST 301 Medical Microbiology (${moduleFullName}).
Provide a high-yield, exam-focused syllabus summary on: "${topic}".
Include:
1. Executive summary of pathology
2. Key pathogens with morphology, staining, culture media (MacConkey, Blood, Chocolate, Thayer-Martin, etc.)
3. Critical virulence factors and toxins
4. Diagnostic hallmarks (Gold standards, rapid tests, serology)
5. Treatment of choice & empirical guidelines
6. Common exam pitfalls and tricky multiple-choice distractors

Return ONLY valid JSON matching this schema:
{
  "module": "${moduleName}",
  "moduleTitle": "${moduleFullName}",
  "topic": "${topic}",
  "overview": "Short executive paragraph explaining clinical significance",
  "keyPathogens": [
    {
      "name": "Pathogen scientific name",
      "classification": "Gram-positive cocci in clusters, etc.",
      "cultureMedia": "Specific agar and colonial characteristics",
      "virulenceFactors": ["Capsule", "Endotoxin", "Exotoxins"],
      "clinicalManifestation": "Diseases produced",
      "treatment": "First-line antibiotic/drug"
    }
  ],
  "diagnosticAlgorithms": ["Step 1...", "Step 2..."],
  "examTraps": ["Common exam mistake students make on MUST 301 exams..."]
}`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          return NextResponse.json({ success: true, summary: parsed, source: 'gemini' });
        }
      } catch (err) {
        console.warn('Gemini summarize fallback to local database:', err);
      }
    }

    // Curated high yield fallback summary
    const fallbackSummary = {
      module: moduleName,
      moduleTitle: moduleFullName,
      topic: topic,
      overview: `High-yield syllabus review for ${moduleFullName} (301 Microbiology). Emphasizing differential diagnosis, distinctive colonial morphology, selective growth media, and primary mechanisms of antimicrobial resistance.`,
      keyPathogens: [
        {
          name: moduleName === 'URS' ? 'Escherichia coli (UPEC)' : moduleName === 'CNS' ? 'Neisseria meningitidis' : 'Treponema pallidum',
          classification: moduleName === 'URS' ? 'Gram-negative bacillus, facultative anaerobe' : moduleName === 'CNS' ? 'Gram-negative coffee-bean diplococci' : 'Spirochete, motile axial filaments',
          cultureMedia: moduleName === 'URS' ? 'MacConkey agar (pink colonies, lactose+), EMB agar (green metallic sheen)' : moduleName === 'CNS' ? 'Thayer-Martin agar (VPN: Vancomycin, Polymyxin, Nystatin), Chocolate agar' : 'Cannot be cultured on artificial media; darkfield microscopy',
          virulenceFactors: [
            moduleName === 'URS' ? 'P fimbriae (pyelonephritis)' : moduleName === 'CNS' ? 'Antiphagocytic polysaccharide capsule' : 'Endoflagella, outer membrane proteins',
            moduleName === 'URS' ? 'Type 1 pili (cystitis)' : moduleName === 'CNS' ? 'LOS endotoxin (petechial purpura)' : 'Hyaluronidase',
          ],
          clinicalManifestation: moduleName === 'URS' ? 'Uncomplicated cystitis, acute pyelonephritis, catheter-associated UTI' : moduleName === 'CNS' ? 'Acute meningococcal meningitis, Waterhouse-Friderichsen syndrome' : 'Primary chancre, Secondary rash/condylomata lata, Tertiary neurosyphilis/gummas',
          treatment: moduleName === 'URS' ? 'Nitrofurantoin / TMP-SMX (cystitis); Ceftriaxone / Fluoroquinolones (pyelonephritis)' : moduleName === 'CNS' ? 'IV Ceftriaxone (Rifampin for close contacts prophylaxis)' : 'Benzathine Penicillin G (IM single dose for primary)',
        },
        {
          name: moduleName === 'URS' ? 'Proteus mirabilis' : moduleName === 'CNS' ? 'Streptococcus pneumoniae' : 'Neisseria gonorrhoeae',
          classification: moduleName === 'URS' ? 'Gram-negative bacillus, swarming motility' : moduleName === 'CNS' ? 'Gram-positive lancet-shaped diplococci, alpha-hemolytic' : 'Gram-negative intracellular diplococci',
          cultureMedia: moduleName === 'URS' ? 'Swarming motility on non-inhibitory blood agar; urease positive (turns pink on Christensen urea agar)' : moduleName === 'CNS' ? 'Blood agar (alpha-hemolytic green zone), Optochin sensitive, bile soluble' : 'Thayer-Martin selective media',
          virulenceFactors: [
            moduleName === 'URS' ? 'Abundant Urease enzyme' : moduleName === 'CNS' ? 'Capsular polysaccharide (>90 serotypes)' : 'Pili with extensive antigenic variation',
            moduleName === 'URS' ? 'Staghorn calculi formation' : moduleName === 'CNS' ? 'Pneumolysin and IgA protease' : 'Opa proteins, IgA protease',
          ],
          clinicalManifestation: moduleName === 'URS' ? 'UTI with alkaline urine (pH > 7.5), struvite staghorn stones' : moduleName === 'CNS' ? 'Most common community-acquired bacterial meningitis in adults' : 'Purulent urethritis, cervicitis, PID, septic arthritis',
          treatment: moduleName === 'URS' ? 'Fluoroquinolones or Cephalosporins' : moduleName === 'CNS' ? 'IV Ceftriaxone + Vancomycin' : 'Ceftriaxone 500mg IM + Doxycycline (if Chlamydia not ruled out)',
        },
      ],
      diagnosticAlgorithms: [
        'Collect specimen prior to starting antimicrobial therapy whenever clinically stable.',
        'Initial Gram stain / microscopic screening for immediate directional clue.',
        'Inoculate selective media (MacConkey / Thayer-Martin / Chocolate agar) based on anatomic site.',
        'Perform automated or disk-diffusion Kirby-Bauer antimicrobial susceptibility testing (AST).',
      ],
      examTraps: [
        'Confusing Proteus mirabilis (urease-positive, swarming) with E. coli (urease-negative, lactose-fermenting).',
        'Forgetting that Listeria monocytogenes causes meningitis in neonates and elderly >50 and requires Ampicillin addition.',
        'Differentiating painful genital ulcers (Chancroid - H. ducreyi) from painless hard ulcers (Syphilis - T. pallidum).',
      ],
    };

    return NextResponse.json({ success: true, summary: fallbackSummary, source: 'curated_bank' });
  } catch (error: any) {
    console.error('Summarize API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate syllabus summary' },
      { status: 500 }
    );
  }
}
