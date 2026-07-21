import React from 'react';

export interface ChoiceOption {
  label: string;
  index: number;
}

export interface ChoiceGroup {
  choiceId: string;
  options: ChoiceOption[];
  selectedIndex: number;
}

interface ChoiceControlsProps {
  groups: ChoiceGroup[];
  onSelect: (choiceId: string, index: number) => void;
}

const ChoiceControls: React.FC<ChoiceControlsProps> = ({ groups, onSelect }) => {
  if (groups.length === 0) return null;

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 pointer-events-none"
      aria-label="Image layer controls"
    >
      {groups.map((group) => (
        <div
          key={group.choiceId}
          role="group"
          aria-label="Choose image layer"
          className="flex gap-1 bg-gray-900/80 backdrop-blur-sm rounded-lg p-1 pointer-events-auto"
        >
          {group.options.map((opt) => {
            const active = opt.index === group.selectedIndex;
            return (
              <button
                key={opt.index}
                type="button"
                onClick={() => onSelect(group.choiceId, opt.index)}
                aria-pressed={active}
                className={[
                  'px-3 py-1.5 rounded text-sm font-medium transition',
                  'min-w-[44px] min-h-[44px]',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default ChoiceControls;
