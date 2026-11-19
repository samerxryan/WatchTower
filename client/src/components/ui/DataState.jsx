import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function Avatar({ name, size = 'sm' }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeClass =
    size === 'lg'
      ? 'w-11 h-11 text-sm'
      : size === 'md'
        ? 'w-8 h-8 text-xs'
        : 'w-7 h-7 text-[11px]';

  return (
    <span
      className={`${sizeClass} inline-flex items-center justify-center rounded-full font-semibold shrink-0 bg-[#6366F1]/15 text-[#4338CA] dark:bg-[#818CF8]/20 dark:text-[#A5B4FC] border border-[#6366F1]/20`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}

export function LoadingSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-12 rounded-lg bg-[#F1F5F9] dark:bg-[#1F2937] animate-pulse"
        />
      ))}
    </div>
  );
}

export function EmptyState({ icon = Inbox, title, description, action }) {
  const IconComponent = icon;
  return (
    <div className="py-12 px-6 text-center rounded-xl bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#273449]">
      <div className="w-10 h-10 mx-auto rounded-lg bg-[#F1F5F9] dark:bg-[#1F2937] flex items-center justify-center text-[#64748B] dark:text-[#9CA3AF]">
        <IconComponent className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-[#64748B] dark:text-[#9CA3AF] max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  const { t } = useI18n();
  if (!message) return null;

  return (
    <div
      role="alert"
      className="p-4 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div className="flex items-start gap-2.5 text-sm text-[#DC2626] dark:text-[#F87171]">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }) {
  const { t } = useI18n();
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-xs text-[#64748B] dark:text-[#9CA3AF] tabular-nums">
        {t('common.pageOf', { page, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('common.previous')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
}
