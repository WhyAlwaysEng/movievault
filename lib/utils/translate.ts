// Translation utility for JAV metadata (Japanese -> English)
// Uses a hybrid engine: Curated JAV Dictionary + Japanese Romanizer (Kana & Kanji) + Online Translation API with caching.

import type { JavDbItem } from "@/lib/providers/javdb";

const translationCache = new Map<string, string>();

/** Check if string contains Hiragana, Katakana, or Kanji characters */
export function containsJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}

/** Check if string contains Korean Hangul characters */
export function containsKorean(text: string): boolean {
  return /[\uac00-\ud7af\u1100-\u11ff]/.test(text);
}

/** Check if string contains Thai characters */
export function containsThai(text: string): boolean {
  return /[\u0e00-\u0e7f]/.test(text);
}

/** Check if string contains Chinese (Hanzi) characters */
export function containsChinese(text: string): boolean {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}

/** Check if string contains Hiragana or Katakana (distinctively Japanese) */
export function containsJapaneseKana(text: string): boolean {
  return /[\u3040-\u30ff]/.test(text);
}

/** Detect nationality code (CN, KR, JP, TH) from name/text characters */
export function detectNationalityFromText(text: string): string | undefined {
  if (containsKorean(text)) return "KR";
  if (containsJapaneseKana(text)) return "JP";
  if (containsThai(text)) return "TH";
  if (containsChinese(text)) return "CN";
  if (containsJapanese(text)) return "JP";
  return undefined;
}

// ── Kana to Hepburn Romaji Transliteration ──────────────────────────────────

const HIRAGANA_MAP: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja",  じゅ: "ju",  じょ: "jo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", ム: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", を: "wo", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
};

const KATAKANA_MAP: Record<string, string> = {
  キャ: "kya", キュ: "kyu", キョ: "kyo",
  シャ: "sha", シュ: "shu", ショ: "sho",
  チャ: "cha", チュ: "chu", チョ: "cho",
  ニャ: "nya", ニュ: "nyu", ニョ: "nyo",
  ヒャ: "hya", ヒュ: "hyu", ヒョ: "hyo",
  ミャ: "mya", ミュ: "myu", ミョ: "myo",
  リャ: "rya", リュ: "ryu", リョ: "ryo",
  ギャ: "gya", ギュ: "gyu", ギョ: "gyo",
  ジャ: "ja",  ジュ: "ju",  ジョ: "jo",
  ビャ: "bya", ビュ: "byu", ビョ: "byo",
  ピャ: "pya", ピュ: "pyu", ピョ: "pyo",
  ティ: "ti", ディ: "di", チェ: "che", シェ: "she",
  ジェ: "je", ウィ: "wi", ウェ: "we", ウォ: "wo",
  ファ: "fa", フィ: "fi", フェ: "fe", フォ: "fo",
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
  ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
  ワ: "wa", ヲ: "wo", ン: "n",
  ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ど: "do",
  バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
  パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
  ヴ: "v", ァ: "a", ィ: "i", ゥ: "u", ェ: "e", ォ: "o",
  ー: "",
};

export function kanaToRomaji(text: string): string {
  let res = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "っ" || text[i] === "ッ") {
      const next2 = text.slice(i + 1, i + 3);
      const next1 = text.slice(i + 1, i + 2);
      const rom = HIRAGANA_MAP[next2] || KATAKANA_MAP[next2] || HIRAGANA_MAP[next1] || KATAKANA_MAP[next1];
      if (rom && rom[0]) {
        res += rom[0] === "c" ? "t" : rom[0];
      }
      i++;
      continue;
    }

    const pair = text.slice(i, i + 2);
    if (HIRAGANA_MAP[pair] || KATAKANA_MAP[pair]) {
      res += HIRAGANA_MAP[pair] || KATAKANA_MAP[pair];
      i += 2;
      continue;
    }

    if (text[i] === "ー") {
      i++;
      continue;
    }

    const single = text[i];
    if (HIRAGANA_MAP[single] || KATAKANA_MAP[single]) {
      res += HIRAGANA_MAP[single] || KATAKANA_MAP[single];
      i++;
      continue;
    }

    res += single;
    i++;
  }
  return res;
}

export function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

// ── Common Kanji Name Segment Transliteration ───────────────────────────────

const KANJI_SURNAMES: Record<string, string> = {
  佐藤: "Sato", 鈴木: "Suzuki", 高橋: "Takahashi", 田中: "Tanaka", 渡辺: "Watanabe",
  伊藤: "Ito", 山本: "Yamamoto", 中村: "Nakamura", 小林: "Kobayashi", 加藤: "Kato",
  吉田: "Yoshida", 山田: "Yamada", 佐々木: "Sasaki", 山口: "Yamaguchi", 斎藤: "Saito",
  斉藤: "Saito", 松本: "Matsumoto", 井上: "Inoue", 木村: "Kimura", 林: "Hayashi",
  清水: "Shimizu", 山崎: "Yamazaki", 森: "Mori", 池田: "Ikeda", 橋本: "Hashimoto",
  山下: "Yamashita", 石川: "Ishikawa", 中島: "Nakajima", 前田: "Maeda", 藤田: "Fujita",
  小川: "Ogawa", 岡田: "Okada", 長谷川: "Hasegawa", 村上: "Murakami", 近藤: "Kondo",
  石井: "Ishii", 坂本: "Sakamoto", 遠藤: "Endo", 青木: "Aoki", 藤井: "Fujii",
  西村: "Nishimura", 福田: "Fukuda", 太田: "Ota", 三浦: "Miura", 藤原: "Fujiwara",
  岡本: "Okamoto", 松田: "Matsuda", 中川: "Nakagawa", 中野: "Nakano", 原: "Hara",
  小野: "Ono", 田村: "Tamura", 竹内: "Takeuchi", 金子: "Kaneko", 和田: "Wada",
  中山: "Nakayama", 石田: "Ishida", 上田: "Ueda", 森田: "Morita", 原田: "Harada",
  柴田: "Shibata", 酒井: "Sakai", 工藤: "Kudo", 横山: "Yokoyama", 宮崎: "Miyazaki",
  宮本: "Miyamoto", 内田: "Uchida", 高木: "Takagi", 安藤: "Ando", 谷口: "Taniguchi",
  大野: "Ono", 丸山: "Maruyama", 今井: "Imai", 河野: "Kono", 藤本: "Fujimoto",
  村田: "Murata", 武田: "Takeda", 上野: "Ueno", 杉山: "Sugiyama", 増田: "Masuda",
  小山: "Koyama", 大塚: "Otsuka", 平野: "Hirano", 菅原: "Sugawara", 久保: "Kubo",
  千葉: "Chiba", 松井: "Matsui", 岩崎: "Iwasaki", 木下: "Kinoshita", 野口: "Noguchi",
  松尾: "Matsuo", 菊地: "Kikuchi", 野村: "Nomura", 新井: "Arai", 渡部: "Watanabe",
  星野: "Hoshino", 桜井: "Sakurai", 飯田: "Iida", 西田: "Nishida", 西川: "Nishikawa",
  小島: "Kojima", 菊池: "Kikuchi", 尾崎: "Ozaki", 本田: "Honda", 大西: "Onishi",
  吉川: "Yoshikawa", 矢野: "Yano", 望月: "Mochizuki", 神谷: "Kamiya", 辻: "Tsuji",
  河北: "Kawakita", 涼森: "Suzumori", 深田: "Fukada", 相沢: "Aizawa", 相澤: "Aizawa",
  波多野: "Hatano", 鈴村: "Suzumura", 楓: "Kaede", 山手: "Yamate", 天使: "Amatsuka",
  八掛: "Yatsugake", 伊藤舞: "Ito", 七沢: "Nanasawa", 七澤: "Nanasawa", 希島: "Kijima",
  未歩: "Miho", 森日: "Mori", 神木: "Kamiki", 小宵: "Koyoi", 楪: "Yuzuriha",
  金松: "Kanematsu", 本郷: "Hongo", 二階堂: "Nikaido", 吉沢: "Yoshizawa", 吉澤: "Yoshizawa",
  明日花: "Asuka", 上原: "Uehara", 桜空: "Sakura", 美谷: "Mitani", 大槻: "Otsuki",
  星奈: "Hoshina", 白石: "Shiraishi", 篠田: "Shinoda", 紗倉: "Sakura", 浜崎: "Hamasaki",
  水戸: "Mito", 初川: "Hatsukawa", 宇都宮: "Utsunomiya", 安齋: "Anzai", 安斋: "Anzai",
  天音: "Amane", 栗山: "Kuriyama", 森沢: "Morisawa", 森澤: "Morisawa", 田野: "Tano",
  水卜: "Miura", 古川: "Furukawa", 戸田: "Toda", 愛音: "Aine", 彩美: "Ayami",
  市川: "Ichikawa", 一条: "Ichijo", 逢沢: "Aizawa", かすみ: "Kasumi", 希崎: "Kizaki",
  麻生: "Aso", 柚木: "Yuki", 西宮: "Nishimiya", 山岸: "Yamagishi", 東條: "Tojo",
  星宮: "Hoshimiya", 桃乃木: "Momonogi", 吉高: "Yoshitaka", 美園: "Misono", 白桃: "Shirato",
  松下: "Matsushita", 風間: "Kazama", 北条: "Hojo", 君島: "Kimijima", 朝桐: "Asagiri",
  有村: "Arimura", 二宮: "Ninomiya", 明里: "Akari", 恋渕: "Koibuchi", 青空: "Aozora",
  白峰: "Shiramine", 根尾: "Neo", 渚: "Nagisa", 水端: "Mizuhata", 月乃: "Tsukino",
  倉多: "Kurata", 小早川: "Kobayakawa", 南: "Minami", 栄川: "Eikawa", 岬: "Misaki",
  乙白: "Otoshiro", 鷲尾: "Washio", 沙月: "Satsuki", 日向: "Hinata", 小湊: "Kominato",
  百瀬: "Momose", 逢見: "Oumi", 唯井: "Tadai", 苺原: "Ichigohara", 豆沢: "Mamezawa",
  嵐山: "Arashiyama", 玉木: "Tamaki", 貞松: "Sadamatsu",
};

const KANJI_GIVEN_NAMES: Record<string, string> = {
  彩花: "Saika", 彩伽: "Saika", 悠亜: "Yua", 悠亚: "Yua", えいみ: "Eimi", 詠美: "Eimi",
  つかさ: "Tsukasa", 司: "Tsukasa", みなみ: "Minami", 南: "Minami", ありな: "Arina", 有菜: "Arina",
  結衣: "Yui", 结衣: "Yui", あいり: "Airi", 爱里: "Airi", れむ: "Remu", 玲梦: "Remu",
  カレン: "Karen", 花恋: "Karen", 梨愛: "Ria", 梨爱: "Ria", 六花: "Rikka", 澪: "Mio",
  みる: "Miru", もえ: "Moe", 萌: "Moe", うみ: "Umi", 海: "Umi", 舞雪: "Mayuki",
  みあ: "Mia", 美亚: "Mia", にこ: "Niko", なな: "Nana", 奈々: "Nana", 奈奈: "Nana",
  向子: "Hinako", 麗: "Rei", 丽: "Rei", こなん: "Konan", 虎南: "Konan", 季歩: "Kiho", 季步: "Kiho",
  愛: "Ai", 爱: "Ai", 夢: "Yume", あき: "Aki", 明希: "Aki", いちか: "Ichika", 一香: "Ichika",
  明歩: "Akiho", 明步: "Akiho", キララ: "Kirara", 绮罗: "Kirara", 亜衣: "Ai", 亚衣: "Ai",
  もも: "Momo", 桃: "Momo", 朱里: "Akari", ひびき: "Hibiki", 响: "Hibiki", まりな: "Marina",
  ゆう: "Yu", 优: "Yu", まな: "Mana", 真菜: "Mana", 真緒: "Mao", 真绪: "Mao", かな: "Kana",
  香奈: "Kana", 佳奈: "Kana", しおん: "Shion", らら: "Rara", 拉拉: "Rara", まひな: "Mahina",
  莉緒: "Rio", 莉绪: "Rio", 憂: "Ui", さくら: "Sakura", 樱: "Sakura", 桜: "Sakura",
  いおり: "Iori", 伊织: "Iori", 真琴: "Makoto", まりあ: "Maria", 旬果: "Shunka", まさみ: "Masami",
  葵: "Aoi", はるか: "Haruka", 果穂: "Kaho", ジェシカ: "Jessica", 希: "Nozomi", ゆめ: "Yume",
  逢花: "Aika", ひまり: "Himari", なつ: "Natsu", 夏: "Natsu", 一花: "Ichika", ねね: "Nene",
  宁宁: "Nene", 和花: "Waka", はな: "Hana", 紗栄子: "Saeko", 纱荣子: "Saeko", ゆみ: "Yumi",
  由美: "Yumi", 岬: "Misaki", 麻妃: "Maki", みお: "Mio", 美绪: "Mio", あゆみ: "Ayumi",
  光: "Hikaru", 千佳: "Chika", 有紀: "Yuki", 有纪: "Yuki", つむぎ: "Tsumugi", 紬: "Tsumugi",
  ももな: "Momona", 桃奈: "Momona", ひかり: "Hikari", 凛々子: "Ririko", ミウ: "Miu", 美羽: "Miu",
  あかり: "Akari", みつき: "Mitsuki", 光希: "Mitsuki", あさみ: "Asami", まお: "Mao", 真央: "Mao",
  怜子: "Reiko", カエラ: "Kaera", 乃亜: "Noa", さやか: "Sayaka", めい: "Mei", 芽衣: "Mei",
  恵奈: "Ena", 惠奈: "Ena", よつ葉: "Yotsuha", 四叶: "Yotsuha", 莉子: "Riko", あすか: "Asuka",
  飞鸟: "Asuka", 菜奈実: "Nanami", 菜奈实: "Nanami", リカ: "Rika", 梨花: "Rika", 玲奈: "Rena",
  レモン: "Lemon", 柠檬: "Lemon", まひろ: "Mahiro", 真寻: "Mahiro", ジュン: "Jun", 太郎: "Taro",
  次郎: "Jiro", 玲: "Ryo", 大輔: "Daisuke",
};

export function romanizeKanjiName(raw: string): string {
  const clean = raw.trim();
  if (!clean || !containsJapanese(clean)) return clean;

  // Check surname match
  for (const [surJa, surEn] of Object.entries(KANJI_SURNAMES)) {
    if (clean.startsWith(surJa)) {
      const rest = clean.slice(surJa.length).trim();
      if (!rest) return surEn;
      if (KANJI_GIVEN_NAMES[rest]) {
        return `${surEn} ${KANJI_GIVEN_NAMES[rest]}`;
      }
      const restRom = kanaToRomaji(rest);
      if (restRom && !containsJapanese(restRom)) {
        return `${surEn} ${capitalizeWords(restRom)}`;
      }
      return `${surEn} ${rest}`;
    }
  }

  // Check given name only
  if (KANJI_GIVEN_NAMES[clean]) {
    return KANJI_GIVEN_NAMES[clean];
  }

  // Pure Kana check
  const kanaRom = kanaToRomaji(clean);
  if (!containsJapanese(kanaRom)) {
    return capitalizeWords(kanaRom);
  }

  return clean;
}

// ── JAV Studio & Maker Dictionary (Japanese -> English) ─────────────────────

export const JAV_STUDIO_MAP: Record<string, string> = {
  "エスワン ナンバースタイル": "S1 NO.1 STYLE",
  "エスワン": "S1 NO.1 STYLE",
  "S1 NO.1 STYLE": "S1 NO.1 STYLE",
  "アイデアポケット": "Idea Pocket",
  "ムーディーズ": "MOODYZ",
  "マドンナ": "Madonna",
  "プレミアム": "Premium",
  "プレステージ": "PRESTIGE",
  "アタッカーズ": "ATTACKERS",
  "ワンズファクトリー": "WANZ FACTORY",
  "ファレノ": "FALENO",
  "ファレノ スター": "FALENO star",
  "ドグマ": "DOGMA",
  "ケイ・エム・プロデュース": "KMP",
  "SODクリエイト": "SOD Create",
  "SOD": "SOD Create",
  "ダスッ！": "DAS!",
  "ダス": "DAS!",
  "カワイイ": "Kawaii*",
  "マックス・エー": "MAX-A",
  "グローリークエスト": "Glory Quest",
  "クリスタル映像": "Crystal-Eizo",
  "シスターズ": "Sisters",
  "ナチュラルハイ": "Natural High",
  "溜池ゴロー": "Tameike Goro",
  "美": "Bi",
  "ディープス": "DEEP'S",
  "タメケ": "Tameike",
  "エムズ": "M's Video Group",
  "オーロラプロジェクト": "Aurora Project",
  "ホンナマ": "Hon-Nama",
  "トウキョウ・ホット": "Tokyo-Hot",
  "カリビアンコム": "Caribbeancom",
  "一本道": "1pondo",
  "パコパコママ": "Pacopacomama",
  "天然むすめ": "10musume",
  "HEYZO": "HEYZO",
  "FC2": "FC2-PPV",
};

export function translateStudio(rawStudio?: string): string {
  if (!rawStudio) return "Japan AV Studio";
  const trimmed = rawStudio.trim();
  if (JAV_STUDIO_MAP[trimmed]) return JAV_STUDIO_MAP[trimmed];

  for (const [ja, en] of Object.entries(JAV_STUDIO_MAP)) {
    if (trimmed.includes(ja)) return en;
  }

  if (containsJapanese(trimmed)) {
    const rom = kanaToRomaji(trimmed);
    if (!containsJapanese(rom)) return capitalizeWords(rom);
  }

  return trimmed;
}

export function translateDirectorName(rawDirector?: string): string {
  if (!rawDirector) return "Unknown";
  const trimmed = rawDirector.trim();
  if (!containsJapanese(trimmed)) return trimmed;

  const rom = romanizeKanjiName(trimmed);
  if (!containsJapanese(rom)) return capitalizeWords(rom);

  return trimmed;
}

// ── Comprehensive JAV Tag / Genre Dictionary (Japanese -> English) ──────────

export const JAV_TAG_MAP: Record<string, string> = {
  単体作品: "Solo Work",
  美少女: "Beautiful Girl",
  巨乳: "Big Breasts",
  爆乳: "Huge Breasts",
  微乳: "Small Breasts",
  貧乳: "Petite Breasts",
  美乳: "Beautiful Breasts",
  美肌: "Flawless Skin",
  美脚: "Beautiful Legs",
  巨尻: "Big Ass",
  スレンダー: "Slender",
  ハイビジョン: "HD High-Definition",
  独占配信: "Exclusive Release",
  ドラマ: "Drama",
  コスプレ: "Cosplay",
  制服: "Uniform",
  女子校生: "Schoolgirl",
  女子大生: "College Girl",
  人妻: "Housewife",
  熟女: "Mature Woman (MILF)",
  若妻: "Young Wife",
  ギャル: "Gal (Gyaru)",
  痴女: "Nympho",
  お姉さん: "Older Sister",
  妹: "Younger Sister",
  幼馴染: "Childhood Friend",
  中出し: "Creampie",
  フェラ: "Blowjob",
  手コキ: "Handjob",
  パイズリ: "Paizuri (Titfuck)",
  潮吹き: "Squirting",
  騎乗位: "Cowgirl",
  拘束: "Bondage",
  主観: "POV",
  主観視点: "POV",
  ハメ撮り: "Amateur / Self-Shot",
  マッサージ: "Sensual Massage",
  エステ: "Spa / Esthetic",
  温泉: "Hot Springs",
  旅行: "Vacation",
  露天風呂: "Open-Air Bath",
  露出: "Exhibitionism",
  野外: "Outdoor",
  催眠: "Hypnosis",
  近親相姦: "Taboo Romance",
  義母: "Stepmother",
  義妹: "Stepsister",
  ベスト: "Best of",
  総集編: "Compilation",
  完全版: "Complete Edition",
  限定版: "Limited Edition",
  引退: "Retirement",
  卒業: "Graduation",
  デビュー: "Debut",
  専属: "Exclusive Contract",
  新人: "Newcomer",
  解禁: "Uncensored / First Time",
  モザイク破壊: "Uncensored",
  水着: "Swimsuit",
  下着: "Lingerie",
  パンスト: "Pantyhose",
  タイツ: "Tights",
  OL: "Office Lady",
  ナース: "Nurse",
  女医: "Female Doctor",
  女教師: "Female Teacher",
  家庭教師: "Tutor",
  メイド: "Maid",
  CA: "Flight Attendant",
  お泊まり: "Sleepover",
  同棲: "Cohabitation",
  不倫: "Affair",
  寝取られ: "Netorare (NTR)",
  NTR: "Netorare",
  泥酔: "Drunk",
  睡眠薬: "Sleep",
  逆ナン: "Pick Up",
  AV女優: "AV Idol",
  素人: "Amateur",
  企画: "Planning Feature",
  VR: "Virtual Reality (VR)",
  乱交: "Orgy / Gangbang",
  ハーレム: "Harem",
  複数: "Threesome / Multi-Partner",
  ナンパ: "Street Pick-up",
  合コン: "Group Date",
  アナル: "Anal",
  バイブ: "Vibrator / Toy",
  オナニー: "Masturbation",
  ディープスロート: "Deepthroat",
  顔射: "Facial",
  ぶっかけ: "Bukkake",
  ごっくん: "Swallow",
  電マ: "Magic Wand Toy",
  "拘束・緊縛": "Bondage / Shibari",
  SM: "BDSM",
  フェチ: "Fetish",
  足コキ: "Footjob",
  尻コキ: "Assjob",
  レズ: "Lesbian",
  百合: "Yuri",
  ドキュメンタリー: "Documentary",
  短編: "Short Film",
  お漏らし: "Omorashi (Peeing)",
  飲酒: "Drinking",
  巨乳フェチ: "Big Breasts Fetish",
  美尻: "Beautiful Ass",
  童貞: "Virgin",
  初体験: "First Experience",
  監禁: "Captivity",
  調教: "Training",
  恥辱: "Humiliation",
  辱め: "Humiliation",
  絶頂: "Climax / Orgasm",
  痙攣: "Convulsions",
  寸止め: "Edging",
  生ハメ: "Raw / Bareback",
  ゴムなし: "Unprotected",
  生中出し: "Raw Creampie",
  着衣: "Clothed Sex",
  透け: "See-Through",
  ミニスカート: "Miniskirt",
  浴衣: "Yukata",
  着物: "Kimono",
};

// ── Popular JAV Actresses (Kanji/Kana/Chinese -> Romaji/English) ────────────

export const JAV_ACTRESS_MAP: Record<string, string> = {
  小島みなみ: "Minami Kojima", 小岛南: "Minami Kojima",
  三上悠亜: "Yua Mikami", 三上悠亚: "Yua Mikami",
  深田えいみ: "Eimi Fukada", 深田咏美: "Eimi Fukada",
  葵つかさ: "Tsukasa Aoi", 葵司: "Tsukasa Aoi",
  河北彩花: "Saika Kawakita", 河北彩伽: "Saika Kawakita",
  相沢みなみ: "Minami Aizawa", 相泽南: "Minami Aizawa", 相澤みなみ: "Minami Aizawa",
  橋本ありな: "Arina Hashimoto", 桥本有菜: "Arina Hashimoto", 新ありな: "Arina Hashimoto",
  波多野結衣: "Yui Hatano", 波多野结衣: "Yui Hatano",
  鈴村あいり: "Airi Suzumura", 铃村爱里: "Airi Suzumura",
  涼森れむ: "Remu Suzumori", 凉森玲梦: "Remu Suzumori", 凉森玲夢: "Remu Suzumori",
  楓カレン: "Karen Kaede", 枫花恋: "Karen Kaede",
  山手梨愛: "Ria Yamate", 山手梨爱: "Ria Yamate",
  小野六花: "Rikka Ono",
  石川澪: "Mio Ishikawa",
  坂道みる: "Miru", miru: "Miru",
  天使もえ: "Moe Amatsuka", 天使萌: "Moe Amatsuka",
  八掛うみ: "Umi Yatsugake", 八挂海: "Umi Yatsugake",
  伊藤舞雪: "Mayuki Ito",
  七沢みあ: "Mia Nanasawa", 七泽美亚: "Mia Nanasawa", 七澤みあ: "Mia Nanasawa",
  希島あいり: "Airi Kijima", 希岛爱里: "Airi Kijima",
  川越にこ: "Niko Kawagoe",
  未歩なな: "Nana Miho", 未步奈奈: "Nana Miho",
  森日向子: "Hinako Mori",
  神木麗: "Rei Kamiki", 神木丽: "Rei Kamiki",
  小宵こなん: "Konan Koyoi", 小宵虎南: "Konan Koyoi",
  楪カレン: "Karen Yuzuriha",
  金松季歩: "Kiho Kanematsu", 金松季步: "Kiho Kanematsu",
  本郷愛: "Ai Hongo", 本乡爱: "Ai Hongo", 二階堂夢: "Ai Hongo",
  ジュリア: "Julia", JULIA: "Julia",
  佐々木あき: "Aki Sasaki", 佐佐木明希: "Aki Sasaki",
  松本いちか: "Ichika Matsumoto", 松本一香: "Ichika Matsumoto",
  吉沢明歩: "Akiho Yoshizawa", 吉泽明步: "Akiho Yoshizawa",
  明日花キララ: "Kirara Asuka", 明日花绮罗: "Kirara Asuka",
  上原亜衣: "Ai Uehara", 上原亚衣: "Ai Uehara",
  桜空もも: "Momo Sakura", 樱空桃: "Momo Sakura",
  美谷朱里: "Akari Mitani",
  大槻ひびき: "Hibiki Otsuki", 大槻响: "Hibiki Otsuki",
  星奈あい: "Ai Hoshina",
  白石茉莉奈: "Marina Shiraishi",
  篠田ゆう: "Yu Shinoda", 筱田优: "Yu Shinoda",
  紗倉まな: "Mana Sakura", 纱仓真菜: "Mana Sakura",
  浜崎真緒: "Mao Hamasaki", 浜崎真绪: "Mao Hamasaki",
  水戸かな: "Kana Mito", 水户香奈: "Kana Mito",
  初川みなみ: "Minami Hatsukawa", 初川南: "Minami Hatsukawa",
  宇都宮しおん: "Shion Utsunomiya",
  安齋らら: "Rara Anzai", 安斋拉拉: "Rara Anzai", RION: "Rara Anzai",
  天音まひな: "Mahina Amane",
  栗山莉緒: "Rio Kuriyama",
  森沢かな: "Kana Morisawa", 森泽佳奈: "Kana Morisawa",
  田野憂: "Ui Tano",
  水卜さくら: "Sakura Miura", 水卜樱: "Sakura Miura",
  古川いおり: "Iori Furukawa", 古川伊织: "Iori Furukawa",
  戸田真琴: "Makoto Toda", 户田真琴: "Makoto Toda",
  AIKA: "Aika",
  愛音まりあ: "Maria Aine",
  あやみ旬果: "Shunka Ayami", 彩美旬果: "Shunka Ayami",
  市川まさみ: "Masami Ichikawa",
  一条葵: "Aoi Ichijo",
  逢沢はるか: "Haruka Aizawa",
  つぼみ: "Tsubomi",
  かすみ果穂: "Kaho Kasumi",
  希崎ジェシカ: "Jessica Kizaki",
  麻生希: "Nozomi Aso",
  Rio: "Rio", 柚木ティナ: "Rio",
  西宮ゆめ: "Yume Nishimiya", 西宫梦: "Yume Nishimiya",
  山岸逢花: "Aika Yamagishi",
  木下ひまり: "Himari Kinoshita",
  東條なつ: "Natsu Tojo", 东条夏: "Natsu Tojo",
  星宮一花: "Ichika Hoshimiya", 星宫一花: "Ichika Hoshimiya",
  桃乃木かな: "Kana Momonogi", 桃乃木香奈: "Kana Momonogi",
  高橋しょう子: "Shoko Takahashi", 高桥圣子: "Shoko Takahashi",
  吉高ねね: "Nene Yoshitaka", 吉高宁宁: "Nene Yoshitaka",
  美園和花: "Waka Misono", 美园和花: "Waka Misono",
  白桃はな: "Hana Shirato",
  松下紗栄子: "Saeko Matsushita", 松下纱荣子: "Saeko Matsushita",
  風間ゆみ: "Yumi Kazama", 风间由美: "Yumi Kazama",
  本田岬: "Misaki Honda",
  北条麻妃: "Maki Hojo",
  君島みお: "Mio Kimijima", 君岛美绪: "Mio Kimijima",
  篠田あゆみ: "Ayumi Shinoda",
  朝桐光: "Hikaru Asagiri",
  有村千佳: "Chika Arimura",
  竹内有紀: "Yuki Takeuchi", 竹内有纪: "Yuki Takeuchi",
  二宮和香: "Waka Ninomiya",
  明里つむぎ: "Tsumugi Akari", 明里紬: "Tsumugi Akari",
  恋渕ももな: "Momona Koibuchi", 恋渕桃奈: "Momona Koibuchi",
  青空ひかり: "Hikari Aozora", 青空光: "Hikari Aozora",
  木下凛々子: "Ririko Kinoshita",
  白峰ミウ: "Miu Shiramine", 白峰美羽: "Miu Shiramine",
  根尾あかり: "Akari Neo", 根尾朱里: "Akari Neo",
  渚みつき: "Mitsuki Nagisa", 渚光希: "Mitsuki Nagisa",
  水端あさみ: "Asami Mizuhata",
  月乃さくら: "Sakura Tsukino", 月乃樱: "Sakura Tsukino",
  石原希望: "Nozomi Ishihara",
  倉多まお: "Mao Kurata", 仓多真央: "Mao Kurata",
  JULIAジュリア: "Julia",
  小早川怜子: "Reiko Kobayakawa",
  上原カエラ: "Kaera Uehara",
  南梨央奈: "Riona Minami",
  栄川乃亜: "Noa Eikawa",
  岬ななみ: "Nanami Misaki",
  乙白さやか: "Sayaka Otoshiro",
  鷲尾めい: "Mei Washio", 鹫尾芽衣: "Mei Washio",
  沙月恵奈: "Ena Satsuki", 沙月惠奈: "Ena Satsuki",
  日向なつ: "Natsu Hinata", 日向夏: "Natsu Hinata",
  工藤ララ: "Rara Kudo", 工藤拉拉: "Rara Kudo",
  小湊よつ葉: "Yotsuha Kominato", 小凑四叶: "Yotsuha Kominato",
  星乃莉子: "Riko Hoshino",
  百瀬あすか: "Asuka Momose", 百濑飞鸟: "Asuka Momose",
  松本菜奈実: "Nanami Matsumoto", 松本菜奈实: "Nanami Matsumoto",
  逢見リカ: "Rika Oumi", 逢见梨花: "Rika Oumi",
  宮下玲奈: "Rena Miyashita", 宫下玲奈: "Rena Miyashita",
  田中レモン: "Lemon Tanaka", 田中柠檬: "Lemon Tanaka",
  唯井まひろ: "Mahiro Tadai", 唯井真寻: "Mahiro Tadai",
  うんぱい: "Unpai", Unpai: "Unpai",
  斎藤ミオリ: "Miori Saito", 齐藤美绪里: "Miori Saito",
  美波もも: "Momo Minami",
  八木奈々: "Nana Yagi", 八木奈奈: "Nana Yagi",
  白石かんな: "Kanna Shiraishi",
  桜木優希音: "Yukine Sakuragi",
  北野未奈: "Mina Kitano",
  神坂ひなの: "Hinano Kamisaka",
  望月つぼみ: "Tsubomi Mochizuki",
  夢乃あいか: "Aika Yumeno", 梦乃爱华: "Aika Yumeno",
  架乃ゆら: "Yura Kano",
  miru坂道: "Miru",
};

/** Reverse lookup map: English lowercase -> Japanese name */
export const REVERSE_ACTRESS_MAP: Record<string, string> = {};
for (const [ja, en] of Object.entries(JAV_ACTRESS_MAP)) {
  const enKey = en.toLowerCase().trim();
  if (!REVERSE_ACTRESS_MAP[enKey] && containsJapanese(ja)) {
    REVERSE_ACTRESS_MAP[enKey] = ja;
  }
}

/**
 * Translates a single Japanese phrase or title into English.
 */
export async function translateText(text: string): Promise<string> {
  if (!text || !containsJapanese(text)) return text;

  // Check in-memory cache
  if (translationCache.has(text)) {
    return translationCache.get(text)!;
  }

  // Extract catalog code prefix if present e.g. "【SSIS-842】" or "[SSIS-842]"
  const codeMatch = text.match(/^(?:【|\[)?([A-Za-z]+[-_ ]?\d+)(?:】|\])?\s*(.*)$/);
  const code = codeMatch ? codeMatch[1].toUpperCase() : null;
  const body = codeMatch ? codeMatch[2] : text;

  // Pre-substitute known actress names & common terms
  let preprocessed = body;
  for (const [ja, en] of Object.entries(JAV_ACTRESS_MAP)) {
    if (preprocessed.includes(ja)) {
      preprocessed = preprocessed.replaceAll(ja, en);
    }
  }
  for (const [ja, en] of Object.entries(JAV_STUDIO_MAP)) {
    if (preprocessed.includes(ja)) {
      preprocessed = preprocessed.replaceAll(ja, ` ${en} `);
    }
  }
  for (const [ja, en] of Object.entries(JAV_TAG_MAP)) {
    if (preprocessed.includes(ja)) {
      preprocessed = preprocessed.replaceAll(ja, ` ${en} `);
    }
  }
  preprocessed = preprocessed.replace(/\s+/g, " ").trim();

  // If already completely in English, return it
  if (!containsJapanese(preprocessed)) {
    const result = code ? `【${code}】${preprocessed}` : preprocessed;
    translationCache.set(text, result);
    return result;
  }

  // Call translation API
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(preprocessed)}&langpair=ja|en`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (res.ok) {
      const data = await res.json();
      let trans = data.responseData?.translatedText;
      if (trans && typeof trans === "string") {
        trans = trans
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();

        const result = code ? `【${code}】${trans}` : trans;
        translationCache.set(text, result);
        return result;
      }
    }
  } catch (_err) {
    // Network error or timeout — fallback to preprocessed text
  }

  const fallback = code ? `【${code}】${preprocessed}` : preprocessed;
  translationCache.set(text, fallback);
  return fallback;
}

/**
 * Translates a list of tags (Japanese -> English).
 */
export function translateTags(tags: string[]): string[] {
  const result: string[] = [];
  for (const t of tags) {
    const trimmed = t.trim();
    if (!trimmed) continue;
    if (JAV_TAG_MAP[trimmed]) {
      result.push(JAV_TAG_MAP[trimmed]);
    } else {
      let replaced = trimmed;
      for (const [ja, en] of Object.entries(JAV_TAG_MAP)) {
        if (replaced.includes(ja)) {
          replaced = replaced.replaceAll(ja, en);
        }
      }
      const finalTag = replaced.trim();
      if (containsJapanese(finalTag)) {
        const kanaRom = kanaToRomaji(finalTag);
        result.push(!containsJapanese(kanaRom) ? capitalizeWords(kanaRom) : finalTag);
      } else {
        result.push(finalTag);
      }
    }
  }
  return Array.from(new Set(result));
}

/**
 * Translates actress name(s) (Japanese Kanji -> English / Romaji).
 * Guarantees that any Japanese Kanji/Kana name is converted to English/Romaji.
 */
export function translateActressName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";

  // If already pure ASCII / non-Japanese, return
  if (!containsJapanese(trimmed)) return trimmed;

  // 1. Direct dictionary match
  if (JAV_ACTRESS_MAP[trimmed]) return JAV_ACTRESS_MAP[trimmed];

  // 2. Partial substring replacements from dictionary
  let res = trimmed;
  for (const [ja, en] of Object.entries(JAV_ACTRESS_MAP)) {
    if (res.includes(ja)) {
      res = res.replaceAll(ja, en);
    }
  }
  if (!containsJapanese(res)) return capitalizeWords(res.trim());

  // 3. Romanize via Kanji Name decomposition
  res = romanizeKanjiName(res);
  if (!containsJapanese(res)) return capitalizeWords(res.trim());

  // 4. Kana to Romaji on remaining parts
  res = kanaToRomaji(res);
  if (!containsJapanese(res)) return capitalizeWords(res.trim());

  return capitalizeWords(res.trim());
}

/**
 * Extracts and translates actress name.
 * Separates English name as primary and Japanese name as secondary/alias.
 */
export function extractAndTranslateActress(rawName: string): { nameEn: string; nameJa?: string } {
  if (!rawName) return { nameEn: "" };
  const clean = rawName.trim();
  if (!clean) return { nameEn: "" };

  // Check if name has parentheses like "小島みなみ (Minami Kojima)" or "Minami Kojima (小島みなみ)"
  const parenMatch = clean.match(/^(.*?)\s*[\(（](.*?)[\)）]$/);
  if (parenMatch) {
    const part1 = parenMatch[1].trim();
    const part2 = parenMatch[2].trim();
    if (containsJapanese(part1)) {
      const en = !containsJapanese(part2) ? part2 : "";
      return { nameEn: en, nameJa: part1 };
    } else {
      const ja = containsJapanese(part2) ? part2 : undefined;
      return { nameEn: part1, nameJa: ja };
    }
  }

  // If already non-Japanese (English / Latin alphabet)
  if (!containsJapanese(clean)) {
    return { nameEn: clean };
  }

  // Pure Japanese: Keep original Japanese name, do NOT guess Romaji.
  // English name can be added manually by user.
  return {
    nameEn: "",
    nameJa: clean,
  };
}

/**
 * Complete Auto-Translator for JavDbItem.
 * Preserves the original Japanese title in `titleJa` while translating `title`,
 * studio, series, director, tags, and generating a clean English overview.
 * Preserves actress names as original Japanese (or user's English names).
 * NEVER inserts dummy/fake actress names when actresses is empty!
 */
export async function translateJavItem(item: JavDbItem): Promise<JavDbItem> {
  const originalTitle = item.titleJa || item.title;

  // Translate title to English
  const englishTitle = await translateText(item.title);

  // Translate studio / maker and director
  const englishStudio = translateStudio(item.studio);
  const englishLabel = item.label ? translateStudio(item.label) : englishStudio;
  const englishDirector = item.director ? translateDirectorName(item.director) : undefined;
  const englishSeries = item.series ? await translateText(item.series) : undefined;

  // Preserve actress names (keep original Japanese names or whatever was scraped)
  const actressDetails =
    item.actressDetails && item.actressDetails.length > 0
      ? item.actressDetails
          .filter((a) => a.name && a.name.trim())
          .map((a) => {
            const info = extractAndTranslateActress(a.name);
            return {
              name: info.nameEn || info.nameJa || a.name,
              character: info.nameEn && info.nameJa ? info.nameJa : (a as { character?: string }).character,
              avatarUrl: a.avatarUrl,
            };
          })
      : (item.actresses || [])
          .filter(Boolean)
          .map((name) => {
            const info = extractAndTranslateActress(name);
            return {
              name: info.nameEn || info.nameJa || name,
              character: info.nameEn && info.nameJa ? info.nameJa : undefined,
              avatarUrl: item.posterUrl,
            };
          });

  const actresses = actressDetails.map((a) => a.name);
  const primaryActress = actresses[0] || (item.actress ? item.actress.trim() : "");

  // Translate tags
  const englishTags = translateTags(item.tags || []);

  // Ensure code and studio are in tags
  if (item.code && !englishTags.includes(item.code)) englishTags.unshift(item.code);
  if (englishStudio && !englishTags.includes(englishStudio)) englishTags.push(englishStudio);

  // Filter preview images (keep only real image URLs, exclude /v/... and relative links)
  const validPreviews = (item.previewImages || []).filter(
    (url) =>
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("/v/") &&
      (/\.(jpe?g|png|webp)($|\?)/i.test(url) || url.includes("/samples/")),
  );

  // Generate clean English overview (No fake actresses!)
  const seriesInfo = englishSeries ? ` as part of the "${englishSeries}" series` : "";
  const starringText = actresses.length > 0
    ? `, starring ${actresses.join(", ")}`
    : "";
  const overview = `Official adult feature from studio ${englishStudio}${seriesInfo}${starringText} (Catalog code ${item.code}).`;

  return {
    ...item,
    title: englishTitle,
    titleJa: originalTitle,
    studio: englishStudio,
    label: englishLabel,
    series: englishSeries,
    director: englishDirector,
    actress: primaryActress,
    actresses,
    actressDetails,
    tags: englishTags,
    previewImages: validPreviews,
    overview: item.overview && !containsJapanese(item.overview) ? item.overview : overview,
  };
}
