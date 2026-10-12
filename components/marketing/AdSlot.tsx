'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Tag,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Stethoscope,
  ArrowRight,
  Award,
} from 'lucide-react';
import { cardClass } from '@/lib/ui';
import type { AdCampaign } from '@/types';
import { useSettings } from '@/lib/useSettings';

export const ACADEMIC_PREP_CAMPAIGN: AdCampaign = {
  id: 'academic-clinical-prep-301',
  brand: 'Academic & Clinical Prep',
  title: 'Clinical Vignette Case Studies',
  badge: 'High-Yield Prep',
  tagline: 'High-yield topics and board-style simulations',
  description:
    'Bridge preclinical microbiology with clinical bedside diagnostic reasoning through focused case practice and automated AI evaluation.',
  ctaText: 'Start Practicing',
  ctaUrl: '#ai-studio',
  active: true,
  variant: 'academic',
};

export const MEDOVA_CAMPAIGN: AdCampaign = {
  id: 'medova-micro301-2026',
  brand: 'Medova Medical',
  title: 'Exclusive MUST 301 Student Partner Discount',
  badge: 'Official Partner',
  tagline: 'Diagnostic Tools, Littmann Stethoscopes & Study Gear',
  description:
    'Equip your clinical rotations with Medova’s hospital-grade stethoscopes and diagnostic kits. Get 20% off with student code MICRO301.',
  discountCode: 'MICRO301',
  ctaText: 'Claim 20% Discount',
  ctaUrl: 'https://medovamedical.com/students',
  active: true,
  variant: 'medova',
};

export interface AdSlotProps {
  placement?: 'banner' | 'sidebar' | 'inline' | 'compact';
  variant?: 'revive' | 'academic' | 'medova';
  campaign?: AdCampaign;
  className?: string;
  onActionClick?: () => void;
}

export default function AdSlot({
  placement = 'inline',
  variant,
  campaign,
  className = '',
  onActionClick,
}: AdSlotProps) {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ads = settings.site_content.ads;

  if (!ads?.enabled) return null;
  if (ads.placements && ads.placements[placement] === false) return null;

  // Admin campaign wins; otherwise optional builtin fallback (Medova / Academic only — Revive removed).
  const activeCampaign: AdCampaign | null = settings.site_content.campaigns.active
    ? {
        id: 'admin-campaign',
        brand: settings.site_content.brand.shortName,
        title: settings.site_content.campaigns.title,
        badge: settings.site_content.campaigns.disclosure,
        tagline: settings.site_content.campaigns.description,
        description: settings.site_content.campaigns.description,
        discountCode: settings.site_content.campaigns.discountCode || undefined,
        ctaText: settings.site_content.campaigns.cta,
        ctaUrl: settings.site_content.campaigns.url,
        active: true,
        variant: 'academic',
      }
    : campaign
      ?? (ads.showBuiltinFallbacks === false
        ? null
        : variant === 'academic'
          ? ACADEMIC_PREP_CAMPAIGN
          : variant === 'medova'
            ? MEDOVA_CAMPAIGN
            : null);

  if (dismissed || !activeCampaign?.active) return null;

  const copyCode = () => {
    if (!activeCampaign.discountCode) return;
    navigator.clipboard?.writeText(activeCampaign.discountCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLinkClick = () => {
    if (onActionClick) onActionClick();
  };

  // Top banner format
  if (placement === 'banner') {
    return (
      <div
        className={`relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-2.5 text-white shadow-sm dark:border-white/10 ${className}`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-cyan-400/20 px-2.5 py-0.5 font-bold tracking-wide text-cyan-300 ring-1 ring-cyan-400/30">
              <Sparkles className="h-3.5 w-3.5" />
              {activeCampaign.brand}
            </span>
            <span className="hidden font-medium text-slate-200 md:inline">
              {activeCampaign.title} —
            </span>
            <span className="text-slate-300">
              {activeCampaign.discountCode ? (
                <>
                  Use code <strong className="font-mono text-cyan-300 font-bold">{activeCampaign.discountCode}</strong> for discount
                </>
              ) : (
                activeCampaign.tagline
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeCampaign.discountCode && (
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Tag className="h-3 w-3 text-cyan-300" />}
                {copied ? 'Code Copied!' : `Copy ${activeCampaign.discountCode}`}
              </button>
            )}

            <a
              href={activeCampaign.ctaUrl}
              target={activeCampaign.ctaUrl.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              onClick={onActionClick}
              className="flex items-center gap-1 rounded-md bg-cyan-500 px-3 py-1 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 shadow-sm"
            >
              {activeCampaign.ctaText}
              {activeCampaign.ctaUrl.startsWith('http') && <ExternalLink className="h-3 w-3" />}
            </a>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
              className="ml-1 rounded p-1 text-slate-400 transition hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar widget format
  if (placement === 'sidebar') {
    return (
      <aside
        className={`${cardClass} relative overflow-hidden border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/60 ${className}`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400">
            <ShieldCheck className="h-3.5 w-3.5" /> {activeCampaign.brand}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
            Sponsored
          </span>
        </div>

        <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
          {activeCampaign.title}
        </h4>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {activeCampaign.description}
        </p>

        {activeCampaign.discountCode && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-800">
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Promo Code</p>
              <p className="font-mono text-sm font-bold text-blue-700 dark:text-cyan-300">
                {activeCampaign.discountCode}
              </p>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        )}

        <a
          href={activeCampaign.ctaUrl}
          target={activeCampaign.ctaUrl.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          onClick={onActionClick}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-center text-xs font-bold text-white shadow transition hover:bg-blue-700"
        >
          {activeCampaign.ctaText}
          {activeCampaign.ctaUrl.startsWith('http') ? (
            <ExternalLink className="h-3.5 w-3.5" />
          ) : (
            <ArrowRight className="h-3.5 w-3.5" />
          )}
        </a>
      </aside>
    );
  }

  // Inline / default creative (academic or generic campaign)
  return (
    <div
      className={`${cardClass} group relative overflow-hidden border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-6 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md dark:border-blue-900/40 dark:from-slate-900/80 dark:via-slate-900 dark:to-indigo-950/30 ${className}`}
    >
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-cyan-300">
              <GraduationCap className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
              Academic &amp; Clinical Prep
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <BookOpen className="h-3 w-3" />
              Focused Microbiology Practice
            </span>
          </div>

          <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white md:text-xl">
              Clinical Vignette Case Studies &amp; Diagnostic Practice
          </h3>
          <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Practice multi-step clinical diagnostic vignettes with instant AI-driven answer critique.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm border border-slate-200/80 dark:bg-slate-800 dark:border-white/10 dark:text-slate-300">
              <Stethoscope className="h-3 w-3 text-emerald-600" /> Step 1 Clinical Vignettes
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm border border-slate-200/80 dark:bg-slate-800 dark:border-white/10 dark:text-slate-300">
              <Award className="h-3 w-3 text-amber-500" /> MUST 301 OSPE Stations
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-end">
          <a
            href="#ai-studio"
            onClick={(e) => {
              if (onActionClick) {
                e.preventDefault();
                onActionClick();
              }
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Start Practicing</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <span className="text-[10px] text-slate-400">
            Interactive AI Study Studio below
          </span>
        </div>
      </div>
    </div>
  );
}
