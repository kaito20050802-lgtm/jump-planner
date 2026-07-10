"use client";

import { DayMenu } from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  calculateItemSeconds,
  formatDuration,
} from "@/lib/trainingTime";

type Props = {
  selectedDay: DayMenu;
};

export default function WeeklySummary({ selectedDay }: Props) {
  const totalSeconds = calculateDaySeconds(selectedDay);
  const endTime = calculateEndTime(selectedDay.startTime, totalSeconds);

  return (
    <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">この日の練習まとめ</h2>

      <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white">
        <p className="text-sm font-bold text-slate-300">開始</p>
        <p className="mt-1 text-2xl font-black">{selectedDay.startTime}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Mini label="練習時間" value={formatDuration(totalSeconds)} />
          <Mini label="終了予定" value={endTime} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {selectedDay.items.length > 0 ? (
          selectedDay.items.map((item, index) => (
            <div key={`${item.drillId}-${index}`} className="rounded-2xl bg-slate-100 p-4">
              <p className="text-xs font-black text-blue-600">
                {index + 1}. {item.category}
              </p>

              <div className="mt-1 flex items-start justify-between gap-3">
                <p className="font-black">{item.name}</p>
                <p className="shrink-0 text-sm font-black text-slate-600">
                  {formatDuration(calculateItemSeconds(item))}
                </p>
              </div>

              <p className="mt-1 text-xs font-bold text-slate-500">
                距離 {item.distance || "-"}m / 本数 {item.reps || "-"} /{" "}
                {item.sets || "-"}セット / 強度 {item.intensity || "-"}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm font-bold text-slate-500">
            まだこの曜日に練習は入っていません。
          </p>
        )}
      </div>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-bold text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}