"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_TAGS,
  EVENTS,
  StrengthPrescription,
  TrainingSeason,
  WeightPurpose,
} from "@/types/training";
import { normalizeText } from "@/lib/trainingTime";

type TimeMode = "auto" | "manual";

type Drill = {
  id: string;
  name: string;
  category: string;
  targetEvent: string;
  purposeTags?: string[];
  description: string;
  volume: string;
  caution: string;
  photoUrl?: string;
  videoUrl?: string;
  timeMode?: TimeMode;
  baseDistance?: string;
  baseSeconds?: string;
  defaultMinutes?: string;
  strengthPrescriptions?: StrengthPrescription[];
  createdBy?: string;
  updatedBy?: string;
  isActive?: boolean;
};

const SEASONS: TrainingSeason[] = [
  "冬季練習期",
  "鍛錬期",
  "試合準備期",
  "試合期",
];

const PURPOSES: WeightPurpose[] = [
  "筋肥大",
  "最大筋力",
  "パワー",
  "神経系",
  "調整",
];

const DEFAULT_STRENGTH_PRESCRIPTIONS: StrengthPrescription[] = [
  {
    season: "冬季練習期",
    purpose: "最大筋力",
    percent: "85〜95",
    reps: "2〜3",
    sets: "4〜5",
    restMinutes: "4〜5",
    memo: "重さ重視。フォームを崩さない。",
  },
  {
    season: "鍛錬期",
    purpose: "パワー",
    percent: "70〜85",
    reps: "3〜5",
    sets: "3〜4",
    restMinutes: "3",
    memo: "スピードを落とさず出力する。",
  },
  {
    season: "試合準備期",
    purpose: "神経系",
    percent: "50〜70",
    reps: "2〜3",
    sets: "2〜3",
    restMinutes: "3",
    memo: "疲労を残さず刺激を入れる。",
  },
  {
    season: "試合期",
    purpose: "調整",
    percent: "40〜60",
    reps: "1〜2",
    sets: "1〜2",
    restMinutes: "2〜3",
    memo: "動きのキレを出す。追い込みすぎない。",
  },
];

export default function DrillsPage() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [memberId, setMemberId] = useState("");
  const [drills, setDrills] = useState<Drill[]>([]);
  const [tags, setTags] = useState<string[]>([...DEFAULT_TAGS]);
  const [categories, setCategories] = useState<string[]>([
    ...DEFAULT_CATEGORIES,
  ]);

  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [searchText, setSearchText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTab, setFormTab] = useState<"basic" | "strength">("basic");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "アップ",
    targetEvent: "共通",
    purposeTags: [] as string[],
    description: "",
    volume: "",
    caution: "",
    photoUrl: "",
    videoUrl: "",
    timeMode: "manual" as TimeMode,
    baseDistance: "",
    baseSeconds: "",
    defaultMinutes: "",
    strengthPrescriptions: [] as StrengthPrescription[],
  });

  useEffect(() => {
    const currentRole = sessionStorage.getItem("currentRole");
    const currentMemberId = sessionStorage.getItem("currentMemberId");

    if (!currentRole || !currentMemberId) {
      router.push("/");
      return;
    }

    setRole(currentRole);
    setMemberId(currentMemberId);
    loadDrills();
    loadTags();
    loadCategories();
  }, [router]);

  const loadDrills = async () => {
    const q = query(collection(db, "drills"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    const loaded = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Drill[];

    setDrills(loaded.filter((d) => d.isActive !== false));
  };

  const loadTags = async () => {
    const snap = await getDocs(collection(db, "purposeTags"));
    const customTags = snap.docs.map((d) => String(d.data().name));
    setTags(Array.from(new Set([...DEFAULT_TAGS, ...customTags])));
  };

  const loadCategories = async () => {
    const snap = await getDocs(collection(db, "drillCategories"));
    const customCategories = snap.docs.map((d) => String(d.data().name));
    setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories])));
  };

  const canEditDrill = (drill: Drill) => {
    if (role === "leader") return true;
    if (role === "representative") return true;
    return drill.createdBy === memberId;
  };

  const toggleTag = (tag: string) => {
    const exists = form.purposeTags.includes(tag);
    setForm({
      ...form,
      purposeTags: exists
        ? form.purposeTags.filter((t) => t !== tag)
        : [...form.purposeTags, tag],
    });
  };

  const addTag = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return alert("追加するタグ名を入力してください");
    if (tags.includes(trimmed)) return alert("そのタグはすでにあります");

    await addDoc(collection(db, "purposeTags"), {
      name: trimmed,
      createdBy: memberId,
      createdAt: serverTimestamp(),
    });

    setTags([...tags, trimmed]);
    setNewTag("");
    alert("タグを追加しました");
  };

  const addCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return alert("追加するカテゴリー名を入力してください");
    if (categories.includes(trimmed)) return alert("そのカテゴリーはすでにあります");

    await addDoc(collection(db, "drillCategories"), {
      name: trimmed,
      createdBy: memberId,
      createdAt: serverTimestamp(),
    });

    setCategories([...categories, trimmed]);
    setNewCategory("");
    alert("カテゴリーを追加しました");
  };

  const saveDrill = async () => {
    if (!form.name.trim()) return alert("練習名を入力してください");

    if (form.purposeTags.length === 0) {
      return alert("目的タグを1つ以上選択してください");
    }

    if (form.timeMode === "auto") {
      if (!form.baseDistance || !form.baseSeconds) {
        return alert("自動計算の場合は、基準距離と基準時間を入力してください");
      }
    }

    if (form.timeMode === "manual") {
      if (!form.defaultMinutes) {
        return alert("手入力の場合は、標準所要時間を入力してください");
      }
    }

    if (editingId) {
      const target = drills.find((d) => d.id === editingId);
      if (target && !canEditDrill(target)) {
        return alert("このメニューは編集できません");
      }

      await updateDoc(doc(db, "drills", editingId), {
        ...form,
        updatedBy: memberId,
        updatedAt: serverTimestamp(),
      });

      alert("練習メニューを更新しました");
    } else {
      await addDoc(collection(db, "drills"), {
        ...form,
        createdBy: memberId,
        updatedBy: memberId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      });

      alert("練習メニューを登録しました");
    }

    resetForm();
    await loadDrills();
  };

  const startEdit = (drill: Drill) => {
    if (!canEditDrill(drill)) return alert("このメニューは編集できません");

    setEditingId(drill.id);
    setFormTab("basic");
    setForm({
      name: drill.name || "",
      category: drill.category || "アップ",
      targetEvent: drill.targetEvent || "共通",
      purposeTags: Array.isArray(drill.purposeTags) ? drill.purposeTags : [],
      description: drill.description || "",
      volume: drill.volume || "",
      caution: drill.caution || "",
      photoUrl: drill.photoUrl || "",
      videoUrl: drill.videoUrl || "",
      timeMode: drill.timeMode || "manual",
      baseDistance: drill.baseDistance || "",
      baseSeconds: drill.baseSeconds || "",
      defaultMinutes: drill.defaultMinutes || "",
      strengthPrescriptions: drill.strengthPrescriptions || [],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTab("basic");
    setForm({
      name: "",
      category: "アップ",
      targetEvent: "共通",
      purposeTags: [],
      description: "",
      volume: "",
      caution: "",
      photoUrl: "",
      videoUrl: "",
      timeMode: "manual",
      baseDistance: "",
      baseSeconds: "",
      defaultMinutes: "",
      strengthPrescriptions: [],
    });
  };

  const searchedDrills = useMemo(() => {
    const keyword = normalizeText(searchText);
    if (!keyword) return [];

    return drills.filter((drill) => {
      const target = normalizeText(
        [
          drill.name,
          drill.category,
          drill.targetEvent,
          ...(drill.purposeTags || []),
          drill.description,
          drill.caution,
        ].join(" ")
      );

      return target.includes(keyword);
    });
  }, [searchText, drills]);

  const categoryFolders = useMemo(() => {
    return categories.filter((category) =>
      drills.some((drill) => drill.category === category)
    );
  }, [categories, drills]);

  const eventFolders = useMemo(() => {
    if (!openCategory) return [];
    return [...EVENTS].filter((event) =>
      drills.some(
        (drill) =>
          drill.category === openCategory && drill.targetEvent === event
      )
    );
  }, [openCategory, drills]);

  const tagFolders = useMemo(() => {
    if (!openCategory || !openEvent) return [];

    return tags.filter((tag) =>
      drills.some(
        (drill) =>
          drill.category === openCategory &&
          drill.targetEvent === openEvent &&
          drill.purposeTags?.includes(tag)
      )
    );
  }, [openCategory, openEvent, tags, drills]);

  const displayedDrills = useMemo(() => {
    if (!openCategory || !openEvent || !openTag) return [];

    return drills.filter(
      (drill) =>
        drill.category === openCategory &&
        drill.targetEvent === openEvent &&
        drill.purposeTags?.includes(openTag)
    );
  }, [openCategory, openEvent, openTag, drills]);

  const resetFolders = () => {
    setOpenCategory(null);
    setOpenEvent(null);
    setOpenTag(null);
    setDetailId(null);
  };

  const addStrengthPrescription = () => {
    setForm({
      ...form,
      strengthPrescriptions: [
        ...form.strengthPrescriptions,
        {
          season: "鍛錬期",
          purpose: "パワー",
          percent: "",
          reps: "",
          sets: "",
          restMinutes: "",
          memo: "",
        },
      ],
    });
  };

  const updateStrengthPrescription = (
    index: number,
    field: keyof StrengthPrescription,
    value: string
  ) => {
    const next = [...form.strengthPrescriptions];
    next[index] = {
      ...next[index],
      [field]: value,
    };

    setForm({ ...form, strengthPrescriptions: next });
  };

  const removeStrengthPrescription = (index: number) => {
    setForm({
      ...form,
      strengthPrescriptions: form.strengthPrescriptions.filter(
        (_, i) => i !== index
      ),
    });
  };

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-black text-blue-600">Jump Planner</p>
        <h1 className="mt-1 text-3xl font-black">練習メニュー集</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">
          誰でも練習を登録できます。検索・フォルダー・時期別筋トレ設定に対応しています。
        </p>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">
            {editingId ? "メニュー編集" : "メニュー登録"}
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-2">
            <button
              type="button"
              onClick={() => setFormTab("basic")}
              className={`rounded-xl py-3 text-sm font-black ${
                formTab === "basic"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600"
              }`}
            >
              基本設定
            </button>

            <button
              type="button"
              onClick={() => setFormTab("strength")}
              className={`rounded-xl py-3 text-sm font-black ${
                formTab === "strength"
                  ? "bg-blue-600 text-white"
                  : "text-slate-600"
              }`}
            >
              筋トレ設定
            </button>
          </div>

          {formTab === "basic" && (
            <>
              <Input
                label="練習名"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="例：ホップドリル"
              />

              <Select
                label="カテゴリー"
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={categories}
              />

              <div className="mt-4 flex gap-2">
                <input
                  className="w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="カテゴリーを追加"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="shrink-0 rounded-2xl bg-slate-900 px-4 font-black text-white"
                >
                  追加
                </button>
              </div>

              <Select
                label="対象種目"
                value={form.targetEvent}
                onChange={(v) => setForm({ ...form, targetEvent: v })}
                options={[...EVENTS]}
              />

              <div className="mt-4">
                <label className="text-sm font-black">
                  目的タグ（複数選択可）
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = form.purposeTags.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-4 py-2 text-sm font-black ${
                          selected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    className="w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="タグを追加"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="shrink-0 rounded-2xl bg-slate-900 px-4 font-black text-white"
                  >
                    追加
                  </button>
                </div>
              </div>

              <Textarea
                label="やり方"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                placeholder="練習の進め方を書いてください"
              />

              <Input
                label="基本の本数・セット数"
                value={form.volume}
                onChange={(v) => setForm({ ...form, volume: v })}
                placeholder="例：30m×3本、3セット"
              />

              <section className="mt-5 rounded-2xl bg-slate-100 p-4">
                <h3 className="font-black">所要時間の設定</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  仮メニュー作成時に終了予定時刻を計算するための基準です。
                </p>

                <Select
                  label="所要時間の設定方法"
                  value={form.timeMode}
                  onChange={(v) =>
                    setForm({ ...form, timeMode: v as TimeMode })
                  }
                  options={["manual", "auto"]}
                />

                {form.timeMode === "auto" ? (
                  <>
                    <Input
                      label="基準距離（m）"
                      value={form.baseDistance}
                      onChange={(v) =>
                        setForm({ ...form, baseDistance: v })
                      }
                      placeholder="例：100"
                    />

                    <Input
                      label="基準時間（秒）"
                      value={form.baseSeconds}
                      onChange={(v) =>
                        setForm({ ...form, baseSeconds: v })
                      }
                      placeholder="例：20"
                    />

                    <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                      例：100mを20秒で行う練習なら、300mでは約60秒として計算します。
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      label="標準所要時間（分）"
                      value={form.defaultMinutes}
                      onChange={(v) =>
                        setForm({ ...form, defaultMinutes: v })
                      }
                      placeholder="例：15"
                    />

                    <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                      技術練習や跳躍練習など、日によって変わる練習は仮メニュー作成時に調整できます。
                    </p>
                  </>
                )}
              </section>

              <Textarea
                label="注意点"
                value={form.caution}
                onChange={(v) => setForm({ ...form, caution: v })}
                placeholder="意識するポイントや怪我防止の注意"
              />

              <Input
                label="写真URL（任意）"
                value={form.photoUrl}
                onChange={(v) => setForm({ ...form, photoUrl: v })}
                placeholder="https://..."
              />

              <Input
                label="動画URL（任意）"
                value={form.videoUrl}
                onChange={(v) => setForm({ ...form, videoUrl: v })}
                placeholder="https://..."
              />
            </>
          )}

          {formTab === "strength" && (
            <section className="mt-5">
              <h3 className="text-xl font-black">時期別の推奨メニュー</h3>
              <p className="mt-2 text-xs font-bold text-slate-500">
                筋トレ種目の場合、冬季・鍛錬期・試合期などでMAXの何％、本数、セット数を登録できます。
              </p>

              {form.category !== "筋トレ" && (
                <p className="mt-3 rounded-2xl bg-yellow-50 p-3 text-xs font-bold leading-5 text-yellow-700">
                  現在のカテゴリーは「{form.category}」です。筋トレ種目として使う場合は、基本設定でカテゴリーを「筋トレ」にしてください。
                </p>
              )}

              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    strengthPrescriptions: DEFAULT_STRENGTH_PRESCRIPTIONS,
                  })
                }
                className="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-black text-white"
              >
                標準テンプレートを入れる
              </button>

              <div className="mt-4 space-y-4">
                {form.strengthPrescriptions.map((p, index) => (
                  <div key={index} className="rounded-2xl bg-slate-100 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Select
                        label="時期"
                        value={p.season}
                        onChange={(v) =>
                          updateStrengthPrescription(
                            index,
                            "season",
                            v as TrainingSeason
                          )
                        }
                        options={SEASONS}
                      />

                      <Select
                        label="目的"
                        value={p.purpose}
                        onChange={(v) =>
                          updateStrengthPrescription(
                            index,
                            "purpose",
                            v as WeightPurpose
                          )
                        }
                        options={PURPOSES}
                      />

                      <Input
                        label="MAXの何％"
                        value={p.percent}
                        onChange={(v) =>
                          updateStrengthPrescription(index, "percent", v)
                        }
                        placeholder="例：70〜85"
                      />

                      <Input
                        label="本数"
                        value={p.reps}
                        onChange={(v) =>
                          updateStrengthPrescription(index, "reps", v)
                        }
                        placeholder="例：3〜5"
                      />

                      <Input
                        label="セット"
                        value={p.sets}
                        onChange={(v) =>
                          updateStrengthPrescription(index, "sets", v)
                        }
                        placeholder="例：3〜4"
                      />

                      <Input
                        label="レスト分"
                        value={p.restMinutes}
                        onChange={(v) =>
                          updateStrengthPrescription(
                            index,
                            "restMinutes",
                            v
                          )
                        }
                        placeholder="例：3"
                      />
                    </div>

                    <Textarea
                      label="メモ"
                      value={p.memo || ""}
                      onChange={(v) =>
                        updateStrengthPrescription(index, "memo", v)
                      }
                      placeholder="例：スピード重視、疲労を残さない"
                    />

                    <button
                      type="button"
                      onClick={() => removeStrengthPrescription(index)}
                      className="mt-3 w-full rounded-2xl bg-red-100 py-3 font-black text-red-600"
                    >
                      この設定を削除
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addStrengthPrescription}
                className="mt-4 w-full rounded-2xl bg-slate-900 py-3 font-black text-white"
              >
                推奨メニューを追加
              </button>
            </section>
          )}

          <button
            onClick={saveDrill}
            className="mt-5 w-full rounded-2xl bg-blue-600 py-4 font-black text-white"
          >
            {editingId ? "変更を保存" : "登録する"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              className="mt-3 w-full rounded-2xl bg-slate-200 py-4 font-black text-slate-700"
            >
              キャンセル
            </button>
          )}
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">メニュー検索</h2>
          <input
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="練習名・カテゴリー・タグで検索"
          />

          {searchText.trim() && (
            <div className="mt-4 space-y-3">
              {searchedDrills.map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  detailId={detailId}
                  setDetailId={setDetailId}
                  canEdit={canEditDrill(drill)}
                  onEdit={() => startEdit(drill)}
                />
              ))}

              {searchedDrills.length === 0 && (
                <p className="text-sm font-bold text-slate-500">
                  一致するメニューがありません。
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">登録済みメニュー</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                カテゴリー → 対象種目 → タグ の順に開きます。
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
                setDetailId(null);
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
                  setDetailId(null);
                }}
              />

              <FolderList
                title="対象種目"
                items={eventFolders}
                onClick={(item) => {
                  setOpenEvent(item);
                  setOpenTag(null);
                  setDetailId(null);
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
                  setDetailId(null);
                }}
              />

              <FolderList
                title="目的タグ"
                items={tagFolders}
                onClick={(item) => {
                  setOpenTag(item);
                  setDetailId(null);
                }}
              />
            </>
          )}

          {openCategory && openEvent && openTag && (
            <>
              <BackButton
                label="タグに戻る"
                onClick={() => {
                  setOpenTag(null);
                  setDetailId(null);
                }}
              />

              <div className="mt-4 space-y-3">
                {displayedDrills.map((drill) => (
                  <DrillCard
                    key={drill.id}
                    drill={drill}
                    detailId={detailId}
                    setDetailId={setDetailId}
                    canEdit={canEditDrill(drill)}
                    onEdit={() => startEdit(drill)}
                  />
                ))}

                {displayedDrills.length === 0 && (
                  <p className="text-sm font-bold text-slate-500">
                    このフォルダーにはメニューがありません。
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <button
          onClick={() => router.push("/home")}
          className="mt-5 w-full rounded-2xl bg-slate-900 py-4 font-black text-white"
        >
          ホームへ戻る
        </button>
      </div>
    </main>
  );
}

function DrillCard({
  drill,
  detailId,
  setDetailId,
  canEdit,
  onEdit,
}: {
  drill: Drill;
  detailId: string | null;
  setDetailId: (id: string | null) => void;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const open = detailId === drill.id;

  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{drill.name}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {drill.category} / {drill.targetEvent}
          </p>
        </div>

        <button
          onClick={() => setDetailId(open ? null : drill.id)}
          className="rounded-full bg-slate-900 px-3 py-2 text-xs font-black text-white"
        >
          {open ? "閉じる" : "詳細"}
        </button>
      </div>

      {drill.purposeTags && drill.purposeTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {drill.purposeTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-4 rounded-2xl bg-white p-4">
          {drill.description && (
            <>
              <p className="text-xs font-black text-slate-500">やり方</p>
              <p className="mt-1 text-sm leading-6">{drill.description}</p>
            </>
          )}

          {drill.volume && (
            <>
              <p className="mt-4 text-xs font-black text-slate-500">
                基本の本数・セット数
              </p>
              <p className="mt-1 text-sm font-bold">{drill.volume}</p>
            </>
          )}

          <div className="mt-4 rounded-xl bg-slate-100 p-3">
            <p className="text-xs font-black text-slate-500">所要時間</p>
            {drill.timeMode === "auto" ? (
              <p className="mt-1 text-sm font-bold">
                自動計算：基準 {drill.baseDistance || "-"}m /{" "}
                {drill.baseSeconds || "-"}秒
              </p>
            ) : (
              <p className="mt-1 text-sm font-bold">
                標準 {drill.defaultMinutes || "-"}分
              </p>
            )}
          </div>

          {drill.strengthPrescriptions &&
            drill.strengthPrescriptions.length > 0 && (
              <div className="mt-4 rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-black text-blue-600">
                  時期別筋トレ設定
                </p>
                <div className="mt-2 space-y-2">
                  {drill.strengthPrescriptions.map((p, index) => (
                    <div key={index} className="rounded-xl bg-white p-3">
                      <p className="text-sm font-black">
                        {p.season} / {p.purpose}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-600">
                        {p.percent}% / {p.reps}回 / {p.sets}セット / レスト
                        {p.restMinutes}分
                      </p>
                      {p.memo && (
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {p.memo}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {drill.caution && (
            <>
              <p className="mt-4 text-xs font-black text-slate-500">注意点</p>
              <p className="mt-1 text-sm leading-6">{drill.caution}</p>
            </>
          )}

          {(drill.photoUrl || drill.videoUrl) && (
            <div className="mt-4 flex gap-3">
              {drill.photoUrl && (
                <a
                  href={drill.photoUrl}
                  target="_blank"
                  className="text-xs font-black text-blue-600 underline"
                >
                  写真を見る
                </a>
              )}
              {drill.videoUrl && (
                <a
                  href={drill.videoUrl}
                  target="_blank"
                  className="text-xs font-black text-blue-600 underline"
                >
                  動画を見る
                </a>
              )}
            </div>
          )}

          {canEdit && (
            <button
              onClick={onEdit}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-3 font-black text-white"
            >
              このメニューを編集
            </button>
          )}
        </div>
      )}
    </div>
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

function Input({
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
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <input
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold text-slate-900"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Textarea({
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
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <textarea
        className="mt-2 h-28 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold text-slate-900"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="mt-4">
      <label className="text-sm font-black">{label}</label>
      <select
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 font-bold text-slate-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}