"use client";

import { DayMenu } from "@/types/training";
import { formatShortDate } from "@/lib/trainingTime";

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
    <section className="mt-5">
      <h2 className="text-xl font-black">曜日を選択</h2>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {dayMenus.map((day, index) => (
          <button
            key={day.date}
            onClick={() => onChange(index)}
            className={`rounded-2xl py-3 text-center transition ${
              selectedDayIndex === index
                ? "bg-blue-600 text-white"
                : "bg-white shadow-sm hover:bg-slate-100"
            }`}
          >
            <p className="text-xs font-black">{day.label}</p>

            <p className="mt-1 text-[11px] font-bold">
              {formatShortDate(day.date)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}