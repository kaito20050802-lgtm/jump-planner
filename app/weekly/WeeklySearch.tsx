"use client";

import { useMemo, useState } from "react";
import { Drill } from "@/types/training";
import { normalizeText } from "@/lib/trainingTime";

type Props = {
  drills: Drill[];
  selectedIds: string[];
  onSelect: (drill: Drill) => void;
};

export default function WeeklySearch({
  drills,
  selectedIds,
  onSelect,
}: Props) {
  const [keyword, setKeyword] = useState("");

  const suggestions = useMemo(() => {
    const trimmed = keyword.trim();

    if (!trimmed) return [];

    const key = normalizeText(trimmed);

    return drills
      .filter((drill) => {
        const target = normalizeText(
          [
            drill.name,
            drill.category,
            drill.targetEvent,
            ...(drill.purposeTags || []),
            drill.description || "",
            drill.volume || "",
            drill.caution || "",
          ].join(" ")
        );

        return target.includes(key);
      })
      .sort((a, b) => {
        const aName = normalizeText(a.name);
        const bName = normalizeText(b.name);

        const aStarts = aName.startsWith(key);
        const bStarts = bName.startsWith(key);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.name.localeCompare(b.name, "ja");
      });
  }, [keyword, drills]);

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">
          ⌕
        </span>

        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="練習名・カテゴリー・タグで検索"
          className="w-full rounded-2xl border border-white/10 bg-black/20 py-4 pl-12 pr-12 font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
        />

        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/[0.06] px-2 py-1 text-sm font-black text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {keyword.trim() && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black text-slate-500">
              検索結果
            </p>

            <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-300">
              {suggestions.length}件
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {suggestions.map((drill) => {
              const selected = selectedIds.includes(drill.id);

              return (
                <button
                  key={drill.id}
                  type="button"
                  onClick={() => onSelect(drill)}
                  className={`group w-full rounded-[24px] border p-4 text-left transition ${
                    selected
                      ? "border-cyan-300/40 bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-violet-600/20 shadow-lg shadow-cyan-500/10"
                      : "border-white/10 bg-black/20 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            selected
                              ? "bg-white/15 text-cyan-100"
                              : "bg-cyan-400/10 text-cyan-300"
                          }`}
                        >
                          {drill.category}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
                            selected
                              ? "bg-white/15 text-violet-100"
                              : "bg-violet-400/10 text-violet-300"
                          }`}
                        >
                          {drill.targetEvent}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-black text-white">
                        {drill.name}
                      </h3>
                    </div>

                    <div
                      className={`flex h-8 min-w-8 items-center justify-center rounded-full border text-sm font-black ${
                        selected
                          ? "border-cyan-200/40 bg-cyan-400/20 text-cyan-100"
                          : "border-white/10 bg-white/[0.05] text-slate-500 group-hover:text-white"
                      }`}
                    >
                      {selected ? "✓" : "＋"}
                    </div>
                  </div>

                  {(drill.purposeTags?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {drill.purposeTags?.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            selected
                              ? "border-white/15 bg-white/[0.08] text-slate-200"
                              : "border-white/10 bg-white/[0.04] text-slate-500"
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}

                      {(drill.purposeTags?.length ?? 0) > 5 && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-500">
                          +{(drill.purposeTags?.length ?? 0) - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <MiniInfo
                      label="時間方式"
                      value={
                        drill.timeMode === "auto"
                          ? "自動計算"
                          : "標準時間"
                      }
                    />

                    <MiniInfo
                      label="基準"
                      value={
                        drill.timeMode === "auto"
                          ? `${drill.baseDistance || "-"}m / ${
                              drill.baseSeconds || "-"
                            }秒`
                          : `${drill.defaultMinutes || "-"}分`
                      }
                    />
                  </div>

                  <p
                    className={`mt-4 text-xs font-black ${
                      selected ? "text-cyan-200" : "text-slate-500"
                    }`}
                  >
                    {selected
                      ? "この曜日から外す"
                      : "この曜日に追加する"}
                  </p>
                </button>
              );
            })}
          </div>

          {suggestions.length === 0 && (
            <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
              <p className="text-sm font-black text-slate-400">
                一致する練習がありません
              </p>

              <p className="mt-2 text-xs font-bold leading-5 text-slate-600">
                練習名の一部、カテゴリー名、目的タグでも検索できます。
              </p>
            </div>
          )}
        </div>
      )}

      {!keyword.trim() && (
        <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black text-slate-500">
            検索の例
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {["ばう", "助走", "瞬発力", "筋トレ", "三段跳"].map(
              (example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setKeyword(example)}
                  className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                  {example}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
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