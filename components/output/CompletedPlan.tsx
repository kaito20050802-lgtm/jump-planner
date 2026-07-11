"use client";

import { DayMenu, WeeklyPlan } from "@/types/training";
import {
  filterDaysByRange,
  formatOutputDate,
  formatOutputItem,
  formatOutputRange,
  getDayOutputSummary,
  groupItemsByCategory,
} from "@/lib/outputFormatter";
import {
  calculateDaySeconds,
  formatDuration,
} from "@/lib/trainingTime";
import DayCard from "@/components/output/DayCard";

type Props = {
  plan: WeeklyPlan;
  startDate: string;
  endDate: string;
  screenshotMode: boolean;
  onExitScreenshot: () => void;
};

export default function CompletedPlan({
  plan,
  startDate,
  endDate,
  screenshotMode,
  onExitScreenshot,
}: Props) {
  const outputDays = filterDaysByRange(
    plan.dayMenus || [],
    startDate,
    endDate
  );

  const outputTotalSeconds = outputDays.reduce(
    (total, day) => total + calculateDaySeconds(day),
    0
  );

  const outputItemCount = outputDays.reduce(
    (total, day) => total + day.items.length,
    0
  );

  const activeDayCount = outputDays.filter(
    (day) => day.items.length > 0
  ).length;

  if (screenshotMode) {
    return (
      <ScreenshotPlan
        plan={plan}
        days={outputDays}
        startDate={startDate}
        endDate={endDate}
        totalSeconds={outputTotalSeconds}
        itemCount={outputItemCount}
        activeDayCount={activeDayCount}
        onExit={onExitScreenshot}
      />
    );
  }

  return (
    <div>
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-300">
                  {plan.event || "共通"}
                </span>

                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-300">
                  完成版
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black text-white md:text-3xl">
                {plan.theme || "テーマ未設定"}
              </h2>

              <p className="mt-2 text-sm font-bold text-slate-400">
                出力期間：
                <span className="ml-2 text-cyan-300">
                  {formatOutputRange(startDate, endDate)}
                </span>
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-right">
              <p className="text-[10px] font-black text-slate-500">
                合計時間
              </p>

              <p className="mt-1 font-black text-cyan-300">
                {formatDuration(outputTotalSeconds)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <PlanSummary
              label="出力日数"
              value={`${outputDays.length}日`}
            />

            <PlanSummary
              label="練習日"
              value={`${activeDayCount}日`}
            />

            <PlanSummary
              label="練習数"
              value={`${outputItemCount}件`}
            />
          </div>

          {plan.representativeMemo && (
            <MemoCard
              label="代表メモ"
              value={plan.representativeMemo}
              accent="violet"
            />
          )}

          {plan.leaderMemo && (
            <MemoCard
              label="パート長より"
              value={plan.leaderMemo}
              accent="cyan"
            />
          )}
        </div>
      </section>

      {outputDays.length > 0 ? (
        <div className="mt-5 space-y-5">
          {outputDays.map((day) => (
            <DayCard
              key={day.date}
              day={day}
            />
          ))}
        </div>
      ) : (
        <section className="mt-5 rounded-[32px] border border-dashed border-white/15 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl text-slate-500">
            －
          </div>

          <p className="mt-4 font-black text-slate-300">
            選択期間にメニューがありません
          </p>

          <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
            開始日と終了日を確認してください。
          </p>
        </section>
      )}
    </div>
  );
}

function ScreenshotPlan({
  plan,
  days,
  startDate,
  endDate,
  totalSeconds,
  itemCount,
  activeDayCount,
  onExit,
}: {
  plan: WeeklyPlan;
  days: DayMenu[];
  startDate: string;
  endDate: string;
  totalSeconds: number;
  itemCount: number;
  activeDayCount: number;
  onExit: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border-2 border-slate-900 bg-white p-4 text-slate-900 sm:p-6">
      <header className="border-b-2 border-slate-900 pb-4 text-center">
        <p className="text-[10px] font-black tracking-[0.22em] text-slate-500">
          JUMP PLANNER
        </p>

        <h1 className="mt-2 text-2xl font-black">
          {plan.event || "共通"} 練習メニュー
        </h1>

        <p className="mt-2 text-base font-black">
          {plan.theme || "テーマ未設定"}
        </p>

        <p className="mt-2 text-xs font-bold text-slate-500">
          {formatOutputRange(startDate, endDate)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <PrintSummary
            label="練習日"
            value={`${activeDayCount}日`}
          />

          <PrintSummary
            label="練習数"
            value={`${itemCount}件`}
          />

          <PrintSummary
            label="合計"
            value={formatDuration(totalSeconds)}
          />
        </div>
      </header>

      <div className="mt-4 space-y-5">
        {days.map((day) => (
          <ScreenshotDay
            key={day.date}
            day={day}
          />
        ))}
      </div>

      {plan.leaderMemo && (
        <div className="mt-5 border-t-2 border-slate-900 pt-4">
          <p className="text-xs font-black">
            パート長より
          </p>

          <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6">
            {plan.leaderMemo}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onExit}
        className="mt-6 w-full rounded-xl bg-slate-900 py-3 font-black text-white print:hidden"
      >
        スクショモードを終了
      </button>
    </section>
  );
}

function ScreenshotDay({
  day,
}: {
  day: DayMenu;
}) {
  const summary = getDayOutputSummary(day);
  const categoryGroups = groupItemsByCategory(day.items);

  return (
    <section className="border-t-2 border-slate-900 pt-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">
            {formatOutputDate(day.date, day.label)}
          </h2>
        </div>

        <p className="text-xs font-black">
          {summary.isRestDay
            ? "休養"
            : `${summary.startTime}〜${summary.endTime}`}
        </p>
      </div>

      {summary.isRestDay ? (
        <div className="mt-3 rounded-lg border border-slate-300 p-4 text-center">
          <p className="text-sm font-black">
            休養
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {categoryGroups.map((group) => (
            <div key={group.category}>
              <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
                <span className="h-2 w-2 rounded-full bg-slate-900" />

                <p className="text-xs font-black">
                  {group.category}
                </p>
              </div>

              <div className="mt-2 space-y-2">
                {group.items.map((item, index) => (
                  <div
                    key={`${item.drillId}-${index}`}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-900 text-[9px] font-black">
                      {index + 1}
                    </span>

                    <p className="text-sm font-bold leading-5">
                      {formatOutputItem(item)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="border-t border-slate-300 pt-2 text-right text-[10px] font-black text-slate-500">
            合計 {summary.duration}
          </p>
        </div>
      )}
    </section>
  );
}

function PlanSummary({
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

function PrintSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-300 p-2">
      <p className="text-[9px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xs font-black">
        {value}
      </p>
    </div>
  );
}

function MemoCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "violet";
}) {
  const styles = {
    cyan: {
      card:
        "border-cyan-300/15 bg-cyan-400/[0.06]",
      label: "text-cyan-300",
    },
    violet: {
      card:
        "border-violet-300/15 bg-violet-400/[0.06]",
      label: "text-violet-300",
    },
  };

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 ${styles[accent].card}`}
    >
      <p
        className={`text-xs font-black ${styles[accent].label}`}
      >
        {label}
      </p>

      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-300">
        {value}
      </p>
    </div>
  );
}