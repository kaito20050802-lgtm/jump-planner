"use client";

import { DayMenu, WeeklyItem } from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  formatDuration,
} from "@/lib/trainingTime";
import WeeklySettingCard from "./WeeklySettingCard";

type Props = {
  selectedDay: DayMenu;
  selectedDayIndex: number;
  onStartTimeChange: (value: string) => void;
  onUpdateItem: (
    drillId: string,
    field: keyof WeeklyItem,
    value: string
  ) => void;
  onRemoveItem: (drillId: string) => void;
};

export default function WeeklySelectedList({
  selectedDay,
  onStartTimeChange,
  onUpdateItem,
  onRemoveItem,
}: Props) {
  const totalSeconds = calculateDaySeconds(selectedDay);
  const endTime = calculateEndTime(selectedDay.startTime, totalSeconds);

  return (
    <>
      <section className="mt-5 rounded-[28px] bg-slate-900 p-5 text-white shadow-sm">
        <h2 className="text-xl font-black">
          {selectedDay.date}（{selectedDay.label}）の時間設定
        </h2>

        <div className="mt-4">
          <label className="text-sm font-black text-slate-200">
            練習開始時刻
          </label>
          <input
            type="time"
            className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 p-4 font-bold text-white"
            value={selectedDay.startTime || "17:00"}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>

        <div className="mt-4 rounded-2xl bg-white/10 p-4">
          <p className="text-sm font-bold text-slate-300">終了予定</p>
          <p className="mt-1 text-3xl font-black">{endTime}</p>
          <p className="mt-1 text-xs font-bold text-slate-300">
            合計 {formatDuration(totalSeconds)}
          </p>
        </div>
      </section>

      {selectedDay.items.length > 0 && (
        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">
            {selectedDay.label}曜日の詳細設定
          </h2>

          <div className="mt-4 space-y-4">
            {selectedDay.items.map((item, index) => (
              <WeeklySettingCard
                key={`${item.drillId}-${index}`}
                item={item}
                index={index}
                onUpdate={onUpdateItem}
                onRemove={onRemoveItem}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}