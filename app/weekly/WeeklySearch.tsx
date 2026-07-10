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
    if (!keyword.trim()) return [];

    const key = normalizeText(keyword);

    return drills
      .filter((drill) => {
        const target = normalizeText(
          [
            drill.name,
            drill.category,
            drill.targetEvent,
            ...(drill.purposeTags ?? []),
          ].join(" ")
        );

        return target.includes(key);
      })
      .sort((a, b) => {
        const aName = normalizeText(a.name);
        const bName = normalizeText(b.name);

        const aStart = aName.startsWith(key);
        const bStart = bName.startsWith(key);

        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;

        return a.name.localeCompare(b.name);
      });
  }, [keyword, drills]);

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">練習を検索</h2>

      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="練習名・タグ・カテゴリー"
        className="mt-4 w-full rounded-2xl border border-slate-300 p-4 font-bold"
      />

      {keyword !== "" && (
        <div className="mt-4 space-y-3">
          {suggestions.length === 0 && (
            <p className="text-sm text-slate-500">
              一致する練習がありません。
            </p>
          )}

          {suggestions.map((drill) => {
            const selected = selectedIds.includes(drill.id);

            return (
              <button
                key={drill.id}
                onClick={() => onSelect(drill)}
                className={`w-full rounded-2xl p-4 text-left transition ${
                  selected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black">{drill.name}</p>

                    <p
                      className={`mt-1 text-xs ${
                        selected ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      {drill.category}
                      {" / "}
                      {drill.targetEvent}
                    </p>

                    {(drill.purposeTags?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {drill.purposeTags!.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              selected
                                ? "bg-white/20"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {selected && (
                    <span className="text-xl font-black">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}