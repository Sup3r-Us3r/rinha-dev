interface HudBarProps {
  label: string;
  value: number;
  color: string;
  align: 'left' | 'right';
  characterName: string;
}

const HudBar = ({ label, value, color, align, characterName }: HudBarProps) => {
  return (
    <div className={`w-56 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className="mb-1 text-xs font-semibold text-white/85">{label}</p>
      <div className="h-4 overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full ${color} transition-all duration-100`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-white/80">
        {characterName}
      </p>
    </div>
  );
};

export { HudBar };
