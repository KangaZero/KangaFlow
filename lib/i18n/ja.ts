// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Japanese locale. Structure mirrors ./en.ts exactly for type safety — the
// compiler enforces that this object is assignable to the English base shape.
const ja = {
  about: {
    education: "学歴",
    intro: {
      brand: "KangaFlow",
      welcome: "へようこそ",
    },
    overview: "概要",
    project: "プロジェクト",
    technical: "技術スキル",
    work: "職務経歴",
  },
  achievements: {
    filter: {
      label: "レア度で絞り込み",
    },
    heading: "実績",
    hidden: "???",
    items: {
      eos: {
        description: "ページのテーマを変更した。",
        title: "エオス",
      },
      "go-touch-grass": {
        description: "達成可能な実績をすべて解除した。",
        title: "外の空気を吸え",
      },
      "new-beginnings": {
        description: "初めてサイトを訪れた。",
        title: "新たな始まり",
      },
      "out-of-bounds": {
        description: "行ってはいけない場所へ迷い込んだ。",
        title: "立入禁止",
      },
      "puzzle-master": {
        description: "史上最難関のパズルを解いた。",
        title: "パズルマスター",
      },
      "sand-mandala": {
        description: "謎の条件で進行状況をリセットした。",
        title: "砂曼荼羅",
      },
      "snoopy-detective": {
        description: "日付と天気のボックスにカーソルを合わせた。",
        title: "スヌーピー探偵",
      },
      speedophile: {
        description: "67秒未満ですべてを達成した。",
        title: "スピード狂",
      },
    },
    locked: "未解除",
    rarities: {
      common: "コモン",
      legendary: "レジェンダリー",
      mythic: "ミシック",
      rare: "レア",
      uncommon: "アンコモン",
    },
    search: {
      noResults: "実績が見つかりません。",
      placeholder: "実績を検索…",
      results: "件",
    },
    share: "共有",
    toast: {
      dismiss: "閉じる",
      unlocked: "実績を解除しました！",
    },
    toggleColumns: "レイアウト切替",
    unlocked: "解除済み",
  },
  command: {
    description: "コマンドを実行または検索。",
    empty: "結果がありません。",
    groups: {
      general: "一般",
      locale: "言語",
      navigation: "ナビゲーション",
      theme: "テーマ",
    },
    locales: {
      en: "English",
      ja: "日本語",
    },
    placeholder: "コマンドを入力または検索…",
    quit: "終了",
    title: "コマンドパレット",
  },
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
  headerCard: {
    basedIn: "現在地",
    status: "只今コーディング中",
    workplace: "アクセンチュアに在職中",
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
  mediaPlayer: {
    close: "プレーヤーを閉じる",
    next: "次の曲",
    nowPlaying: "再生中",
    pause: "一時停止",
    play: "再生",
    previous: "前の曲",
    seek: "シーク",
    title: "メディアプレーヤー",
  },
  nav: {
    achievements: "実績",
    home: "ホーム",
    language: "言語",
    settings: "設定",
    timeline: "タイムライン",
  },
  settings: {
    actions: {
      cycleTheme: "テーマ切り替え",
      goAchievements: "実績へ移動",
      goHome: "ホームへ移動",
      goTimeline: "タイムラインへ移動",
      openCommandMenu: "コマンドメニューを開く",
      openMediaPlayer: "メディアプレーヤーを開く",
      toggleColumns: "列数の切り替え",
      toggleLanguage: "言語の切り替え",
      toggleSettings: "設定の切り替え",
      toggleTerminal: "ターミナルの切り替え",
    },
    currentLabel: "現在",
    description: "ショートカットを再設定できます。変更は自動保存されます。",
    errors: {
      duplicate: "この組み合わせは既に使われています。",
      empty: "このショートカットにキーを設定してください。",
      noModifier: "入力中の誤爆を防ぐため修飾キーを追加してください。",
    },
    keyLabel: "キー",
    resetToDefaults: "デフォルトに戻す",
    title: "キーボードショートカット",
  },
  terminal: {
    title: "ターミナル",
    viewCode: "このページのソースを見る",
  },
  theme: {
    dark: "ダークテーマ",
    label: "テーマ",
    light: "ライトテーマ",
    terminal: "ターミナルテーマ",
  },
  timeline: {
    current: "現在",
    entries: {
      kangaFlow:
        "現在のサイト。Next.js 16の静的書き出しで、3テーマ、型付きの英日i18n、実績、ライブ天気の日付ボックスを備える。",
      kangaWorks:
        "2023年版。プロジェクトをより大胆に見せるために作り直したサイト。",
      myPage: "素のJavaScriptで作り直した、初期の制作物をまとめたサイト。",
      personalPortfolio:
        "初めてのポートフォリオ。手書きの静的HTML・CSSページ。",
      portfolio:
        "多機能なNext.jsポートフォリオ。対話型ターミナル、ゲーム化した実績、WebGL背景を搭載。KangaFlowの直接の前身。",
    },
    heading: "タイムライン",
    subtitle: "これまで公開したポートフォリオを、古い順に。",
    viewSource: "ソースを見る",
    visitSite: "サイトを見る",
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
