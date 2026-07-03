interface BadgeProps {
  label: string;
  tone?: 'green' | 'gray' | 'red' | 'yellow' | 'blue';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  green: 'bg-green-100 text-green-800',
  gray: 'bg-gray-100 text-gray-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-blue-100 text-blue-700',
};

export default function Badge({ label, tone = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
