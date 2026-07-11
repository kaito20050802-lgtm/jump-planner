"use client";

import { DayMenu } from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  formatDuration,
} from "@/lib/trainingTime";

type Props = {
  selectedDay: DayMenu;
};

export default function WeeklySummary({
  selectedDay,
}: Props) {
  const totalSeconds = calculateDaySeconds(selectedDay);

  const endTime = calculateEndTime(
    selectedDay.startTime,
    totalSeconds
  );

  const categoryCount = new Map<string, number>();

  selectedDay.items.forEach((item) => {
    categoryCount.set(
      item.category,
      (categoryCount.get(item.category) ?? 0) + 1
    );
  });

  return (
    <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-lg font-black text-white shadow-lg">
          📊
        </div>

        <div>
          <p className="text-xs font-black tracking-[0.2em] text-pink-300">
            SUMMARY
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            {selectedDay.label}曜日のまとめ
          </h2>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="練習数"
          value={`${selectedDay.items.length}件`}
          color="cyan"
        />

        <SummaryCard
          label="合計時間"
          value={formatDuration(totalSeconds)}
          color="violet"
        />

        <SummaryCard
          label="開始"
          value={selectedDay.startTime}
          color="pink"
        />

        <SummaryCard
          label="終了予定"
          value={endTime}
          color="blue"
        />
      </div>

      <div className="mt-6">
        <p className="text-xs font-black tracking-[0.2em] text-slate-500">
          CATEGORY
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from(categoryCount.entries()).map(
            ([category, count]) => (
              <div
                key={category}
                className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black text-slate-300"
              >
                {category}
                <span className="ml-2 text-cyan-300">
                  {count}
                </span>
              </div>
            )
          )}

          {categoryCount.size === 0 && (
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-bold text-slate-500">
              練習未登録
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-black tracking-[0.2em] text-slate-500">
          TAGS
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ...new Set(
              selectedDay.items.flatMap(
                (item) => item.purposeTags ?? []
              )
            ),
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-300"
            >
              #{tag}
            </span>
          ))}

          {selectedDay.items.length === 0 && (
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-slate-500">
              タグなし
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "cyan" | "violet" | "pink" | "blue";
}) {
  const style = {
    cyan:
      "border-cyan-300/20 bg-cyan-400/10 text-cyan-300",
    violet:
      "border-violet-300/20 bg-violet-400/10 text-violet-300",
    pink:
      "border-pink-300/20 bg-pink-400/10 text-pink-300",
    blue:
      "border-blue-300/20 bg-blue-400/10 text-blue-300",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${style[color]}`}
    >
      <p className="text-[10px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-black">
        {value}
      </p>
    </div>
  );
}