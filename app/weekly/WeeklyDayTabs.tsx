"use client";

import { DayMenu } from "@/types/training";

type Props = {
  dayMenus: DayMenu[];
  selectedDayIndex: number;
  onChange: (index: number) => void;
};

export default function WeeklyDayTabs({
  dayMenus,
  selectedDayIndex,
  onChange,
}: Props) {
  return (
    <div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-7">
      {dayMenus.map((day, index) => {
        const selected = index === selectedDayIndex;
        const hasItems = day.items.length > 0;

        return (
          <button
            key={`${day.date}-${index}`}
            type="button"
            onClick={() => onChange(index)}
            className={`relative overflow-hidden rounded-[22px] border p-3 text-left transition ${
              selected
                ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/30 via-blue-600/25 to-violet-600/30 shadow-lg shadow-cyan-500/10"
                : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]"
            }`}
          >
            {selected && (
              <div className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-cyan-400/20 blur-2xl" />
            )}

            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-xs font-black ${
                    selected ? "text-cyan-200" : "text-slate-500"
                  }`}
                >
                  {day.label}
                </p>

                {hasItems && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-violet-400/15 text-violet-300"
                    }`}
                  >
                    {day.items.length}
                  </span>
                )}
              </div>

              <p
                className={`mt-2 text-sm font-black ${
                  selected ? "text-white" : "text-slate-300"
                }`}
              >
                {formatTabDate(day.date)}
              </p>

              <p
                className={`mt-2 text-[10px] font-bold ${
                  selected ? "text-cyan-100/70" : "text-slate-600"
                }`}
              >
                {hasItems ? `${day.items.length}件登録` : "未入力"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatTabDate(dateString: string) {
  if (!dateString) return "--/--";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}