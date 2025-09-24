'use client';

import { CircleX, Pencil, Eraser, Eye, EyeOff } from 'lucide-react';
import {
  PrimitiveFilter,
  CollectionFilter,
  ComplexFilter,
} from '@/app/types/collectionTypes';
import { cn } from '@/lib/utils';

interface FilterChipsProps {
  filters: ComplexFilter | undefined | null;
  onRemoveFilter: (filterId: string) => void;
  onEditFilter: (filter: PrimitiveFilter) => void;
  onClearAllFilters: () => void;
  onToggleFilter: (filterId: string) => void;
  className?: string;
  disabled?: boolean;
}

export const FilterChips = ({
  filters,
  onRemoveFilter,
  onEditFilter,
  onClearAllFilters,
  onToggleFilter,
  className,
  disabled = false,
}: FilterChipsProps) => {
  const currentFilters = filters?.filters || [];

  if (currentFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {currentFilters.map((subFilter: CollectionFilter) => {
        const isDisabled = subFilter.disabled === true;
        return (
          <div
            key={subFilter.id}
            className={cn(
              'inline-flex items-center gap-x-1 text-[11px] border pl-1.5 pr-1 py-0.5 rounded-md transition-colors',
              isDisabled
                ? 'bg-muted text-muted-foreground border-dashed border-muted-foreground/50'
                : 'bg-indigo-bg text-primary border-indigo-border'
            )}
          >
            {(() => {
              if (subFilter.type === 'primitive') {
                const filterCast = subFilter as PrimitiveFilter;
                return (
                  <>
                    <span className="font-mono">
                      {filterCast.key_path.join('.')}
                    </span>
                    <span
                      className={cn(
                        'font-mono',
                        isDisabled
                          ? 'text-muted-foreground/70'
                          : 'text-indigo-400'
                      )}
                    >
                      {filterCast.op || '=='}
                    </span>
                    <span className="font-mono">
                      {String(filterCast.value)}
                    </span>
                  </>
                );
              } else {
                return `${subFilter.type} filter`;
              }
            })()}
            <button
              onClick={() => onToggleFilter(subFilter.id)}
              className="p-0.5 text-current hover:text-current/60 transition-colors"
              title={isDisabled ? 'Enable filter' : 'Disable filter'}
              disabled={disabled}
            >
              {isDisabled ? <Eye size={10} /> : <EyeOff size={10} />}
            </button>
            {subFilter.type === 'primitive' && (
              <button
                onClick={() => onEditFilter(subFilter as PrimitiveFilter)}
                className="p-0.5 text-current hover:text-current/60 transition-colors"
                title="Edit filter"
                disabled={disabled}
              >
                <Pencil size={10} />
              </button>
            )}
            <button
              onClick={() => onRemoveFilter(subFilter.id)}
              className="p-0.5 text-current hover:text-current/60 transition-colors"
              title="Remove filter"
              disabled={disabled}
            >
              <CircleX size={10} />
            </button>
          </div>
        );
      })}
      <button
        onClick={onClearAllFilters}
        className="inline-flex items-center gap-x-1 text-[11px] bg-red-bg text-primary border border-red-border px-1.5 py-0.5 rounded-md hover:bg-red-bg/50 transition-colors"
        disabled={disabled}
      >
        Clear All
        <Eraser size={10} />
      </button>
    </div>
  );
};
