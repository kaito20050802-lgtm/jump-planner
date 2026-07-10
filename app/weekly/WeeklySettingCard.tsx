"use client";

import { WeeklyItem } from "@/types/training";
import { calculateItemSeconds, formatDuration } from "@/lib/trainingTime";

export default function WeeklySettingCard({
  item,
  index,
  onUpdate,
  onRemove,
}: {
  item: WeeklyItem;
  index: number;
  onUpdate: (drillId: string, field: keyof WeeklyItem, value: string) => void;
  onRemove: (drillId: string) => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-blue-600">
            {index + 1}. {item.category}
          </p>

          <h3 className="mt-1 font-black">{item.name}</h3>

          <p className="mt-1 text-xs font-bold text-slate-500">
            所要時間：{formatDuration(calculateItemSeconds(item))}
          </p>

          {item.timeMode === "auto" ? (
            <p className="mt-1 text-xs font-bold text-slate-500">
              自動計算：基準 {item.baseDistance || "-"}m /{" "}
              {item.baseSeconds || "-"}秒
            </p>
          ) : (
            <p className="mt-1 text-xs font-bold text-slate-500">
              手入力タイプ
            </p>
          )}
        </div>

        <button
          onClick={() => onRemove(item.drillId)}
          className="rounded-full bg-red-100 px-3 py-2 text-xs font-black text-red-600"
        >
          削除
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SmallInput
          label="距離（m）"
          value={item.distance}
          onChange={(v) => onUpdate(item.drillId, "distance", v)}
          placeholder="例：300"
        />

        <SmallInput
          label="本数"
          value={item.reps}
          onChange={(v) => onUpdate(item.drillId, "reps", v)}
          placeholder="例：5"
        />

        <SmallInput
          label="セット数"
          value={item.sets}
          onChange={(v) => onUpdate(item.drillId, "sets", v)}
          placeholder="例：2"
        />

        <SmallInput
          label="強度"
          value={item.intensity}
          onChange={(v) => onUpdate(item.drillId, "intensity", v)}
          placeholder="例：8割"
        />

        <SmallInput
          label="本数間レスト（秒）"
          value={item.repRestSeconds}
          onChange={(v) => onUpdate(item.drillId, "repRestSeconds", v)}
          placeholder="例：30"
        />

        <SmallInput
          label="セット間レスト（分）"
          value={item.setRestMinutes}
          onChange={(v) => onUpdate(item.drillId, "setRestMinutes", v)}
          placeholder="例：3"
        />

        {item.timeMode === "auto" && (
          <SmallInput
            label="今回の1本あたり時間（秒）"
            value={item.customOneRepSeconds}
            onChange={(v) => onUpdate(item.drillId, "customOneRepSeconds", v)}
            placeholder={`例：基準 ${item.baseDistance || "-"}mを${item.baseSeconds || "-"}秒`}
          />
        )}

        {item.timeMode === "manual" && (
          <SmallInput
            label="所要時間（分）"
            value={item.manualMinutes}
            onChange={(v) => onUpdate(item.drillId, "manualMinutes", v)}
            placeholder="例：20"
          />
        )}
      </div>
    </div>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">{label}</label>
      <input
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}