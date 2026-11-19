export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const variants = {
    primary:
      'bg-[#6366F1] hover:bg-[#4F46E5] dark:bg-[#818CF8] dark:hover:bg-[#A5B4FC] text-white dark:text-[#0B1120] border border-transparent',
    secondary:
      'bg-[#FFFFFF] dark:bg-[#1F2937] hover:bg-[#F1F5F9] dark:hover:bg-[#374151] text-[#111827] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#273449]',
    ghost:
      'bg-transparent hover:bg-[#F1F5F9] dark:hover:bg-[#1F2937] text-[#64748B] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC] border border-transparent',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366F1] disabled:opacity-55 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
