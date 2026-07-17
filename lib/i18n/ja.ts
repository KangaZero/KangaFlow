// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Japanese locale. Structure mirrors ./en.ts exactly for type safety — the
// compiler enforces that this object is assignable to the English base shape.
const ja = {
  common: {
    loading: [
      "生まれたことがある人の死亡率は１００％です",
      "「今日」という言葉は明日の前の日を意味します",
      "右利きの人は左利きではありません",
    ],
    notFound: {
      heading: "ページが見つかりません",
      link: "ホームに戻る",
      text: "お探しのページは存在しません。",
    },
  },
  headerDate: {
    days: [
      "日曜日",
      "月曜日",
      "火曜日",
      "水曜日",
      "木曜日",
      "金曜日",
      "土曜日",
    ],
    months: [
      "正月",
      "如月",
      "弥生",
      "卯月",
      "皐月",
      "水無月",
      "文月",
      "葉月",
      "長月",
      "神無月",
      "霜月",
      "師走",
    ],
  },
  home: {
    commandHint: ": キーでコマンド",
    tagline: "ささやかなフローアプリ。",
    themeHint: "d キーでテーマを切り替え",
  },
  nav: {
    achievements: "実績",
    home: "ホーム",
  },
  theme: {
    dark: "ダークテーマ",
    label: "テーマ",
    light: "ライトテーマ",
    terminal: "ターミナルテーマ",
  },
  weather: {
    conditions: {
      "0": { day: "晴れ", night: "快晴" },
      "1": { day: "概ね晴れ", night: "概ね快晴" },
      "2": { day: "一部曇り", night: "一部曇り" },
      "3": { day: "曇り", night: "曇り" },
      "45": { day: "霧", night: "霧" },
      "48": { day: "霧氷", night: "霧氷" },
      "51": { day: "弱い霧雨", night: "弱い霧雨" },
      "53": { day: "霧雨", night: "霧雨" },
      "55": { day: "強い霧雨", night: "強い霧雨" },
      "56": { day: "弱い着氷性の霧雨", night: "弱い着氷性の霧雨" },
      "57": { day: "着氷性の霧雨", night: "着氷性の霧雨" },
      "61": { day: "弱い雨", night: "弱い雨" },
      "63": { day: "雨", night: "雨" },
      "65": { day: "強い雨", night: "強い雨" },
      "66": { day: "弱い着氷性の雨", night: "弱い着氷性の雨" },
      "67": { day: "着氷性の雨", night: "着氷性の雨" },
      "71": { day: "弱い雪", night: "弱い雪" },
      "73": { day: "雪", night: "雪" },
      "75": { day: "大雪", night: "大雪" },
      "77": { day: "霧雪", night: "霧雪" },
      "80": { day: "弱いにわか雨", night: "弱いにわか雨" },
      "81": { day: "にわか雨", night: "にわか雨" },
      "82": { day: "激しいにわか雨", night: "激しいにわか雨" },
      "85": { day: "弱いにわか雪", night: "弱いにわか雪" },
      "86": { day: "にわか雪", night: "にわか雪" },
      "95": { day: "雷雨", night: "雷雨" },
      "96": { day: "雹を伴う雷雨", night: "雹を伴う雷雨" },
      "99": { day: "雹を伴う激しい雷雨", night: "雹を伴う激しい雷雨" },
    },
    loading: "天気を取得中…",
    unavailable: "天気を取得できません",
  },
} as const

export default ja
