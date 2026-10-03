'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Tag,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  Stethoscope,
  ArrowRight,
  Award,
  Layers,
} from 'lucide-react';
import { cardClass } from '@/lib/ui';
import type { AdCampaign } from '@/types';
import { useSettings } from '@/lib/useSettings';

export const REVIVE_CAMPAIGN: AdCampaign = {
  id: 'revive-mw-micro301',
  brand: 'Revive Medical Wear',
  title: 'Upgrade Your Clinical Wardrobe with Revive',
  badge: 'Official Sponsor',
  tagline: 'Premium Medical Scrubs, Lab Coats & Hospital Apparel',
  description:
    'Upgrade your clinical wardrobe with Revive Medical Wear. Engineered for comfort during long hospital shifts and rotations. Use code revivemicro301 for 10% off.',
  discountCode: 'revivemicro301',
  ctaText: 'Shop Revive',
  ctaUrl: 'https://www.revive-mw.net/',
  active: true,
  variant: 'revive',
};

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

  // Determine active campaign
  const activeCampaign: AdCampaign = settings.site_content.campaigns.active
    ? { id: 'admin-campaign', brand: settings.site_content.brand.shortName, title: settings.site_content.campaigns.title, badge: settings.site_content.campaigns.disclosure, tagline: settings.site_content.campaigns.description, description: settings.site_content.campaigns.description, discountCode: settings.site_content.campaigns.discountCode || undefined, ctaText: settings.site_content.campaigns.cta, ctaUrl: settings.site_content.campaigns.url, active: true, variant: 'revive' }
    : campaign ??
    (variant === 'academic'
      ? ACADEMIC_PREP_CAMPAIGN
      : variant === 'medova'
      ? MEDOVA_CAMPAIGN
      : REVIVE_CAMPAIGN);

  if (dismissed || !activeCampaign.active) return null;

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

  // ==========================================
  // INLINE VARIANT 1: Revive Medical Wear (Sponsor)
  // Modern e-commerce aesthetic, clean light mode default
  // ==========================================
  if (activeCampaign.variant === 'revive') {
    return (
      <div
        className={`${cardClass} group relative overflow-hidden border border-slate-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70 ${className}`}
      >
        {/* Subtle accent bar on top */}
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-slate-900 via-sky-600 to-indigo-600" />

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white dark:bg-slate-800 dark:text-cyan-300">
                <ShoppingBag className="h-3 w-3" />
                Featured Sponsor
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Revive Medical Wear
              </span>
              <span className="text-[11px] text-slate-400">· Premium Hospital Scrubs</span>
            </div>

            <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white md:text-xl">
              Upgrade your clinical wardrobe with Revive Medical Wear.
            </h3>
            <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Breathable, wrinkle-resistant antimicrobial scrubs, tailor-fitted lab coats, and modern physician apparel crafted for Egyptian medical students and healthcare professionals. Use code{' '}
              <strong className="font-mono text-blue-700 dark:text-cyan-300 font-bold bg-blue-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                revivemicro301
              </strong>{' '}
              for 10% off your entire order.
            </p>
          </div>

          {/* Right Action & Code Box */}
          <div className="flex flex-shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center md:flex-col md:items-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">10% Off:</span>
              <button
                type="button"
                onClick={copyCode}
                title="Click to copy promo code"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 font-mono text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-cyan-300 dark:hover:bg-slate-700"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Tag className="h-3.5 w-3.5 text-blue-600" />}
                <span>revivemicro301</span>
                <span className="text-[10px] font-normal text-slate-500">
                  ({copied ? 'Copied!' : 'Copy'})
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://www.revive-mw.net/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 hover:shadow active:scale-95 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
              >
                <span>Shop Revive</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <a
                href="https://www.instagram.com/revive_mw/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
                title="View Revive on Instagram"
                className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // INLINE VARIANT 2: Academic & Clinical Prep
  // Academic focus with clinical icons and MUST-aligned references
  // ==========================================
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
