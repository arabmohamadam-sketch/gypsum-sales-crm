export type PurchaseIntent =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export type SalesOpportunity =
  | "high"
  | "medium"
  | "low"
  | "unknown";

export interface SalesNoteSignals {
  hasNotes: boolean;

  purchaseIntent: PurchaseIntent;
  salesOpportunity: SalesOpportunity;

  hasRecontactIntent: boolean;
  doNotContact: boolean;

  priceObjection: boolean;
  competitorMentioned: boolean;
  competitorName: string | null;

  stockBarrier: boolean;
  projectPending: boolean;
  projectActive: boolean;

  customerInterested: boolean;
  customerRefused: boolean;
  customerNeedsPrice: boolean;

  nextActionHint: string | null;

  points: number;

  matchedKeywords: string[];
}

/* ==========================================
   NORMALIZATION
   ========================================== */

function normalizePersianText(
  value: string,
): string {
  return value
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .replace(/\u200c/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/* ==========================================
   KEYWORD HELPERS
   ========================================== */

function containsAny(
  text: string,
  patterns: string[],
): boolean {
  return patterns.some((pattern) =>
    text.includes(
      normalizePersianText(pattern),
    ),
  );
}

const KNOWN_COMPETITORS = [
  "جم کوه",
  "جم‌کوه",
  "شیمیران",
  "تالیایی",
  "ملی",
  "سمنان",
];

function findCompetitor(
  text: string,
): string | null {
  for (const competitor of KNOWN_COMPETITORS) {
    if (
      text.includes(
        normalizePersianText(
          competitor,
        ),
      )
    ) {
      return competitor;
    }
  }

  return null;
}

function cleanNote(
  value: string | null | undefined,
): string {
  if (!value) {
    return "";
  }

  return normalizePersianText(
    value,
  );
}

/* ==========================================
   NEXT ACTION
   ========================================== */

function detectNextActionHint(
  text: string,
): string | null {
  if (
    containsAny(text, [
      "هفته بعد",
      "هفته آینده",
      "هفته ی بعد",
      "هفته‌ی بعد",
    ])
  ) {
    return "تماس در هفته آینده";
  }

  if (
    containsAny(text, [
      "ماه بعد",
      "ماه آینده",
      "اول ماه",
      "اخر ماه",
      "آخر ماه",
    ])
  ) {
    return "پیگیری در ماه آینده";
  }

  if (
    containsAny(text, [
      "فردا",
      "روز بعد",
      "پس فردا",
      "پس‌فردا",
    ])
  ) {
    return "تماس مجدد در روزهای نزدیک";
  }

  if (
    containsAny(text, [
      "بعدا تماس",
      "بعدا پیگیری",
      "بعدا پیگیری شود",
      "بعداً تماس",
      "بعداً پیگیری",
      "بعداً پیگیری شود",
      "دوباره تماس",
      "مجدد تماس",
      "تماس مجدد",
      "پیگیری مجدد",
      "پیگیری شود",
    ])
  ) {
    return "نیاز به تماس یا پیگیری مجدد";
  }

  if (
    containsAny(text, [
      "بعد از تخلیه",
      "بعد از فروش موجودی",
      "بعد از اتمام موجودی",
      "بعد از شروع پروژه",
      "بعد از تایید",
      "بعد از تأیید",
      "بعد از شروع کار",
    ])
  ) {
    return "پیگیری پس از تحقق شرط ثبت‌شده";
  }

  return null;
}

/* ==========================================
   MAIN SALES INTELLIGENCE
   ========================================== */

export function extractSalesNoteSignals(
  texts: Array<
    string | null | undefined
  >,
): SalesNoteSignals {
  const cleanedTexts = texts
    .map(cleanNote)
    .filter(Boolean);

  const text = cleanedTexts.join(" ");

  if (!text) {
    return {
      hasNotes: false,

      purchaseIntent: "unknown",
      salesOpportunity: "unknown",

      hasRecontactIntent: false,
      doNotContact: false,

      priceObjection: false,
      competitorMentioned: false,
      competitorName: null,

      stockBarrier: false,
      projectPending: false,
      projectActive: false,

      customerInterested: false,
      customerRefused: false,
      customerNeedsPrice: false,

      nextActionHint: null,

      points: 0,

      matchedKeywords: [],
    };
  }

  const matchedKeywords: string[] =
    [];

  let points = 0;

  /* ==========================================
     DO NOT CONTACT
     ========================================== */

  const doNotContact =
    containsAny(text, [
      "تماس نگیرید",
      "فعلا تماس نگیرید",
      "فعلاً تماس نگیرید",
      "فعلا پیگیری نکن",
      "فعلاً پیگیری نکن",
      "فعلا تماس نگیر",
      "فعلاً تماس نگیر",
      "بعدا خبر میدم",
      "بعداً خبر میدم",
    ]);

  if (doNotContact) {
    points -= 20;

    matchedKeywords.push(
      "فعلاً تماس نگیرید",
    );
  }

  /* ==========================================
     RECONTACT
     ========================================== */

  const hasRecontactIntent =
    containsAny(text, [
      "هفته بعد",
      "هفته آینده",
      "هفته ی بعد",
      "هفته‌ی بعد",
      "ماه بعد",
      "ماه آینده",
      "فردا",
      "پس فردا",
      "پس‌فردا",
      "دوباره تماس",
      "مجدد تماس",
      "تماس مجدد",
      "بعدا تماس",
      "بعداً تماس",
      "بعدا پیگیری",
      "بعداً پیگیری",
      "پیگیری مجدد",
      "پیگیری شود",
    ]);

  if (hasRecontactIntent) {
    points += 15;

    matchedKeywords.push(
      "نیاز به تماس مجدد",
    );
  }

  /* ==========================================
     PRICE OBJECTION
     ========================================== */

  const priceObjection =
    containsAny(text, [
      "قیمت بالاست",
      "قیمت بالاتر",
      "قیمت گرونه",
      "قیمت گران",
      "قیمت",
      "تخفیف",
      "تخفیف نقدی",
      "تخفیف بده",
      "قیمت رقیب",
      "قیمت جم",
      "قیمت شیمیران",
    ]);

  if (priceObjection) {
    points += 4;

    matchedKeywords.push(
      "اعتراض یا مذاکره قیمت",
    );
  }

  /* ==========================================
     COMPETITOR
     ========================================== */

  const competitorName =
    findCompetitor(text);

  const competitorMentioned =
    Boolean(competitorName) ||
    containsAny(text, [
      "رقیب",
      "رقبا",
      "محصول رقیب",
      "جنس رقیب",
    ]);

  if (competitorMentioned) {
    points += 5;

    matchedKeywords.push(
      "ذکر رقیب",
    );
  }

  /* ==========================================
     STOCK BARRIER
     ========================================== */

  const stockBarrier =
    containsAny(text, [
      "موجودی دارم",
      "موجودی دارد",
      "انبار پر",
      "انبارم پر",
      "موجودی بالاست",
      "موجودی بالا",
      "فعلا موجودی",
      "فعلاً موجودی",
      "موجود دارد",
    ]);

  if (stockBarrier) {
    points -= 8;

    matchedKeywords.push(
      "مانع خرید: موجودی",
    );
  }

  /* ==========================================
     PROJECT PENDING
     ========================================== */

  const projectPending =
    containsAny(text, [
      "منتظر پروژه",
      "پروژه شروع نشده",
      "شروع پروژه",
      "بعد از شروع پروژه",
      "پروژه در انتظار",
      "منتظر تایید",
      "منتظر تأیید",
      "تایید مهندس",
      "تأیید مهندس",
      "منتظر جواب",
      "منتظر پاسخ",
    ]);

  if (projectPending) {
    points += 6;

    matchedKeywords.push(
      "پروژه یا تایید در انتظار",
    );
  }

  /* ==========================================
     PROJECT ACTIVE
     ========================================== */

  const projectActive =
    containsAny(text, [
      "پروژه فعال",
      "پروژه در حال اجرا",
      "در حال اجرا",
      "کار شروع شده",
      "ساختمان در حال کار",
      "کارگاه فعال",
      "پروژه شروع شده",
    ]);

  if (projectActive) {
    points += 10;

    matchedKeywords.push(
      "پروژه فعال",
    );
  }

  /* ==========================================
     CUSTOMER INTEREST
     ========================================== */

  const customerInterested =
    containsAny(text, [
      "احتمال خرید",
      "احتمالا میخره",
      "احتمالا می‌خره",
      "احتمال خرید دارد",
      "خرید دارد",
      "بار میگیرد",
      "بار می‌گیرد",
      "بار میخواد",
      "بار می‌خواد",
      "سفارش میده",
      "سفارش می‌دهد",
      "سفارش خواهد داد",
      "مشتری علاقه دارد",
      "علاقه مند",
      "علاقه‌مند",
      "مایل به خرید",
      "میخره",
      "می‌خره",
    ]);

  if (customerInterested) {
    points += 18;

    matchedKeywords.push(
      "نشانه علاقه به خرید",
    );
  }

  /* ==========================================
     CUSTOMER REFUSAL
     ========================================== */

  const customerRefused =
    containsAny(text, [
      "نمیخواد",
      "نمی‌خواد",
      "نمی خواهد",
      "خرید ندارد",
      "فعلا خرید ندارد",
      "فعلاً خرید ندارد",
      "قصد خرید ندارد",
      "رد کرد",
      "قبول نکرد",
      "نمیخرد",
      "نمی‌خرد",
    ]);

  if (customerRefused) {
    points -= 15;

    matchedKeywords.push(
      "عدم تمایل فعلی به خرید",
    );
  }

  /* ==========================================
     PRICE CONDITION
     ========================================== */

  const customerNeedsPrice =
    containsAny(text, [
      "اگر تخفیف",
      "در صورت تخفیف",
      "با تخفیف",
      "قیمت مناسب",
      "اگر قیمت",
      "قیمت پایین تر",
      "قیمت پایین‌تر",
      "شرایط قیمت",
      "شرایط پرداخت",
    ]);

  if (customerNeedsPrice) {
    points += 10;

    matchedKeywords.push(
      "شرط خرید مرتبط با قیمت",
    );
  }

  /* ==========================================
     NEXT ACTION
     ========================================== */

  const nextActionHint =
    detectNextActionHint(text);

  /* ==========================================
     PURCHASE INTENT
     ========================================== */

  let purchaseIntent:
    PurchaseIntent = "unknown";

  let salesOpportunity:
    SalesOpportunity = "unknown";

  if (
    doNotContact ||
    customerRefused
  ) {
    purchaseIntent = "low";
  } else if (
    customerInterested &&
    (
      hasRecontactIntent ||
      customerNeedsPrice ||
      projectActive
    )
  ) {
    purchaseIntent = "high";
  } else if (
    customerInterested ||
    hasRecontactIntent ||
    projectPending
  ) {
    purchaseIntent = "medium";
  } else if (stockBarrier) {
    purchaseIntent = "low";
  }

  /* ==========================================
     SALES OPPORTUNITY
     ========================================== */

  if (
    customerInterested &&
    (
      projectActive ||
      hasRecontactIntent
    )
  ) {
    salesOpportunity = "high";
  } else if (
    hasRecontactIntent ||
    projectPending ||
    priceObjection ||
    competitorMentioned
  ) {
    salesOpportunity = "medium";
  } else if (
    stockBarrier ||
    customerRefused
  ) {
    salesOpportunity = "low";
  }

  /* ==========================================
     INTENT POINTS
     ========================================== */

  if (
    purchaseIntent === "high"
  ) {
    points += 15;
  } else if (
    purchaseIntent === "medium"
  ) {
    points += 7;
  }

  if (
    salesOpportunity === "high"
  ) {
    points += 12;
  } else if (
    salesOpportunity === "medium"
  ) {
    points += 6;
  }

  return {
    hasNotes: true,

    purchaseIntent,
    salesOpportunity,

    hasRecontactIntent,
    doNotContact,

    priceObjection,
    competitorMentioned,
    competitorName,

    stockBarrier,
    projectPending,
    projectActive,

    customerInterested,
    customerRefused,
    customerNeedsPrice,

    nextActionHint,

    points: Math.max(
      -30,
      Math.min(
        60,
        points,
      ),
    ),

    matchedKeywords:
      Array.from(
        new Set(
          matchedKeywords,
        ),
      ).slice(0, 8),
  };
}