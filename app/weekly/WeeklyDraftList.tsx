"use client";

import { WeeklyDraft, WeeklyItem } from "@/types/training";
import {
  calculateDaySeconds,
  calculateEndTime,
  normalizeWeeklyItem,
} from "@/lib/trainingTime";

export default function WeeklyDraftList({
  role,
  memberId,
  drafts,
  onEdit,
}: {
  role: string;
  memberId: string;
  drafts: WeeklyDraft[];
  onEdit: (draft: WeeklyDraft) => void;
}) {
  const visibleDrafts = drafts.filter((d) => {
    if (role === "leader") return true;
    return ["draft", "revision", "submitted"].includes(d.status);
  });

  const canEditDraft = (draft: WeeklyDraft) => {
    if (role === "leader") return true;
    return draft.submittedBy === memberId && draft.status !== "approved";
  };

  return (
    <section className="mt-6 rounded-[28px] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">代表の作成中メニュー</h2>

      <div className="mt-4 space-y-4">
        {visibleDrafts.map((draft) => (
          <div key={draft.id} className="rounded-2xl bg-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-blue-600">
                  {statusLabel(draft.status)}
                </p>
                <h3 className="mt-1 text-lg font-black">{draft.event}</h3>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {draft.weekStart || "日付未設定"} / {draft.theme}
                </p>
              </div>

              {canEditDraft(draft) && (
                <button
                  onClick={() => onEdit(draft)}
                  className="rounded-full bg-blue-600 px-3 py-2 text-xs font-black text-white"
                >
                  編集
                </button>
              )}
            </div>

            {draft.dayMenus?.map((day) => {
              const normalizedItems = day.items.map((item) =>
                normalizeWeeklyItem(item as Partial<WeeklyItem>)
              );
              const totalSeconds = calculateDaySeconds({
                ...day,
                items: normalizedItems,
              });

              const endTime = day.startTime
                ? calculateEndTime(day.startTime, totalSeconds)
                : "-";

              return (
                <div key={day.date} className="mt-3 rounded-xl bg-white p-3">
                  <p className="text-xs font-black text-slate-500">
                    {day.date}（{day.label}） {day.startTime || "-"}開始 →{" "}
                    {endTime}終了予定
                  </p>

                  {normalizedItems.length > 0 ? (
                    normalizedItems.map((item, index) => (
                      <p
                        key={`${day.date}-${item.drillId}-${index}`}
                        className="mt-1 text-sm font-bold"
                      >
                        {index + 1}. {item.name}
                      </p>
                    ))
                  ) : (
                    <p className="mt-1 text-sm font-bold text-slate-400">
                      未入力
                    </p>
                  )}
                </div>
              );
            })}

            {draft.leaderComment && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-600">
                パート長コメント：{draft.leaderComment}
              </p>
            )}
          </div>
        ))}

        {visibleDrafts.length === 0 && (
          <p className="text-sm font-bold text-slate-500">
            まだ作成中メニューはありません。
          </p>
        )}
      </div>
    </section>
  );
}

function statusLabel(status: string) {
  if (status === "draft") return "作成中";
  if (status === "submitted") return "提出済み";
  if (status === "revision") return "修正依頼中";
  if (status === "approved") return "承認済み";
  return status;
}