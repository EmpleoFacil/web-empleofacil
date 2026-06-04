'use client';

import { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresetCategory } from '@/lib/job-option-presets';

type OptionChecklistPickerProps = {
  title: string;
  accent: 'blue' | 'green';
  categories: PresetCategory[];
  selected: string[];
  onChange: (items: string[]) => void;
  max?: number;
  searchPlaceholder: string;
};

export function OptionChecklistPicker({
  title,
  accent,
  categories,
  selected,
  onChange,
  max = 10,
  searchPlaceholder,
}: OptionChecklistPickerProps) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');
  const [query, setQuery] = useState('');

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0];
  const normalizedQuery = query.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    const base = activeCategory?.items ?? [];
    if (!normalizedQuery) return base;
    return base.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [activeCategory, normalizedQuery]);

  const canAddCustom = normalizedQuery.length > 1 && !visibleItems.some((item) => item.toLowerCase() === normalizedQuery);

  const toggleItem = (item: string) => {
    const exists = selected.includes(item);
    if (exists) {
      onChange(selected.filter((entry) => entry !== item));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, item]);
  };

  const addCustomItem = () => {
    const customLabel = query.trim();
    if (!customLabel || selected.includes(customLabel) || selected.length >= max) return;
    onChange([...selected, customLabel]);
    setQuery('');
  };

  const accentStyles =
    accent === 'green'
      ? {
          ring: 'text-[#16A34A]',
          border: 'border-[#86EFAC]',
          bg: 'bg-[#F0FDF4]',
          selectedIcon: 'bg-[#16A34A] text-white',
          chip: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
          categoryActive: 'border-[#16A34A] bg-[#F0FDF4] text-[#166534]',
        }
      : {
          ring: 'text-[#0B5CFF]',
          border: 'border-[#93C5FD]',
          bg: 'bg-[#EFF6FF]',
          selectedIcon: 'bg-[#0B5CFF] text-white',
          chip: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]',
          categoryActive: 'border-[#0B5CFF] bg-[#EFF6FF] text-[#1D4ED8]',
        };

  return (
    <div className="rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-[30px] font-semibold tracking-[-0.03em] text-[#0F172A]">{title}</h3>
        <span className={cn('text-lg font-semibold', accentStyles.ring)}>
          {selected.length}/{max}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategoryId(category.id)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC]',
              activeCategoryId === category.id && accentStyles.categoryActive
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-16 w-full rounded-2xl border border-[#D8E1EE] bg-white pl-12 pr-4 text-lg text-[#0F172A] outline-none transition focus:border-[#0B5CFF] focus:ring-4 focus:ring-[#DBEAFE]"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleItems.map((item) => {
          const checked = selected.includes(item);
          const disabled = !checked && selected.length >= max;

          return (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => toggleItem(item)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-[17px] font-medium text-[#0F172A] transition',
                checked ? `${accentStyles.border} ${accentStyles.bg}` : 'border-[#D8E1EE] bg-white hover:border-[#CBD5E1]',
                disabled && 'cursor-not-allowed opacity-45'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-transparent',
                  checked
                    ? `${accentStyles.selectedIcon} border-transparent`
                    : 'border-[#CBD5E1] bg-white'
                )}
              >
                <Check className="h-4 w-4" />
              </span>
              <span>{item}</span>
            </button>
          );
        })}

        {canAddCustom && (
          <button
            type="button"
            onClick={addCustomItem}
            disabled={selected.length >= max}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-4 text-left text-[17px] font-medium text-[#334155] transition hover:border-[#94A3B8]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-sm font-semibold text-[#334155]">
              +
            </span>
            Agregar &quot;{query.trim()}&quot;
          </button>
        )}
      </div>

      <div className="mt-8 border-t border-[#EEF2F7] pt-5">
        <p className="text-lg font-semibold text-[#334155]">Seleccionados ({selected.length})</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {selected.length ? (
            selected.map((item) => (
              <span
                key={item}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium',
                  accentStyles.chip
                )}
              >
                {item}
                <button
                  type="button"
                  onClick={() => toggleItem(item)}
                  className="rounded-full p-0.5 text-current opacity-70 transition hover:bg-black/5 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-[#94A3B8]">Aun no has seleccionado opciones.</p>
          )}
        </div>
      </div>
    </div>
  );
}
