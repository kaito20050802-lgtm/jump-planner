"use client";

import { WeeklyItem } from "@/types/training";
import {
  calculateItemSeconds,
  formatDuration,
} from "@/lib/trainingTime";

type Props = {
  item: WeeklyItem;
  index: number;
  onUpdate: (
    drillId: string,
    field: keyof WeeklyItem,
    value: string
  ) => void;
  onRemove: (drillId: string) => void;
};

export default function WeeklySettingCard({
  item,
  index,
  onUpdate,
  onRemove,
}: Props) {
  const itemSeconds = calculateItemSeconds(item);
  const isAuto = item.timeMode === "auto";

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-xl transition hover:border-white/20 md:p-5">
      <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-300">
                {index + 1}
              </span>

              <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-300">
                {item.category}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black text-slate-400">
                {item.targetEvent}
              </span>
            </div>

            <h3 className="mt-3 truncate text-lg font-black text-white">
              {item.name}
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                  isAuto
                    ? "border-cyan-300/15 bg-cyan-400/10 text-cyan-300"
                    : "border-pink-300/15 bg-pink-400/10 text-pink-300"
                }`}
              >
                {isAuto ? "自動計算" : "手入力"}
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black text-slate-400">
                所要時間 {formatDuration(itemSeconds)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.drillId)}
            className="shrink-0 rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-black text-rose-300 transition hover:bg-rose-400/20"
          >
            削除
          </button>
        </div>

        {(item.purposeTags?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.purposeTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {isAuto && (
          <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
            <p className="text-xs font-black text-cyan-300">
              登録されている時間基準
            </p>

            <p className="mt-2 text-sm font-bold text-slate-300">
              {item.baseDistance || "-"}mを
              <span className="mx-1 text-white">
                {item.baseSeconds || "-"}秒
              </span>
              で実施
            </p>

            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
              今回の1本あたり時間を入力すると、登録基準より優先して計算します。
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <GlassSmallInput
            label="距離（m）"
            value={item.distance}
            onChange={(value) =>
              onUpdate(item.drillId, "distance", value)
            }
            placeholder="例：300"
          />

          <GlassSmallInput
            label="本数"
            value={item.reps}
            onChange={(value) =>
              onUpdate(item.drillId, "reps", value)
            }
            placeholder="例：5"
          />

          <GlassSmallInput
            label="セット数"
            value={item.sets}
            onChange={(value) =>
              onUpdate(item.drillId, "sets", value)
            }
            placeholder="例：2"
          />

          <GlassSmallInput
            label="強度"
            value={item.intensity}
            onChange={(value) =>
              onUpdate(item.drillId, "intensity", value)
            }
            placeholder="例：8割"
          />

          <GlassSmallInput
            label="本数間レスト（秒）"
            value={item.repRestSeconds}
            onChange={(value) =>
              onUpdate(
                item.drillId,
                "repRestSeconds",
                value
              )
            }
            placeholder="例：30"
          />

          <GlassSmallInput
            label="セット間レスト（分）"
            value={item.setRestMinutes}
            onChange={(value) =>
              onUpdate(
                item.drillId,
                "setRestMinutes",
                value
              )
            }
            placeholder="例：3"
          />

          {isAuto && (
            <div className="col-span-2 md:col-span-3">
              <GlassSmallInput
                label="今回の1本あたり時間（秒）"
                value={item.customOneRepSeconds}
                onChange={(value) =>
                  onUpdate(
                    item.drillId,
                    "customOneRepSeconds",
                    value
                  )
                }
                placeholder={`空欄なら基準 ${item.baseDistance || "-"}m・${
                  item.baseSeconds || "-"
                }秒から計算`}
              />
            </div>
          )}

          {!isAuto && (
            <div className="col-span-2 md:col-span-3">
              <GlassSmallInput
                label="今回の所要時間（分）"
                value={item.manualMinutes}
                onChange={(value) =>
                  onUpdate(
                    item.drillId,
                    "manualMinutes",
                    value
                  )
                }
                placeholder={`標準 ${
                  item.defaultMinutes || "-"
                }分`}
              />
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <ResultCard
            label="この練習の所要時間"
            value={formatDuration(itemSeconds)}
            accent="cyan"
          />

          <ResultCard
            label="時間計算方法"
            value={isAuto ? "距離・本数から計算" : "入力時間を使用"}
            accent="violet"
          />
        </div>
      </div>
    </article>
  );
}

function GlassSmallInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-black leading-5 text-slate-400">
        {label}
      </label>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/50 focus:bg-black/20 focus:ring-4 focus:ring-cyan-500/10"
      />
    </div>
  );
}

function ResultCard({
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
      card: "border-cyan-300/15 bg-cyan-400/[0.06]",
      value: "text-cyan-300",
    },
    violet: {
      card: "border-violet-300/15 bg-violet-400/[0.06]",
      value: "text-violet-300",
    },
  };

  return (
    <div className={`rounded-2xl border p-3 ${styles[accent].card}`}>
      <p className="text-[10px] font-black text-slate-600">
        {label}
      </p>

      <p
        className={`mt-1 text-xs font-black ${styles[accent].value}`}
      >
        {value}
      </p>
    </div>
  );
}