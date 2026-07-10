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
  TRAINING_SEASONS,
  TrainingSeason,
  WEIGHT_PURPOSES,
  WeightPurpose,
} from "@/types/training";
import { normalizeText } from "@/lib/trainingTime";

type TimeMode = "auto" | "manual";
type FormTab = "basic" | "strength";

type Drill = {
  id: string;
  name: string;
  category: string;
  targetEvent: string;
  purposeTags?: string[];
  description?: string;
  volume?: string;
  caution?: string;
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

type DrillForm = {
  name: string;
  category: string;
  targetEvent: string;
  purposeTags: string[];
  description: string;
  volume: string;
  caution: string;
  photoUrl: string;
  videoUrl: string;
  timeMode: TimeMode;
  baseDistance: string;
  baseSeconds: string;
  defaultMinutes: string;
  strengthPrescriptions: StrengthPrescription[];
};

const DEFAULT_STRENGTH_PRESCRIPTIONS: StrengthPrescription[] = [
  {
    season: "冬季練習期",
    purpose: "最大筋力",
    percent: "85〜95",
    reps: "2〜3",
    sets: "4〜5",
    restMinutes: "4〜5",
    memo: "重さを重視しつつ、フォームを崩さない。",
  },
  {
    season: "鍛錬期",
    purpose: "パワー",
    percent: "70〜85",
    reps: "3〜5",
    sets: "3〜4",
    restMinutes: "3",
    memo: "挙上速度を落とさず、瞬発的に動かす。",
  },
  {
    season: "試合準備期",
    purpose: "神経系",
    percent: "50〜70",
    reps: "2〜3",
    sets: "2〜3",
    restMinutes: "3",
    memo: "疲労を残さず、高い出力の刺激を入れる。",
  },
  {
    season: "試合期",
    purpose: "調整",
    percent: "40〜60",
    reps: "1〜2",
    sets: "1〜2",
    restMinutes: "2〜3",
    memo: "動きのキレを保ち、追い込みすぎない。",
  },
];

const EMPTY_FORM: DrillForm = {
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
};

export default function DrillsPage() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [memberId, setMemberId] = useState("");
  const [drills, setDrills] = useState<Drill[]>([]);
  const [tags, setTags] = useState<string[]>([...DEFAULT_TAGS]);
  const [categories, setCategories] = useState<string[]>([
    ...DEFAULT_CATEGORIES,
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [searchText, setSearchText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTab, setFormTab] = useState<FormTab>("basic");
  const [form, setForm] = useState<DrillForm>({ ...EMPTY_FORM });

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const currentRole = sessionStorage.getItem("currentRole");
    const currentMemberId = sessionStorage.getItem("currentMemberId");

    if (!currentRole || !currentMemberId) {
      router.push("/");
      return;
    }

    setRole(currentRole);
    setMemberId(currentMemberId);

    const load = async () => {
      try {
        await Promise.all([
          loadDrills(),
          loadTags(),
          loadCategories(),
        ]);
      } catch (error) {
        console.error("練習メニュー集の読み込みに失敗しました", error);
        alert("練習メニュー集の読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const loadDrills = async () => {
    const q = query(collection(db, "drills"), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);

    const loaded = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Drill[];

    setDrills(loaded.filter((drill) => drill.isActive !== false));
  };

  const loadTags = async () => {
    const snap = await getDocs(collection(db, "purposeTags"));
    const customTags = snap.docs
      .map((item) => String(item.data().name || "").trim())
      .filter(Boolean);

    setTags(Array.from(new Set([...DEFAULT_TAGS, ...customTags])));
  };

  const loadCategories = async () => {
    const snap = await getDocs(collection(db, "drillCategories"));
    const customCategories = snap.docs
      .map((item) => String(item.data().name || "").trim())
      .filter(Boolean);

    setCategories(
      Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories]))
    );
  };

  const canEditDrill = (drill: Drill) => {
    if (role === "leader" || role === "representative") return true;
    return drill.createdBy === memberId;
  };

  const toggleTag = (tag: string) => {
    setForm((current) => ({
      ...current,
      purposeTags: current.purposeTags.includes(tag)
        ? current.purposeTags.filter((item) => item !== tag)
        : [...current.purposeTags, tag],
    }));
  };

  const addTag = async () => {
    const trimmed = newTag.trim();

    if (!trimmed) {
      alert("追加するタグ名を入力してください");
      return;
    }

    if (tags.includes(trimmed)) {
      alert("そのタグはすでにあります");
      return;
    }

    await addDoc(collection(db, "purposeTags"), {
      name: trimmed,
      createdBy: memberId,
      createdAt: serverTimestamp(),
    });

    setTags((current) => [...current, trimmed]);
    setNewTag("");
    alert("タグを追加しました");
  };

  const addCategory = async () => {
    const trimmed = newCategory.trim();

    if (!trimmed) {
      alert("追加するカテゴリー名を入力してください");
      return;
    }

    if (categories.includes(trimmed)) {
      alert("そのカテゴリーはすでにあります");
      return;
    }

    await addDoc(collection(db, "drillCategories"), {
      name: trimmed,
      createdBy: memberId,
      createdAt: serverTimestamp(),
    });

    setCategories((current) => [...current, trimmed]);
    setNewCategory("");
    alert("カテゴリーを追加しました");
  };

  const saveDrill = async () => {
    if (!form.name.trim()) {
      alert("練習名を入力してください");
      setFormTab("basic");
      return;
    }

    if (form.purposeTags.length === 0) {
      alert("目的タグを1つ以上選択してください");
      setFormTab("basic");
      return;
    }

    if (
      form.timeMode === "auto" &&
      (!form.baseDistance.trim() || !form.baseSeconds.trim())
    ) {
      alert("自動計算では、基準距離と基準時間が必要です");
      setFormTab("basic");
      return;
    }

    if (
      form.timeMode === "manual" &&
      !form.defaultMinutes.trim()
    ) {
      alert("標準所要時間を入力してください");
      setFormTab("basic");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const target = drills.find((drill) => drill.id === editingId);

        if (target && !canEditDrill(target)) {
          alert("このメニューは編集できません");
          return;
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
    } catch (error) {
      console.error("練習メニューの保存に失敗しました", error);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (drill: Drill) => {
    if (!canEditDrill(drill)) {
      alert("このメニューは編集できません");
      return;
    }

    setEditingId(drill.id);
    setFormTab("basic");

    setForm({
      name: drill.name || "",
      category: drill.category || "アップ",
      targetEvent: drill.targetEvent || "共通",
      purposeTags: drill.purposeTags || [],
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormTab("basic");
    setForm({ ...EMPTY_FORM });
  };

  const addStrengthPrescription = () => {
    setForm((current) => ({
      ...current,
      strengthPrescriptions: [
        ...current.strengthPrescriptions,
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
    }));
  };

  const updateStrengthPrescription = (
    index: number,
    field: keyof StrengthPrescription,
    value: string
  ) => {
    setForm((current) => {
      const next = [...current.strengthPrescriptions];

      next[index] = {
        ...next[index],
        [field]: value,
      };

      return {
        ...current,
        strengthPrescriptions: next,
      };
    });
  };

  const removeStrengthPrescription = (index: number) => {
    setForm((current) => ({
      ...current,
      strengthPrescriptions: current.strengthPrescriptions.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const searchedDrills = useMemo(() => {
    const keyword = normalizeText(searchText);

    if (!keyword) return [];

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

        return target.includes(keyword);
      })
      .sort((a, b) => {
        const aName = normalizeText(a.name);
        const bName = normalizeText(b.name);

        const aStarts = aName.startsWith(keyword);
        const bStarts = bName.startsWith(keyword);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.name.localeCompare(b.name, "ja");
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
          drill.category === openCategory &&
          drill.targetEvent === event
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#10172a] text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />
          <p className="mt-4 font-black">読み込み中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#10172a] px-4 py-6 text-white">
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-violet-600/30 blur-[100px]" />
      <div className="pointer-events-none absolute -right-28 top-72 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-20 left-1/3 h-80 w-80 rounded-full bg-cyan-500/15 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-cyan-300">
              JUMP PLANNER
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              練習メニュー集
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-400">
              過去の練習を蓄積し、検索・分類・編集しながら、
              チーム全体で練習の知識を共有できます。
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/home")}
            className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs font-black text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
          >
            ホームへ
          </button>
        </header>

        <section className="relative mt-7 overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-pink-500/40 to-violet-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl font-black shadow-lg shadow-pink-500/20">
                ＋
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] text-violet-200">
                  DRILL LIBRARY
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {editingId ? "メニューを編集" : "新しい練習を登録"}
                </h2>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
              <button
                type="button"
                onClick={() => setFormTab("basic")}
                className={`rounded-xl py-3 text-sm font-black transition ${
                  formTab === "basic"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                基本設定
              </button>

              <button
                type="button"
                onClick={() => setFormTab("strength")}
                className={`rounded-xl py-3 text-sm font-black transition ${
                  formTab === "strength"
                    ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-pink-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                筋トレ設定
              </button>
            </div>

            {formTab === "basic" && (
              <div className="mt-5">
                <GlassInput
                  label="練習名"
                  value={form.name}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="例：バウンディング"
                />

                <GlassSelect
                  label="カテゴリー"
                  value={form.category}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      category: value,
                    }))
                  }
                  options={categories}
                />

                <InlineAdd
                  value={newCategory}
                  onChange={setNewCategory}
                  onAdd={addCategory}
                  placeholder="新しいカテゴリー"
                  buttonLabel="追加"
                />

                <GlassSelect
                  label="対象種目"
                  value={form.targetEvent}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      targetEvent: value,
                    }))
                  }
                  options={[...EVENTS]}
                />

                <div className="mt-5">
                  <label className="text-sm font-black text-slate-200">
                    目的タグ
                  </label>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    複数選択できます。
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected = form.purposeTags.includes(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                            selected
                              ? "border-cyan-300/50 bg-cyan-400/20 text-cyan-200 shadow-lg shadow-cyan-500/10"
                              : "border-white/10 bg-white/[0.05] text-slate-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {selected ? "✓ " : ""}
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  <InlineAdd
                    value={newTag}
                    onChange={setNewTag}
                    onAdd={addTag}
                    placeholder="新しいタグ"
                    buttonLabel="追加"
                  />
                </div>

                <GlassTextarea
                  label="やり方"
                  value={form.description}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      description: value,
                    }))
                  }
                  placeholder="練習の進め方、意識する動きなど"
                />

                <GlassInput
                  label="基本の本数・セット数"
                  value={form.volume}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      volume: value,
                    }))
                  }
                  placeholder="例：30m×3本、2セット"
                />

                <section className="mt-6 rounded-[26px] border border-cyan-300/15 bg-cyan-400/[0.06] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/15 text-lg text-cyan-300">
                      ◷
                    </div>

                    <div>
                      <h3 className="font-black">所要時間の設定</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        週メニュー作成時の終了予定計算に使用します。
                      </p>
                    </div>
                  </div>

                  <GlassSelect
                    label="計算方法"
                    value={form.timeMode}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        timeMode: value as TimeMode,
                      }))
                    }
                    options={["manual", "auto"]}
                    optionLabels={{
                      manual: "標準時間を登録",
                      auto: "距離と時間から自動計算",
                    }}
                  />

                  {form.timeMode === "auto" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <GlassInput
                        label="基準距離（m）"
                        value={form.baseDistance}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            baseDistance: value,
                          }))
                        }
                        placeholder="例：100"
                      />

                      <GlassInput
                        label="基準時間（秒）"
                        value={form.baseSeconds}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            baseSeconds: value,
                          }))
                        }
                        placeholder="例：20"
                      />
                    </div>
                  ) : (
                    <GlassInput
                      label="標準所要時間（分）"
                      value={form.defaultMinutes}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          defaultMinutes: value,
                        }))
                      }
                      placeholder="例：15"
                    />
                  )}
                </section>

                <GlassTextarea
                  label="注意点"
                  value={form.caution}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      caution: value,
                    }))
                  }
                  placeholder="怪我防止、フォーム上の注意など"
                />

                <div className="grid gap-3 md:grid-cols-2">
                  <GlassInput
                    label="写真URL（任意）"
                    value={form.photoUrl}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        photoUrl: value,
                      }))
                    }
                    placeholder="https://..."
                  />

                  <GlassInput
                    label="動画URL（任意）"
                    value={form.videoUrl}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        videoUrl: value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {formTab === "strength" && (
              <div className="mt-5">
                <div className="rounded-[26px] border border-violet-300/15 bg-violet-400/[0.06] p-4">
                  <p className="text-xs font-black tracking-[0.2em] text-violet-300">
                    STRENGTH PRESET
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    時期別の推奨メニュー
                  </h3>

                  <p className="mt-2 text-sm font-bold leading-6 text-slate-400">
                    冬季練習期、鍛錬期、試合準備期、試合期ごとに、
                    MAXの割合・本数・セット数・レストを登録できます。
                  </p>

                  {form.category !== "筋トレ" && (
                    <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs font-bold leading-5 text-amber-200">
                      現在のカテゴリーは「{form.category}」です。
                      筋トレ種目の場合は、基本設定でカテゴリーを「筋トレ」にしてください。
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        strengthPrescriptions:
                          DEFAULT_STRENGTH_PRESCRIPTIONS.map((item) => ({
                            ...item,
                          })),
                      }))
                    }
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 py-4 font-black text-white shadow-lg shadow-pink-500/20"
                  >
                    標準テンプレートを入れる
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {form.strengthPrescriptions.map((preset, index) => (
                    <div
                      key={`${preset.season}-${index}`}
                      className="rounded-[26px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-violet-300">
                            設定 {index + 1}
                          </p>
                          <h4 className="mt-1 font-black">
                            {preset.season} / {preset.purpose}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeStrengthPrescription(index)
                          }
                          className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-black text-rose-300"
                        >
                          削除
                        </button>
                      </div>

                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <GlassSelect
                          label="時期"
                          value={preset.season}
                          onChange={(value) =>
                            updateStrengthPrescription(
                              index,
                              "season",
                              value as TrainingSeason
                            )
                          }
                          options={TRAINING_SEASONS}
                        />

                        <GlassSelect
                          label="目的"
                          value={preset.purpose}
                          onChange={(value) =>
                            updateStrengthPrescription(
                              index,
                              "purpose",
                              value as WeightPurpose
                            )
                          }
                          options={WEIGHT_PURPOSES}
                        />

                        <GlassInput
                          label="MAXの何％"
                          value={preset.percent}
                          onChange={(value) =>
                            updateStrengthPrescription(
                              index,
                              "percent",
                              value
                            )
                          }
                          placeholder="例：70〜85"
                        />

                        <GlassInput
                          label="本数"
                          value={preset.reps}
                          onChange={(value) =>
                            updateStrengthPrescription(
                              index,
                              "reps",
                              value
                            )
                          }
                          placeholder="例：3〜5"
                        />

                        <GlassInput
                          label="セット数"
                          value={preset.sets}
                          onChange={(value) =>
                            updateStrengthPrescription(
                              index,
                              "sets",
                              value
                            )
                          }
                          placeholder="例：3〜4"
                        />

                        <GlassInput
                          label="セット間レスト（分）"
                          value={preset.restMinutes}
                          onChange={(value) =>
                            updateStrengthPrescription(
                              index,
                              "restMinutes",
                              value
                            )
                          }
                          placeholder="例：3"
                        />
                      </div>

                      <GlassTextarea
                        label="メモ"
                        value={preset.memo || ""}
                        onChange={(value) =>
                          updateStrengthPrescription(
                            index,
                            "memo",
                            value
                          )
                        }
                        placeholder="例：スピードを落とさない。疲労を残さない。"
                      />
                    </div>
                  ))}
                </div>

                {form.strengthPrescriptions.length === 0 && (
                  <div className="mt-4 rounded-[26px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                    <p className="font-black text-slate-300">
                      まだ筋トレ設定がありません
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      標準テンプレートを入れるか、新しく追加してください。
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={addStrengthPrescription}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-white transition hover:bg-white/10"
                >
                  ＋ 推奨メニューを追加
                </button>
              </div>
            )}

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveDrill}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 py-4 font-black text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "保存中..."
                  : editingId
                    ? "変更を保存"
                    : "メニューを登録"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] py-4 font-black text-slate-200 transition hover:bg-white/10"
                >
                  編集をキャンセル
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-xl shadow-lg shadow-cyan-500/20">
              ⌕
            </div>

            <div>
              <p className="text-xs font-black tracking-[0.2em] text-cyan-300">
                SEARCH
              </p>
              <h2 className="mt-1 text-xl font-black">メニュー検索</h2>
            </div>
          </div>

          <div className="relative mt-5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">
              ⌕
            </span>

            <input
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setDetailId(null);
              }}
              placeholder="練習名・カテゴリー・タグで検索"
              className="w-full rounded-2xl border border-white/10 bg-black/20 py-4 pl-12 pr-12 font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
            />

            {searchText && (
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setDetailId(null);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {searchText.trim() && (
            <div className="mt-4">
              <p className="text-xs font-black text-slate-500">
                {searchedDrills.length}件のメニューが見つかりました
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
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
              </div>

              {searchedDrills.length === 0 && (
                <EmptyState message="一致するメニューがありません" />
              )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-2xl md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-xl shadow-lg shadow-pink-500/20">
                ▣
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] text-violet-300">
                  LIBRARY
                </p>
                <h2 className="mt-1 text-xl font-black">
                  登録済みメニュー
                </h2>
              </div>
            </div>

            {(openCategory || openEvent || openTag) && (
              <button
                type="button"
                onClick={resetFolders}
                className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-300 hover:bg-white/10"
              >
                最初へ
              </button>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-black text-slate-500">
              現在の場所
            </p>

            <p className="mt-2 text-sm font-black text-slate-200">
              メニュー集
              {openCategory ? ` / ${openCategory}` : ""}
              {openEvent ? ` / ${openEvent}` : ""}
              {openTag ? ` / ${openTag}` : ""}
            </p>
          </div>

          {!openCategory && (
            <FolderGrid
              title="カテゴリー"
              items={categoryFolders}
              icon="◆"
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
                label="カテゴリーへ戻る"
                onClick={() => {
                  setOpenCategory(null);
                  setOpenEvent(null);
                  setOpenTag(null);
                  setDetailId(null);
                }}
              />

              <FolderGrid
                title="対象種目"
                items={eventFolders}
                icon="↗"
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
                label="対象種目へ戻る"
                onClick={() => {
                  setOpenEvent(null);
                  setOpenTag(null);
                  setDetailId(null);
                }}
              />

              <FolderGrid
                title="目的タグ"
                items={tagFolders}
                icon="#"
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
                label="タグへ戻る"
                onClick={() => {
                  setOpenTag(null);
                  setDetailId(null);
                }}
              />

              <div className="mt-5 grid gap-3 md:grid-cols-2">
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
              </div>

              {displayedDrills.length === 0 && (
                <EmptyState message="このフォルダーにはメニューがありません" />
              )}
            </>
          )}
        </section>

        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.07] py-4 font-black text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
        >
          ホームへ戻る
        </button>

        <p className="mt-8 pb-4 text-center text-xs font-bold text-slate-600">
          Jump Planner / Training Library
        </p>
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
    <article className="overflow-hidden rounded-[26px] border border-white/10 bg-black/20 p-4 transition hover:border-cyan-300/20 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-300">
              {drill.category}
            </span>

            <span className="rounded-full bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-300">
              {drill.targetEvent}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black text-white">
            {drill.name}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setDetailId(open ? null : drill.id)}
          className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/10"
        >
          {open ? "閉じる" : "詳細"}
        </button>
      </div>

      {(drill.purposeTags?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {drill.purposeTags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniInfo
          label="時間方式"
          value={drill.timeMode === "auto" ? "自動計算" : "標準時間"}
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

      {open && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <DetailText
            label="やり方"
            value={drill.description}
          />

          <DetailText
            label="基本の本数・セット数"
            value={drill.volume}
          />

          <DetailText
            label="注意点"
            value={drill.caution}
          />

          {(drill.strengthPrescriptions?.length ?? 0) > 0 && (
            <div className="mt-5">
              <p className="text-xs font-black tracking-wider text-violet-300">
                時期別筋トレ設定
              </p>

              <div className="mt-3 space-y-2">
                {drill.strengthPrescriptions?.map((preset, index) => (
                  <div
                    key={`${preset.season}-${index}`}
                    className="rounded-2xl border border-violet-300/10 bg-violet-400/[0.06] p-3"
                  >
                    <p className="text-sm font-black">
                      {preset.season} / {preset.purpose}
                    </p>

                    <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
                      MAX {preset.percent}% / {preset.reps}回 /{" "}
                      {preset.sets}セット / レスト{" "}
                      {preset.restMinutes}分
                    </p>

                    {preset.memo && (
                      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                        {preset.memo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(drill.photoUrl || drill.videoUrl) && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {drill.photoUrl && (
                <a
                  href={drill.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 py-3 text-center text-xs font-black text-cyan-300"
                >
                  写真を見る
                </a>
              )}

              {drill.videoUrl && (
                <a
                  href={drill.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-pink-300/20 bg-pink-400/10 py-3 text-center text-xs font-black text-pink-300"
                >
                  動画を見る
                </a>
              )}
            </div>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-black text-white shadow-lg shadow-cyan-500/20"
            >
              このメニューを編集
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function FolderGrid({
  title,
  items,
  icon,
  onClick,
}: {
  title: string;
  items: string[];
  icon: string;
  onClick: (item: string) => void;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-black text-slate-400">{title}</h3>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onClick(item)}
            className="group flex w-full items-center justify-between rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-white/[0.07]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/80 to-pink-500/80 text-sm font-black shadow-lg shadow-pink-500/10">
                {icon}
              </div>

              <span className="font-black text-white">{item}</span>
            </div>

            <span className="text-xl text-slate-500 transition group-hover:translate-x-1 group-hover:text-violet-300">
              →
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <EmptyState message="まだフォルダーがありません" />
      )}
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
      type="button"
      onClick={onClick}
      className="mt-5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-slate-300 hover:bg-white/10"
    >
      ← {label}
    </button>
  );
}

function GlassInput({
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
    <div className="mt-5">
      <label className="text-sm font-black text-slate-200">{label}</label>

      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
      />
    </div>
  );
}

function GlassTextarea({
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
    <div className="mt-5">
      <label className="text-sm font-black text-slate-200">{label}</label>

      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
      />
    </div>
  );
}

function GlassSelect({
  label,
  value,
  onChange,
  options,
  optionLabels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  optionLabels?: Record<string, string>;
}) {
  return (
    <div className="mt-5">
      <label className="text-sm font-black text-slate-200">{label}</label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182139] p-4 font-bold text-white outline-none focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-500/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabels?.[option] || option}
          </option>
        ))}
      </select>
    </div>
  );
}

function InlineAdd({
  value,
  onChange,
  onAdd,
  placeholder,
  buttonLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  buttonLabel: string;
}) {
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
      />

      <button
        type="button"
        onClick={onAdd}
        className="shrink-0 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-5 text-sm font-black text-white shadow-lg shadow-pink-500/15"
      >
        {buttonLabel}
      </button>
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
      <p className="text-[10px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-black text-slate-200">{value}</p>
    </div>
  );
}

function DetailText({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-black tracking-wider text-cyan-300">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-300">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-[24px] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
      <p className="text-sm font-black text-slate-400">{message}</p>
    </div>
  );
}