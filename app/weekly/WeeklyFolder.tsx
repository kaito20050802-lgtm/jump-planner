"use client";

import { useMemo, useState } from "react";
import { Drill, EVENTS } from "@/types/training";

type Props = {
  drills: Drill[];
  selectedIds: string[];
  onSelect: (drill: Drill) => void;
};

export default function WeeklyFolder({
  drills,
  selectedIds,
  onSelect,
}: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);

  const categoryFolders = useMemo(() => {
    return Array.from(new Set(drills.map((d) => d.category).filter(Boolean)));
  }, [drills]);

  const eventFolders = useMemo(() => {
    if (!openCategory) return [];

    return EVENTS.filter((event) =>
      drills.some(
        (drill) =>
          drill.category === openCategory && drill.targetEvent === event
      )
    );
  }, [drills, openCategory]);

  const tagFolders = useMemo(() => {
    if (!openCategory || !openEvent) return [];

    const tagSet = new Set<string>();

    drills.forEach((drill) => {
      if (drill.category === openCategory && drill.targetEvent === openEvent) {
        (drill.purposeTags || []).forEach((tag) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet);
  }, [drills, openCategory, openEvent]);

  const displayedDrills = useMemo(() => {
    if (!openCategory || !openEvent || !openTag) return [];

    return drills.filter(
      (drill) =>
        drill.category === openCategory &&
        drill.targetEvent === openEvent &&
        drill.purposeTags?.includes(openTag)
    );
  }, [drills, openCategory, openEvent, openTag]);

  const resetFolders = () => {
    setOpenCategory(null);
    setOpenEvent(null);
    setOpenTag(null);
  };

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">フォルダーから選択</h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            カテゴリー → 対象種目 → タグ → 練習名
          </p>
        </div>

        {(openCategory || openEvent || openTag) && (
          <button
            onClick={resetFolders}
            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black"
          >
            最初へ
          </button>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-100 p-3 text-xs font-bold text-slate-600">
        現在：
        {openCategory ? ` ${openCategory}` : " カテゴリー選択"}
        {openEvent ? ` / ${openEvent}` : ""}
        {openTag ? ` / ${openTag}` : ""}
      </div>

      {!openCategory && (
        <FolderList
          title="カテゴリー"
          items={categoryFolders}
          onClick={(item) => {
            setOpenCategory(item);
            setOpenEvent(null);
            setOpenTag(null);
          }}
        />
      )}

      {openCategory && !openEvent && (
        <>
          <BackButton
            label="カテゴリーに戻る"
            onClick={() => {
              setOpenCategory(null);
              setOpenEvent(null);
              setOpenTag(null);
            }}
          />

          <FolderList
            title="対象種目"
            items={eventFolders}
            onClick={(item) => {
              setOpenEvent(item);
              setOpenTag(null);
            }}
          />
        </>
      )}

      {openCategory && openEvent && !openTag && (
        <>
          <BackButton
            label="対象種目に戻る"
            onClick={() => {
              setOpenEvent(null);
              setOpenTag(null);
            }}
          />

          <FolderList
            title="目的タグ"
            items={tagFolders}
            onClick={(item) => setOpenTag(item)}
          />
        </>
      )}

      {openCategory && openEvent && openTag && (
        <>
          <BackButton
            label="タグに戻る"
            onClick={() => setOpenTag(null)}
          />

          <div className="mt-4 space-y-3">
            {displayedDrills.map((drill) => {
              const selected = selectedIds.includes(drill.id);

              return (
                <button
                  key={drill.id}
                  onClick={() => onSelect(drill)}
                  className={`w-full rounded-2xl p-4 text-left ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{drill.name}</p>
                      <p
                        className={`mt-1 text-xs font-bold ${
                          selected ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {drill.category} / {drill.targetEvent}
                      </p>
                    </div>

                    {selected && (
                      <span className="text-lg font-black">✓</span>
                    )}
                  </div>

                  {(drill.purposeTags?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {drill.purposeTags!.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${
                            selected
                              ? "bg-white/20 text-white"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}

            {displayedDrills.length === 0 && (
              <p className="text-sm font-bold text-slate-500">
                このフォルダーには練習がありません。
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function FolderList({
  title,
  items,
  onClick,
}: {
  title: string;
  items: string[];
  onClick: (item: string) => void;
}) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-black text-slate-500">{title}</h3>

      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onClick(item)}
            className="flex w-full items-center justify-between rounded-2xl bg-slate-100 p-4 text-left"
          >
            <span className="font-black">📁 {item}</span>
            <span className="text-sm font-black text-slate-400">›</span>
          </button>
        ))}

        {items.length === 0 && (
          <p className="text-sm font-bold text-slate-500">
            まだフォルダーがありません。
          </p>
        )}
      </div>
    </div>
  );
}

function BackButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-4 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
    >
      ← {label}
    </button>
  );
}