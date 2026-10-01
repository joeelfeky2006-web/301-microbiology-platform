'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Material, ModuleName } from '@/types';

const PROGRESS_STORAGE_KEY = 'medatlas_student_progress';

export interface ModuleProgressStats {
  module: ModuleName;
  total: number;
  completed: number;
  percent: number;
}

export interface OverallProgressStats {
  total: number;
  completed: number;
  percent: number;
  byModule: Record<ModuleName, ModuleProgressStats>;
}

export function getCompletedItemIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch {
    // fallback
  }
  return new Set();
}

export function saveCompletedItemIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
    window.dispatchEvent(new Event('progress_updated'));
  } catch {
    // ignore
  }
}

export function isItemCompleted(id: string): boolean {
  return getCompletedItemIds().has(id);
}

export function toggleItemCompletion(id: string): boolean {
  const current = getCompletedItemIds();
  const willBeCompleted = !current.has(id);
  if (willBeCompleted) {
    current.add(id);
  } else {
    current.delete(id);
  }
  saveCompletedItemIds(current);
  return willBeCompleted;
}

export function setItemCompletion(id: string, completed: boolean): void {
  const current = getCompletedItemIds();
  if (completed) {
    current.add(id);
  } else {
    current.delete(id);
  }
  saveCompletedItemIds(current);
}

export function markMultipleItems(ids: string[], completed: boolean): void {
  const current = getCompletedItemIds();
  ids.forEach((id) => {
    if (completed) current.add(id);
    else current.delete(id);
  });
  saveCompletedItemIds(current);
}

export function resetAllProgress(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    window.dispatchEvent(new Event('progress_updated'));
  } catch {
    // ignore
  }
}

export function calculateProgress(
  materials: Material[],
  completedSet: Set<string>
): OverallProgressStats {
  const modules: ModuleName[] = ['CNS', 'URS', 'REP'];
  const byModule: Record<ModuleName, ModuleProgressStats> = {
    CNS: { module: 'CNS', total: 0, completed: 0, percent: 0 },
    URS: { module: 'URS', total: 0, completed: 0, percent: 0 },
    REP: { module: 'REP', total: 0, completed: 0, percent: 0 },
  };

  materials.forEach((m) => {
    if (byModule[m.module]) {
      byModule[m.module].total += 1;
      if (completedSet.has(m.id)) {
        byModule[m.module].completed += 1;
      }
    }
  });

  let totalItems = 0;
  let totalCompleted = 0;

  modules.forEach((mod) => {
    const stat = byModule[mod];
    stat.percent = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
    totalItems += stat.total;
    totalCompleted += stat.completed;
  });

  const percent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  return {
    total: totalItems,
    completed: totalCompleted,
    percent,
    byModule,
  };
}

/** React hook for live module progress synchronization */
export function useModuleProgress(materials: Material[] = []) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const sync = useCallback(() => {
    setCompletedIds(getCompletedItemIds());
  }, []);

  useEffect(() => {
    sync();
    const handleUpdate = () => sync();
    window.addEventListener('progress_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('progress_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [sync]);

  const toggle = useCallback((id: string) => {
    return toggleItemCompletion(id);
  }, []);

  const isComplete = useCallback(
    (id: string) => {
      return completedIds.has(id);
    },
    [completedIds]
  );

  const stats = calculateProgress(materials, completedIds);

  return {
    completedIds,
    toggle,
    isComplete,
    stats,
    markMultiple: markMultipleItems,
    resetProgress: resetAllProgress,
  };
}
