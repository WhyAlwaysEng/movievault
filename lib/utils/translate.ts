// Translation utility for JAV metadata (Japanese -> English)
// Uses a hybrid engine: Curated JAV Dictionary + Online MyMemory Translation API with caching.

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

/** Detect nationality code (KR, JP, TH) from name/text characters */
export function detectNationalityFromText(text: string): string | undefined {
  if (containsKorean(text)) return "KR";
  if (containsJapanese(text)) return "JP";
  if (containsThai(text)) return "TH";
  return undefined;
}

/** Comprehensive JAV Tag / Genre Dictionary (Japanese -> English) */
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
};

/** Popular JAV Actresses (Kanji/Kana/Chinese -> Romaji/English) */
export const JAV_ACTRESS_MAP: Record<string, string> = {
  小島みなみ: "Minami Kojima",
  小岛南: "Minami Kojima",
  三上悠亜: "Yua Mikami",
  三上悠亚: "Yua Mikami",
  深田えいみ: "Eimi Fukada",
  深田咏美: "Eimi Fukada",
  葵つかさ: "Tsukasa Aoi",
  葵司: "Tsukasa Aoi",
  河北彩花: "Saika Kawakita",
  河北彩伽: "Saika Kawakita",
  相沢みなみ: "Minami Aizawa",
  相泽南: "Minami Aizawa",
  橋本ありな: "Arina Hashimoto",
  桥本有菜: "Arina Hashimoto",
  新ありな: "Arina Hashimoto",
  波多野結衣: "Yui Hatano",
  波多野结衣: "Yui Hatano",
  鈴村あいり: "Airi Suzumura",
  铃村爱里: "Airi Suzumura",
  涼森れむ: "Remu Suzumori",
  凉森玲梦: "Remu Suzumori",
  楓カレン: "Karen Kaede",
  枫花恋: "Karen Kaede",
  山手梨愛: "Ria Yamate",
  山手梨爱: "Ria Yamate",
  小野六花: "Rikka Ono",
  石川澪: "Mio Ishikawa",
  坂道みる: "Miru",
  miru: "Miru",
  天使もえ: "Moe Amatsuka",
  天使萌: "Moe Amatsuka",
  八掛うみ: "Umi Yatsugake",
  八挂海: "Umi Yatsugake",
  伊藤舞雪: "Mayuki Ito",
  七沢みあ: "Mia Nanasawa",
  七泽美亚: "Mia Nanasawa",
  希島あいり: "Airi Kijima",
  希岛爱里: "Airi Kijima",
  川越にこ: "Niko Kawagoe",
  未歩なな: "Nana Miho",
  未步奈奈: "Nana Miho",
  森日向子: "Hinako Mori",
  神木麗: "Rei Kamiki",
  神木丽: "Rei Kamiki",
  小宵こなん: "Konan Koyoi",
  小宵虎南: "Konan Koyoi",
  楪カレン: "Karen Yuzuriha",
  金松季歩: "Kiho Kanematsu",
  本郷愛: "Ai Hongo",
  本乡爱: "Ai Hongo",
  二階堂夢: "Ai Hongo",
  ジュリア: "Julia",
  JULIA: "Julia",
  佐々木あき: "Aki Sasaki",
  佐佐木明希: "Aki Sasaki",
  松本いちか: "Ichika Matsumoto",
  松本一香: "Ichika Matsumoto",
  吉沢明歩: "Akiho Yoshizawa",
  吉泽明步: "Akiho Yoshizawa",
  明日花キララ: "Kirara Asuka",
  明日花绮罗: "Kirara Asuka",
  上原亜衣: "Ai Uehara",
  上原亚衣: "Ai Uehara",
  桜空もも: "Momo Sakura",
  樱空桃: "Momo Sakura",
  美谷朱里: "Akari Mitani",
  大槻ひびき: "Hibiki Otsuki",
  大槻响: "Hibiki Otsuki",
  星奈あい: "Ai Hoshina",
  白石茉莉奈: "Marina Shiraishi",
  篠田ゆう: "Yu Shinoda",
  筱田优: "Yu Shinoda",
  紗倉まな: "Mana Sakura",
  纱仓真菜: "Mana Sakura",
  浜崎真緒: "Mao Hamasaki",
  浜崎真绪: "Mao Hamasaki",
  水戸かな: "Kana Mito",
  水户香奈: "Kana Mito",
  初川みなみ: "Minami Hatsukawa",
  初川南: "Minami Hatsukawa",
  宇都宮しおん: "Shion Utsunomiya",
  安齋らら: "Rara Anzai",
  安斋拉拉: "Rara Anzai",
  RION: "Rara Anzai",
  天音まひな: "Mahina Amane",
  栗山莉緒: "Rio Kuriyama",
  森沢かな: "Kana Morisawa",
  森泽佳奈: "Kana Morisawa",
  田野憂: "Ui Tano",
  水卜さくら: "Sakura Miura",
  水卜樱: "Sakura Miura",
  古川いおり: "Iori Furukawa",
  古川伊织: "Iori Furukawa",
  戸田真琴: "Makoto Toda",
  户田真琴: "Makoto Toda",
  AIKA: "Aika",
  愛音まりあ: "Maria Aine",
  あやみ旬果: "Shunka Ayami",
  彩美旬果: "Shunka Ayami",
  市川まさみ: "Masami Ichikawa",
  一条葵: "Aoi Ichijo",
  逢沢はるか: "Haruka Aizawa",
  つぼみ: "Tsubomi",
  かすみ果穂: "Kaho Kasumi",
  希崎ジェシカ: "Jessica Kizaki",
  麻生希: "Nozomi Aso",
  Rio: "Rio",
  柚木ティナ: "Rio",
  西宮ゆめ: "Yume Nishimiya",
  西宫梦: "Yume Nishimiya",
  山岸逢花: "Aika Yamagishi",
  木下ひまり: "Himari Kinoshita",
  東條なつ: "Natsu Tojo",
  东条夏: "Natsu Tojo",
  星宮一花: "Ichika Hoshimiya",
  星宫一花: "Ichika Hoshimiya",
  桃乃木かな: "Kana Momonogi",
  桃乃木香奈: "Kana Momonogi",
  高橋しょう子: "Shoko Takahashi",
  高桥圣子: "Shoko Takahashi",
  吉高ねね: "Nene Yoshitaka",
  吉高宁宁: "Nene Yoshitaka",
  美園和花: "Waka Misono",
  美园和花: "Waka Misono",
  白桃はな: "Hana Shirato",
  松下紗栄子: "Saeko Matsushita",
  松下纱荣子: "Saeko Matsushita",
  風間ゆみ: "Yumi Kazama",
  风间由美: "Yumi Kazama",
  本田岬: "Misaki Honda",
  北条麻妃: "Maki Hojo",
  君島みお: "Mio Kimijima",
  君岛美绪: "Mio Kimijima",
  篠田あゆみ: "Ayumi Shinoda",
  朝桐光: "Hikaru Asagiri",
  有村千佳: "Chika Arimura",
  竹内有紀: "Yuki Takeuchi",
  竹内有纪: "Yuki Takeuchi",
  二宮和香: "Waka Ninomiya",
  明里つむぎ: "Tsumugi Akari",
  明里紬: "Tsumugi Akari",
  恋渕ももな: "Momona Koibuchi",
  恋渕桃奈: "Momona Koibuchi",
  青空ひかり: "Hikari Aozora",
  青空光: "Hikari Aozora",
  木下凛々子: "Ririko Kinoshita",
  白峰ミウ: "Miu Shiramine",
  白峰美羽: "Miu Shiramine",
  根尾あかり: "Akari Neo",
  根尾朱里: "Akari Neo",
  渚みつき: "Mitsuki Nagisa",
  渚光希: "Mitsuki Nagisa",
  水端あさみ: "Asami Mizuhata",
  月乃さくら: "Sakura Tsukino",
  月乃樱: "Sakura Tsukino",
  石原希望: "Nozomi Ishihara",
  倉多まお: "Mao Kurata",
  仓多真央: "Mao Kurata",
  JULIAジュリア: "Julia",
  小早川怜子: "Reiko Kobayakawa",
  上原カエラ: "Kaera Uehara",
  南梨央奈: "Riona Minami",
  栄川乃亜: "Noa Eikawa",
  岬ななみ: "Nanami Misaki",
  乙白さやか: "Sayaka Otoshiro",
  鷲尾めい: "Mei Washio",
  鹫尾芽衣: "Mei Washio",
  沙月恵奈: "Ena Satsuki",
  沙月惠奈: "Ena Satsuki",
  日向なつ: "Natsu Hinata",
  日向夏: "Natsu Hinata",
  工藤ララ: "Rara Kudo",
  工藤拉拉: "Rara Kudo",
  小湊よつ葉: "Yotsuha Kominato",
  小凑四叶: "Yotsuha Kominato",
  星乃莉子: "Riko Hoshino",
  百瀬あすか: "Asuka Momose",
  百濑飞鸟: "Asuka Momose",
  松本菜奈実: "Nanami Matsumoto",
  松本菜奈实: "Nanami Matsumoto",
  逢見リカ: "Rika Oumi",
  逢见梨花: "Rika Oumi",
  宮下玲奈: "Rena Miyashita",
  宫下玲奈: "Rena Miyashita",
  金松季步: "Kiho Kanematsu",
  田中レモン: "Lemon Tanaka",
  田中柠檬: "Lemon Tanaka",
  唯井まひろ: "Mahiro Tadai",
  唯井真寻: "Mahiro Tadai",
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
      { signal: AbortSignal.timeout(4000) }
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
      result.push(replaced.trim());
    }
  }
  return Array.from(new Set(result));
}

/**
 * Translates actress name(s) (Japanese Kanji -> English / Romaji).
 */
export function translateActressName(name: string): string {
  if (!name) return "Unknown";
  const trimmed = name.trim();
  if (JAV_ACTRESS_MAP[trimmed]) return JAV_ACTRESS_MAP[trimmed];

  let res = trimmed;
  for (const [ja, en] of Object.entries(JAV_ACTRESS_MAP)) {
    if (res.includes(ja)) {
      res = res.replaceAll(ja, en);
    }
  }
  return res.trim();
}

/**
 * Extracts and translates actress name.
 * Separates English name as primary and Japanese name as secondary/alias.
 */
export function extractAndTranslateActress(rawName: string): { nameEn: string; nameJa?: string } {
  if (!rawName) return { nameEn: "Unknown" };
  const clean = rawName.trim();

  // Check if name has parentheses like "小島みなみ (Minami Kojima)" or "Minami Kojima (小島みなみ)"
  const parenMatch = clean.match(/^(.*?)\s*[\(（](.*?)[\)）]$/);
  if (parenMatch) {
    const part1 = parenMatch[1].trim();
    const part2 = parenMatch[2].trim();
    if (containsJapanese(part1)) {
      const en = translateActressName(part2 || part1);
      return { nameEn: en, nameJa: part1 };
    } else {
      const en = translateActressName(part1);
      const ja = containsJapanese(part2) ? part2 : (REVERSE_ACTRESS_MAP[en.toLowerCase()] || undefined);
      return { nameEn: en, nameJa: ja };
    }
  }

  // Check dictionary
  const translated = translateActressName(clean);
  const isJa = containsJapanese(clean);
  const nameJa = isJa 
    ? (translated !== clean ? clean : undefined)
    : (REVERSE_ACTRESS_MAP[clean.toLowerCase()] || undefined);

  return {
    nameEn: translated,
    nameJa,
  };
}

/**
 * Complete Auto-Translator for JavDbItem.
 * Preserves the original Japanese title in `titleJa` while translating `title`,
 * actress names, tags, and generating a clean English overview.
 */
export async function translateJavItem(item: JavDbItem): Promise<JavDbItem> {
  const originalTitle = item.titleJa || item.title;

  // Translate title to English
  const englishTitle = await translateText(item.title);

  // Translate actress names & extract Japanese names for character field
  const translatedActressesData = item.actresses.map(extractAndTranslateActress);
  const translatedActresses = translatedActressesData.map((d) => d.nameEn);
  const primaryData = translatedActressesData[0] || extractAndTranslateActress(item.actress);
  const primaryActress = primaryData.nameEn;

  // Translate tags
  const englishTags = translateTags(item.tags);

  // Ensure code and studio are in tags
  if (!englishTags.includes(item.code)) englishTags.unshift(item.code);
  if (item.studio && !englishTags.includes(item.studio)) englishTags.push(item.studio);

  // Filter preview images (keep only real image URLs, exclude /v/... and relative links)
  const validPreviews = (item.previewImages || []).filter(
    (url) =>
      typeof url === "string" &&
      url.startsWith("http") &&
      !url.includes("/v/") &&
      (/\.(jpe?g|png|webp)($|\?)/i.test(url) || url.includes("/samples/")),
  );

  // Generate English overview
  const seriesInfo = item.series ? ` as part of the "${item.series}" series` : "";
  const overview = `Official adult feature from studio ${item.studio}${seriesInfo}, starring ${translatedActresses.join(", ") || primaryActress} (Catalog code ${item.code}).`;

  const actressDetails =
    item.actressDetails && item.actressDetails.length > 0
      ? item.actressDetails.map((a) => {
          const info = extractAndTranslateActress(a.name);
          return {
            name: info.nameEn,
            character: info.nameJa || undefined,
            avatarUrl: a.avatarUrl,
          };
        })
      : translatedActressesData.map((info) => ({
          name: info.nameEn,
          character: info.nameJa || undefined,
          avatarUrl: item.posterUrl,
        }));

  return {
    ...item,
    title: englishTitle,
    titleJa: originalTitle,
    actress: primaryActress,
    actresses: translatedActresses,
    actressDetails,
    tags: englishTags,
    previewImages: validPreviews,
    overview: item.overview && !containsJapanese(item.overview) ? item.overview : overview,
  };
}
