// ========================================
// 共通
// ========================================

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

/**
 * 新しい運用
 *
 * draft:
 * 代表が作成中
 *
 * submitted:
 * 代表がパート長へ提出済み
 *
 * editing:
 * パート長がコーチなどと相談しながら編集中
 *
 * published:
 * パート長が完成メニューを公開済み
 *
 * revision・returned・approvedは
 * 旧データとの互換性のため残しています。
 */
export type WeeklyDraftStatus =
  | "draft"
  | "submitted"
  | "editing"
  | "published"
  | "revision"
  | "returned"
  | "approved";

export type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  toMillis?: () => number;
  toDate?: () => Date;
};

// ========================================
// 筋トレの時期別推奨設定
// ========================================

export type StrengthPrescription = {
  /**
   * 冬季練習期・鍛錬期・試合準備期・試合期
   */
  season: TrainingSeason;

  /**
   * 筋肥大・最大筋力・パワー・神経系・調整
   */
  purpose: WeightPurpose;

  /**
   * MAX重量に対する割合
   *
   * 例：
   * 70
   * 70〜85
   */
  percent: string;

  /**
   * 1セットの回数
   *
   * 例：
   * 3
   * 3〜5
   */
  reps: string;

  /**
   * セット数
   *
   * 例：
   * 3
   * 3〜4
   */
  sets: string;

  /**
   * セット間レスト
   *
   * 単位：分
   */
  restMinutes: string;

  /**
   * 注意点や目的
   */
  memo?: string;
};

// ========================================
// 練習メニュー集
// ========================================

export type Drill = {
  id: string;

  /**
   * 練習名
   */
  name: string;

  /**
   * アップ・技術・ジャンプ・筋トレなど
   */
  category: string;

  /**
   * 共通・走高跳・棒高跳・走幅跳・三段跳
   */
  targetEvent: string;

  /**
   * 複数の目的タグ
   */
  purposeTags: string[];

  /**
   * 練習方法
   */
  description: string;

  /**
   * 基本の本数・セット数
   */
  volume: string;

  /**
   * 注意点
   */
  caution: string;

  /**
   * 写真URL
   */
  photoUrl?: string;

  /**
   * 動画URL
   */
  videoUrl?: string;

  // ----------------------------------------
  // 所要時間
  // ----------------------------------------

  /**
   * auto:
   * 距離・基準時間から計算
   *
   * manual:
   * 仮メニュー作成時に所要時間を入力
   */
  timeMode: TimeMode;

  /**
   * 自動計算時の基準距離
   *
   * 単位：m
   */
  baseDistance?: string;

  /**
   * 基準距離1本にかかる時間
   *
   * 単位：秒
   */
  baseSeconds?: string;

  /**
   * 手入力型の標準所要時間
   *
   * 単位：分
   */
  defaultMinutes?: string;

  // ----------------------------------------
  // 筋トレ
  // ----------------------------------------

  /**
   * 時期別の推奨重量・回数・セット数
   */
  strengthPrescriptions?: StrengthPrescription[];

  // ----------------------------------------
  // 管理情報
  // ----------------------------------------

  createdBy?: string;
  updatedBy?: string;

  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;

  isActive?: boolean;
};

// ========================================
// 週メニュー内の練習1件
// ========================================

export type WeeklyItem = {
  /**
   * 元となる練習メニューのID
   */
  drillId: string;

  name: string;
  category: string;
  targetEvent: string;
  purposeTags: string[];

  // ----------------------------------------
  // 所要時間の基準
  // ----------------------------------------

  timeMode: TimeMode;

  baseDistance?: string;
  baseSeconds?: string;
  defaultMinutes?: string;

  // ----------------------------------------
  // 仮メニュー作成時の入力
  // ----------------------------------------

  /**
   * 距離
   *
   * 単位：m
   */
  distance: string;

  /**
   * 本数
   */
  reps: string;

  /**
   * セット数
   */
  sets: string;

  /**
   * 強度
   *
   * 例：
   * 80
   * 8割
   * 80%
   */
  intensity: string;

  /**
   * 本数間レスト
   *
   * 単位：秒
   */
  repRestSeconds: string;

  /**
   * セット間レスト
   *
   * 単位：分
   */
  setRestMinutes: string;

  /**
   * 手入力型練習の所要時間
   *
   * 単位：分
   */
  manualMinutes: string;

  /**
   * 自動計算型の練習で、
   * 今回だけ使用する1本当たり時間
   *
   * 空欄の場合は、
   * baseDistanceとbaseSecondsから計算
   *
   * 単位：秒
   */
  customOneRepSeconds: string;

  // ----------------------------------------
  // 筋トレ設定
  // ----------------------------------------

  selectedSeason?: TrainingSeason;
  selectedPurpose?: WeightPurpose;

  /**
   * 選択したMAX割合
   */
  selectedPercent?: string;
};

// ========================================
// 曜日別メニュー
// ========================================

export type DayMenu = {
  /**
   * YYYY-MM-DD
   */
  date: string;

  /**
   * 月・火・水・木・金・土・日
   */
  label: string;

  /**
   * HH:mm
   *
   * 例：
   * 17:00
   */
  startTime: string;

  items: WeeklyItem[];
};

// ========================================
// 代表が提出する仮メニュー
// Firestore：weeklyMenuDrafts
// ========================================

export type WeeklyDraft = {
  id: string;

  /**
   * 対象種目
   */
  event: string;

  /**
   * 代表者のメンバーID
   */
  submittedBy: string;

  /**
   * 代表者名
   */
  submittedByName?: string;

  /**
   * YYYY-MM-DD
   */
  weekStart: string;

  /**
   * 旧データ・既存コードとの互換用
   */
  weekStartDate?: string;

  /**
   * 2週間保存用の削除期限
   *
   * YYYY-MM-DD
   */
  deleteAfter?: string;

  /**
   * 週のテーマ
   */
  theme: string;

  /**
   * 代表者のメモ
   */
  memo: string;

  /**
   * 現在の状態
   */
  status: WeeklyDraftStatus;

  // ----------------------------------------
  // 代表案
  // ----------------------------------------

  /**
   * 代表者が作成・提出した元のメニュー
   *
   * パート長が編集しても、
   * このデータは変更しない想定
   */
  dayMenus?: DayMenu[];

  /**
   * 旧形式との互換用
   */
  items?: WeeklyItem[];

  // ----------------------------------------
  // パート長の編集内容
  // ----------------------------------------

  /**
   * パート長が修正しているメニュー
   *
   * submittedになった時点では空
   *
   * パート長が編集開始すると、
   * dayMenusをコピーしてここへ保存
   */
  leaderDayMenus?: DayMenu[];

  /**
   * パート長がLINEでコーチなどと
   * 相談した内容を残す内部メモ
   */
  leaderMemo?: string;

  /**
   * パート長が編集を開始した人のID
   */
  editingBy?: string;

  /**
   * パート長が編集を開始した日時
   */
  editingStartedAt?: FirestoreTimestampLike;

  // ----------------------------------------
  // 公開情報
  // ----------------------------------------

  /**
   * 作成されたweeklyPlansのID
   */
  publishedPlanId?: string;

  /**
   * 完成メニューを公開したパート長のID
   */
  publishedBy?: string;

  /**
   * 公開日時
   */
  publishedAt?: FirestoreTimestampLike;

  // ----------------------------------------
  // 旧システムとの互換性
  // ----------------------------------------

  leaderComment?: string;
  coachComment?: string;

  coachCommentUpdatedAt?: FirestoreTimestampLike;

  // ----------------------------------------
  // 作成・更新日時
  // ----------------------------------------

  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
};

// ========================================
// パート長が公開する完成メニュー
// Firestore：weeklyPlans
// ========================================

export type WeeklyPlan = {
  id: string;

  /**
   * 元になった仮メニューのID
   */
  sourceDraftId: string;

  /**
   * 対象種目
   */
  event: string;

  /**
   * 代表者のID
   */
  submittedBy: string;

  /**
   * 代表者名
   */
  submittedByName?: string;

  /**
   * YYYY-MM-DD
   */
  weekStart: string;

  /**
   * 既存コードとの形式統一用
   */
  weekStartDate?: string;

  /**
   * 2週間保存用の削除期限
   *
   * YYYY-MM-DD
   */
  deleteAfter: string;

  /**
   * 週のテーマ
   */
  theme: string;

  /**
   * 代表が提出時に記入したメモ
   */
  representativeMemo?: string;

  /**
   * パート長の共有用メモ
   */
  leaderMemo?: string;

  // ----------------------------------------
  // 差分表示
  // ----------------------------------------

  /**
   * 代表者が提出した元のメニュー
   *
   * 差分表示に使用
   */
  originalDayMenus: DayMenu[];

  /**
   * パート長が修正した完成メニュー
   */
  dayMenus: DayMenu[];

  // ----------------------------------------
  // 公開情報
  // ----------------------------------------

  /**
   * 公開したパート長のID
   */
  publishedBy: string;

  /**
   * 公開したパート長の名前
   */
  publishedByName?: string;

  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  publishedAt?: FirestoreTimestampLike;
};

// ========================================
// 代表案と完成版の差分表示
// ========================================

export type WeeklyItemDifference = {
  /**
   * 曜日の日付
   */
  date: string;

  /**
   * 月・火など
   */
  dayLabel: string;

  /**
   * 練習メニューID
   */
  drillId: string;

  /**
   * 練習名
   */
  name: string;

  /**
   * 追加・削除・変更・変更なし
   */
  changeType:
    | "added"
    | "removed"
    | "modified"
    | "unchanged";

  /**
   * 代表案
   */
  originalItem?: WeeklyItem;

  /**
   * 完成版
   */
  finalItem?: WeeklyItem;

  /**
   * 変更された項目
   *
   * 例：
   * reps
   * sets
   * intensity
   */
  changedFields?: Array<keyof WeeklyItem>;
};

// ========================================
// 選択肢
// ========================================

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
  "パワー",

  "SSC",

  "股関節",
  "ハムストリング",
  "可動域",
  "腹圧",
  "体幹",
  "バランス",

  "ウォーミングアップ",
  "全身連動",
  "スピード持久力",

  "傷害予防",
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

export const WEEKLY_DRAFT_STATUSES: WeeklyDraftStatus[] = [
  "draft",
  "submitted",
  "editing",
  "published",
];