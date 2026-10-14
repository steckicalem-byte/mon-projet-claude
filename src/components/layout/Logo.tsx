import { GraduationCap } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-electric-500 shadow-glow">
        <GraduationCap className="h-5 w-5 text-white" aria-hidden />
      </div>
      <span className="text-[15px] font-bold tracking-tight">
        StudyMate <span className="gradient-text">AI</span>
      </span>
    </div>
  );
}
