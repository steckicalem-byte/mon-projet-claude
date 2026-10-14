import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page introuvable"
      description="Cette page n'existe pas ou a été déplacée."
      action={<Link to="/" className="font-medium text-brand-400 hover:underline">Retour au tableau de bord</Link>}
    />
  );
}
