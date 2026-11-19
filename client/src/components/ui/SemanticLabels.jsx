import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Flag,
  Flame,
  PauseCircle,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';

const PROJECT_STATUS_META = {
  PLANNING: { icon: Circle, color: 'text-[#64748B] dark:text-[#9CA3AF]' },
  ACTIVE: { icon: Clock, color: 'text-[#2563EB] dark:text-[#60A5FA]' },
  ON_HOLD: { icon: PauseCircle, color: 'text-[#D97706] dark:text-[#FBBF24]' },
  COMPLETED: { icon: CheckCircle2, color: 'text-[#16A34A] dark:text-[#4ADE80]' },
  ARCHIVED: { icon: Archive, color: 'text-[#64748B] dark:text-[#9CA3AF]' },
};

const TASK_STATUS_META = {
  TODO: { icon: Circle, color: 'text-[#64748B] dark:text-[#9CA3AF]' },
  IN_PROGRESS: { icon: Clock, color: 'text-[#2563EB] dark:text-[#60A5FA]' },
  IN_REVIEW: { icon: Eye, color: 'text-[#D97706] dark:text-[#FBBF24]' },
  DONE: { icon: CheckCircle2, color: 'text-[#16A34A] dark:text-[#4ADE80]' },
};

const PRIORITY_META = {
  LOW: { icon: Flag, color: 'text-[#64748B] dark:text-[#9CA3AF]' },
  MEDIUM: { icon: Flag, color: 'text-[#2563EB] dark:text-[#60A5FA]' },
  HIGH: { icon: AlertCircle, color: 'text-[#D97706] dark:text-[#FBBF24]' },
  URGENT: { icon: Flame, color: 'text-[#DC2626] dark:text-[#F87171]' },
};

export function ProjectStatusLabel({ status }) {
  const { t } = useI18n();
  const meta = PROJECT_STATUS_META[status] || PROJECT_STATUS_META.PLANNING;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${meta.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{t(`projectStatuses.${status}`)}</span>
    </span>
  );
}

export function TaskStatusLabel({ status }) {
  const { t } = useI18n();
  const meta = TASK_STATUS_META[status] || TASK_STATUS_META.TODO;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${meta.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{t(`taskStatuses.${status}`)}</span>
    </span>
  );
}

export function PriorityLabel({ priority }) {
  const { t } = useI18n();
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${meta.color}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{t(`priorities.${priority}`)}</span>
    </span>
  );
}
