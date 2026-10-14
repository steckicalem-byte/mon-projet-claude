import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page introuvable"
      description="Cette adresse ne correspond à aucune page."
      action={<Link to="/" className="font-medium text-brand-500 hover:underline">Retour au tableau de bord</Link>}
    />
  );
}
