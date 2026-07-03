import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  vert: 'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700',
  rouge: 'bg-red-100 text-red-700',
  gris: 'bg-neutral-100 text-neutral-700'
};

export function Badge({ tone = 'gris', children }: { tone?: keyof typeof styles; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', styles[tone])}>
      {children}
    </span>
  );
}
