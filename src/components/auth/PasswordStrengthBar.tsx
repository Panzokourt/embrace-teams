import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

const criteria = [
  { label: '8+ χαρακτήρες', test: (p: string) => p.length >= 8 },
  { label: '1 κεφαλαίο', test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 αριθμός', test: (p: string) => /\d/.test(p) },
  { label: '1 ειδικός (!@#$%…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const colors = ['bg-destructive', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
const labels = ['Αδύναμος', 'Μέτριος', 'Καλός', 'Ισχυρός'];

export function getPasswordScore(password: string) {
  return criteria.filter(c => c.test(password)).length;
}

export default function PasswordStrengthBar({ password }: { password: string }) {
  const score = useMemo(() => getPasswordScore(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? colors[score - 1] : 'bg-muted'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${score <= 1 ? 'text-destructive' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-600' : 'text-green-600'}`}>
        {labels[score - 1] || 'Πολύ αδύναμος'}
      </p>
      <ul className="space-y-1">
        {criteria.map((c, i) => {
          const pass = c.test(password);
          return (
            <li key={i} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-green-600' : 'text-muted-foreground'}`}>
              {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {c.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
