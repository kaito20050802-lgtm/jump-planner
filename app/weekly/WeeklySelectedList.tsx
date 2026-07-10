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
  const endTime = calculateEndTime(
    selectedDay.startTime,
    totalSeconds
  );

  return (
    <>
      {/* 時間設定 */}
      <section className="relative mt-5 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-cyan-500/20">
              ◷
            </div>

            <div>
              <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                TIME SETTINGS
              </p>

              <h2 className="mt-1 text-xl font-black text-white">
                {selectedDay.label}曜日の時間設定
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-black text-slate-200">
                練習開始時刻
              </label>

              <input
                type="time"
                value={selectedDay.startTime || "17:00"}
                onChange={(event) =>
                  onStartTimeChange(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white outline-none focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
              />
            </div>

            <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
              <p className="text-xs font-black text-slate-500">
                終了予定
              </p>

              <p className="mt-2 text-3xl font-black text-cyan-300">
                {endTime}
              </p>

              <p className="mt-2 text-xs font-bold text-slate-500">
                合計 {formatDuration(totalSeconds)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniStatus
              label="日付"
              value={selectedDay.date}
            />

            <MiniStatus
              label="練習数"
              value={`${selectedDay.items.length}件`}
            />

            <MiniStatus
              label="合計時間"
              value={formatDuration(totalSeconds)}
            />
          </div>
        </div>
      </section>

      {/* 選択済み練習 */}
      <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-violet-300">
              SELECTED DRILLS
            </p>

            <h2 className="mt-2 text-xl font-black text-white">
              {selectedDay.label}曜日の詳細設定
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
              距離、本数、セット数、強度、レスト時間を設定します。
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-xs font-black text-violet-300">
            {selectedDay.items.length}件
          </span>
        </div>

        {selectedDay.items.length > 0 ? (
          <div className="mt-5 space-y-4">
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
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl text-slate-500">
              ＋
            </div>

            <p className="mt-4 font-black text-slate-300">
              まだ練習が選択されていません
            </p>

            <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
              検索またはフォルダーから、この曜日に追加する練習を選んでください。
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function MiniStatus({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  );
}