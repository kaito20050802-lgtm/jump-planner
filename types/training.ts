// =============================
// 共通の型
// =============================

export type TimeMode = "auto" | "manual";

export type TrainingSeason =
  | "冬季練習期"
  | "鍛錬期"
  | "試合準備期"
  | "試合期";

export type WeightPurpose =
  | "筋肥大"
  | "最大筋力"
  | "パワー"
  | "神経系"
  | "調整";

export type WeeklyDraftStatus =
  | "draft"
  | "submitted"
  | "revision"
  | "approved";

export type FirestoreTimestampLike = {
  toMillis?: () => number;
  toDate?: () => Date;
};

// =============================
// 筋トレの時期別推奨設定
// =============================

export type StrengthPrescription = {
  season: TrainingSeason;
  purpose: WeightPurpose;

  // MAX重量に対する割合
  // 例：「70〜85」
  percent: string;

  // 例：「3〜5」
  reps: string;

  // 例：「3〜4」
  sets: string;

  // セット間レスト（分）
  // 例：「3」
  restMinutes: string;

  memo?: string;
};

// =============================
// 練習メニュー集
// =============================

export type Drill = {
  id: string;

  name: string;
  category: string;
  targetEvent: string;
  purposeTags: string[];

  // 練習の説明
  description: string;

  // 基本の本数・セット数
  volume: string;

  // 注意点
  caution: string;

  photoUrl?: string;
  videoUrl?: string;

  // =========================
  // 所要時間設定
  // =========================

  timeMode: TimeMode;

  // 自動計算用
  // 例：100mを20秒
  baseDistance?: string;
  baseSeconds?: string;

  // 手入力型の標準時間
  // 例：15分
  defaultMinutes?: string;

  // =========================
  // 筋トレ設定
  // =========================

  strengthPrescriptions?: StrengthPrescription[];

  // =========================
  // 管理情報
  // =========================

  createdBy?: string;
  updatedBy?: string;
  isActive?: boolean;

  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
};

// =============================
// 週メニュー内の練習1件
// =============================

export type WeeklyItem = {
  drillId: string;

  name: string;
  category: string;
  targetEvent: string;
  purposeTags: string[];

  // =========================
  // 所要時間設定
  // =========================

  timeMode: TimeMode;

  // 練習メニュー集に登録された基準
  baseDistance?: string;
  baseSeconds?: string;
  defaultMinutes?: string;

  // =========================
  // 代表者が週メニュー作成時に入力
  // =========================

  // 距離（m）
  distance: string;

  // 本数
  reps: string;

  // セット数
  sets: string;

  // 強度
  // 例：「8割」「80%」
  intensity: string;

  // 本数間レスト（秒）
  repRestSeconds: string;

  // セット間レスト（分）
  setRestMinutes: string;

  // 手入力型の所要時間（分）
  manualMinutes: string;

  // 自動計算型でも、代表者がその日の状況に合わせて
  // 1本当たりの時間を上書きするための項目
  customOneRepSeconds: string;

  // =========================
  // 筋トレ用
  // =========================

  selectedSeason?: TrainingSeason;
  selectedPurpose?: WeightPurpose;

  // 選択された推奨設定を保持するための項目
  selectedPercent?: string;
};

// =============================
// 曜日ごとのメニュー
// =============================

export type DayMenu = {
  date: string;
  label: string;

  // 例：「17:00」
  startTime: string;

  items: WeeklyItem[];
};

// =============================
// 週メニューの下書き・提出データ
// =============================

export type WeeklyDraft = {
  id: string;

  event: string;
  submittedBy: string;

  weekStart: string;
  weekStartDate?: string;

  // この日を過ぎたら削除対象
  deleteAfter?: string;

  theme: string;
  memo: string;

  status: WeeklyDraftStatus;

  leaderComment?: string;
  coachComment?: string;

  dayMenus?: DayMenu[];

  // 過去データとの互換性のため残す
  items?: WeeklyItem[];

  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;

  coachCommentUpdatedAt?: FirestoreTimestampLike;
};

// =============================
// 選択肢
// =============================

export const EVENTS = [
  "共通",
  "走高跳",
  "棒高跳",
  "走幅跳",
  "三段跳",
] as const;

export const DAY_LABELS = [
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
  "日",
] as const;

export const DEFAULT_CATEGORIES = [
  "アップ",
  "技術",
  "スプリント",
  "ジャンプ",
  "筋トレ",
  "補強",
  "メディシンボール",
  "リカバリー",
  "ダウン",
] as const;

export const DEFAULT_TAGS = [
  "助走",
  "踏切",
  "ホップ",
  "ステップ",
  "ジャンプ",
  "筋肥大",
  "筋力アップ",
  "最大筋力",
  "瞬発力",
  "神経系",
  "SSC",
  "股関節",
  "可動域",
  "腹圧",
  "ウォーミングアップ",
  "パワー",
  "全身連動",
  "スピード持久力",
  "試合調整",
  "追い込み",
] as const;

export const TRAINING_SEASONS: TrainingSeason[] = [
  "冬季練習期",
  "鍛錬期",
  "試合準備期",
  "試合期",
];

export const WEIGHT_PURPOSES: WeightPurpose[] = [
  "筋肥大",
  "最大筋力",
  "パワー",
  "神経系",
  "調整",
];