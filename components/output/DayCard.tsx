"use client";

import { DayMenu } from "@/types/training";
import {
  formatOutputItem,
  getCategoryColorClass,
  groupItemsByCategory,
  getDayOutputSummary,
} from "@/lib/outputFormatter";

type Props = {
  day: DayMenu;
};

export default function DayCard({
  day,
}: Props) {
  const groups = groupItemsByCategory(day.items);

  const summary = getDayOutputSummary(day);

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">

      {/* 上部 */}

      <div className="flex items-start justify-between">

        <div>

          <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
            {day.label.toUpperCase()}
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {day.label}曜日
          </h2>

          <p className="mt-2 text-sm font-bold text-slate-400">
            {day.date}
          </p>

        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-right">

          <p className="text-[10px] font-black text-slate-500">
            練習時間
          </p>

          <p className="mt-1 text-lg font-black text-cyan-300">
            {summary.isRestDay
              ? "休養"
              : `${summary.startTime}〜${summary.endTime}`}
          </p>

        </div>

      </div>

      {/* 練習なし */}

      {summary.isRestDay && (

        <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">

          <p className="text-2xl font-black text-slate-400">
            REST
          </p>

          <p className="mt-2 text-sm font-bold text-slate-500">
            この日は休養日です
          </p>

        </div>

      )}

      {/* 練習あり */}

      {!summary.isRestDay && (

        <div className="mt-6 space-y-5">

          {groups.map((group) => {

            const color =
              getCategoryColorClass(group.category);

            return (

              <div
                key={group.category}
                className={`rounded-[26px] border ${color.border} bg-black/20 p-5`}
              >

                {/* カテゴリー */}

                <div className="flex items-center gap-3">

                  <div
                    className={`h-3 w-3 rounded-full ${color.dot}`}
                  />

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${color.badge}`}
                  >
                    {group.category}
                  </span>

                </div>

                {/* メニュー */}

                <div className="mt-4 space-y-3">

                  {group.items.map((item, index) => (

                    <div
                      key={`${item.drillId}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
                    >

                      <div className="flex gap-3">

                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-black text-white">

                          {index + 1}

                        </div>

                        <div className="flex-1">

                          <p className="text-base font-black leading-7 text-white">

                            {formatOutputItem(item)}

                          </p>

                          {item.purposeTags &&
                            item.purposeTags.length >
                              0 && (

                              <div className="mt-2 flex flex-wrap gap-2">

                                {item.purposeTags.map(
                                  (tag) => (

                                    <span
                                      key={tag}
                                      className="rounded-full bg-white/[0.05] px-2 py-1 text-[10px] font-bold text-slate-400"
                                    >
                                      #{tag}
                                    </span>

                                  )
                                )}

                              </div>

                            )}

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            );

          })}

        </div>

      )}

      {/* 下部 */}

      {!summary.isRestDay && (

        <div className="mt-6 grid grid-cols-3 gap-3">

          <BottomCard
            title="開始"
            value={summary.startTime}
          />

          <BottomCard
            title="終了"
            value={summary.endTime}
          />

          <BottomCard
            title="合計"
            value={summary.duration}
          />

        </div>

      )}

    </section>
  );
}

function BottomCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">

      <p className="text-[10px] font-black text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-sm font-black text-white">
        {value}
      </p>

    </div>
  );
}