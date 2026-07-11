"use client";

import { WeeklyPlan } from "@/types/training";
import {
  formatOutputRange,
  getPlanMaxDate,
  getPlanMinDate,
} from "@/lib/outputFormatter";

type Props = {
  plans: WeeklyPlan[];
  selectedPlanId: string;
  onSelect: (planId: string) => void;
};

export default function PlanSelector({
  plans,
  selectedPlanId,
  onSelect,
}: Props) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-violet-300">
            PLAN SELECT
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            完成メニューを選択
          </h2>

          <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
            出力する種目・週の完成メニューを選びます。
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-violet-300/15 bg-violet-400/10 px-4 py-2 text-xs font-black text-violet-300">
          {plans.length}件
        </span>
      </div>

      {plans.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {plans.map((plan) => {
            const selected =
              plan.id === selectedPlanId;

            const minDate = getPlanMinDate(
              plan.dayMenus || []
            );

            const maxDate = getPlanMaxDate(
              plan.dayMenus || []
            );

            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelect(plan.id)}
                className={`group relative overflow-hidden rounded-[26px] border p-4 text-left transition ${
                  selected
                    ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-violet-600/20 shadow-lg shadow-cyan-500/10"
                    : "border-white/10 bg-black/20 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                {selected && (
                  <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl" />
                )}

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            selected
                              ? "bg-white/15 text-cyan-100"
                              : "bg-violet-400/10 text-violet-300"
                          }`}
                        >
                          {plan.event || "共通"}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-black text-slate-400">
                          公開済み
                        </span>
                      </div>

                      <h3 className="mt-3 truncate text-lg font-black text-white">
                        {plan.theme || "テーマ未設定"}
                      </h3>

                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {formatOutputRange(
                          minDate,
                          maxDate
                        )}
                      </p>
                    </div>

                    <div
                      className={`flex h-9 min-w-9 items-center justify-center rounded-full border text-sm font-black transition ${
                        selected
                          ? "border-cyan-200/40 bg-cyan-400/20 text-cyan-100"
                          : "border-white/10 bg-white/[0.05] text-slate-500 group-hover:text-white"
                      }`}
                    >
                      {selected ? "✓" : "→"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniInfo
                      label="代表"
                      value={
                        plan.submittedByName ||
                        "種目代表"
                      }
                    />

                    <MiniInfo
                      label="公開者"
                      value={
                        plan.publishedByName ||
                        "パート長"
                      }
                    />
                  </div>

                  {plan.leaderMemo && (
                    <div className="mt-4 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] p-3">
                      <p className="text-[10px] font-black text-cyan-300">
                        パート長メモ
                      </p>

                      <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-400">
                        {plan.leaderMemo}
                      </p>
                    </div>
                  )}

                  <p
                    className={`mt-4 text-xs font-black ${
                      selected
                        ? "text-cyan-200"
                        : "text-slate-500"
                    }`}
                  >
                    {selected
                      ? "このメニューを選択中"
                      : "このメニューを選択"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[26px] border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-2xl text-slate-500">
            ✓
          </div>

          <p className="mt-4 font-black text-slate-300">
            完成メニューがありません
          </p>

          <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
            パート長が完成版を公開すると、ここに表示されます。
          </p>
        </div>
      )}
    </section>
  );
}

function MiniInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-300">
        {value}
      </p>
    </div>
  );
}