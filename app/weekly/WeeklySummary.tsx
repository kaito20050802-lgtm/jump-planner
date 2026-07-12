"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  DayMenu,
  WeeklyItem,
} from "@/types/training";

import {
  calculateDaySeconds,
  calculateEndTime,
  calculateItemSeconds,
  formatDuration,
} from "@/lib/trainingTime";

type Props = {
  selectedDay: DayMenu;

  onReorderItems: (
    oldIndex: number,
    newIndex: number
  ) => void;
};

export default function WeeklySummary({
  selectedDay,
  onReorderItems,
}: Props) {
  const totalSeconds =
    calculateDaySeconds(selectedDay);

  const endTime = calculateEndTime(
    selectedDay.startTime,
    totalSeconds
  );

  /*
   * PC操作
   * 8px以上動かしたときにドラッグ開始
   */
  const pointerSensor = useSensor(
    PointerSensor,
    {
      activationConstraint: {
        distance: 8,
      },
    }
  );

  /*
   * スマホ操作
   * 約0.3秒長押ししてからドラッグ開始
   */
  const touchSensor = useSensor(
    TouchSensor,
    {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    }
  );

  /*
   * キーボード操作
   */
  const keyboardSensor = useSensor(
    KeyboardSensor,
    {
      coordinateGetter:
        sortableKeyboardCoordinates,
    }
  );

  const sensors = useSensors(
    pointerSensor,
    touchSensor,
    keyboardSensor
  );

  /*
   * 同じ練習が複数入っている可能性も考え、
   * drillIdとindexを組み合わせてIDを作る
   */
  const sortableIds =
    selectedDay.items.map(
      (item, index) =>
        createSortableId(item, index)
    );

  const handleDragEnd = (
    event: DragEndEvent
  ) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (active.id === over.id) {
      return;
    }

    const oldIndex =
      sortableIds.indexOf(
        String(active.id)
      );

    const newIndex =
      sortableIds.indexOf(
        String(over.id)
      );

    if (
      oldIndex === -1 ||
      newIndex === -1
    ) {
      return;
    }

    onReorderItems(
      oldIndex,
      newIndex
    );
  };

  return (
    <section className="mt-5 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
      {/* タイトル */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 text-lg shadow-lg shadow-pink-500/20">
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

      {/* 集計カード */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="練習数"
          value={`${selectedDay.items.length}件`}
          accent="cyan"
        />

        <SummaryCard
          label="合計時間"
          value={formatDuration(totalSeconds)}
          accent="violet"
        />

        <SummaryCard
          label="開始"
          value={
            selectedDay.startTime ||
            "--:--"
          }
          accent="pink"
        />

        <SummaryCard
          label="終了予定"
          value={endTime}
          accent="blue"
        />
      </div>

      {/* 練習順 */}
      <div className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
              TRAINING ORDER
            </p>

            <h3 className="mt-1 text-lg font-black text-white">
              練習の実施順
            </h3>

            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
              右側のハンドルを長押しして、
              上下に並べ替えられます。
            </p>
          </div>

          {selectedDay.items.length > 1 && (
            <div className="shrink-0 rounded-full border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2 text-[10px] font-black text-cyan-300">
              並べ替え可能
            </div>
          )}
        </div>

        {selectedDay.items.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={
              closestCenter
            }
            onDragEnd={
              handleDragEnd
            }
          >
            <SortableContext
              items={sortableIds}
              strategy={
                verticalListSortingStrategy
              }
            >
              <div className="mt-4 space-y-3">
                {selectedDay.items.map(
                  (item, index) => {
                    const id =
                      createSortableId(
                        item,
                        index
                      );

                    return (
                      <SortableTrainingItem
                        key={id}
                        id={id}
                        item={item}
                        index={index}
                      />
                    );
                  }
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-black/20 p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl text-slate-600">
              －
            </div>

            <p className="mt-4 text-sm font-black text-slate-400">
              練習が登録されていません
            </p>

            <p className="mt-2 text-xs font-bold text-slate-600">
              検索またはフォルダーから練習を追加してください。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SortableTrainingItem({
  id,
  item,
  index,
}: {
  id: string;
  item: WeeklyItem;
  index: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    transform:
      CSS.Transform.toString(
        transform
      ),

    transition,
  };

  const itemSeconds =
    calculateItemSeconds(item);

  const timeText =
    itemSeconds > 0
      ? formatDuration(itemSeconds)
      : "時間未設定";

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden rounded-[22px] border p-4 shadow-lg transition ${
        isDragging
          ? "z-[100] scale-[1.02] border-cyan-300/50 bg-[#18253b] opacity-95 shadow-cyan-500/20"
          : "border-white/10 bg-black/20"
      }`}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-violet-500/10" />
      )}

      <div className="relative flex items-center gap-3">
        {/* 順番 */}
        <div className="flex h-10 min-w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-cyan-500/10">
          {index + 1}
        </div>

        {/* 練習情報 */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-white">
            {item.name}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/10 bg-cyan-400/[0.06] px-2 py-1 text-[10px] font-black text-cyan-300">
              {item.category}
            </span>

            <span
              className={`text-[10px] font-bold ${
                itemSeconds > 0
                  ? "text-slate-400"
                  : "text-amber-300"
              }`}
            >
              {timeText}
            </span>
          </div>
        </div>

        {/* ドラッグハンドル */}
        <button
          type="button"
          aria-label={`${item.name}を並べ替える`}
          {...attributes}
          {...listeners}
          className="flex h-12 min-w-12 touch-none select-none items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-xl font-black leading-none text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-400/10 hover:text-cyan-200 active:scale-95 active:border-cyan-300/30 active:bg-cyan-400/20 active:text-cyan-100"
        >
          ☰
        </button>
      </div>
    </article>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent:
    | "cyan"
    | "violet"
    | "pink"
    | "blue";
}) {
  const styles = {
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
      className={`rounded-2xl border p-4 ${styles[accent]}`}
    >
      <p className="text-[10px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </div>
  );
}

function createSortableId(
  item: WeeklyItem,
  index: number
): string {
  return `${item.drillId}-${index}`;
}