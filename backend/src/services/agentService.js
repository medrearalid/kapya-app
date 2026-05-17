import { GoogleGenAI } from '@google/genai'

const TEXT_MODEL_NAME = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
const MAX_RECIPE_GENERATION_ATTEMPTS = 2
const MAX_PROMPT_PANTRY_ITEMS = 18
const MAX_PROMPT_URGENT_ITEMS = 8
const MAX_PROMPT_RECENT_RECIPES = 8

const RECIPE_INGREDIENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    isim: { type: 'string' },
    miktar: { type: 'string' },
    birim: { type: 'string' },
  },
  required: ['isim', 'miktar', 'birim'],
}

const WASTE_SAVER_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tarif: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tarifAdi: { type: 'string' },
        kisaAciklama: { type: 'string' },
        tahminiSure: { type: 'string' },
        goruntuUrl: { type: 'string' },
        matchedIngredients: {
          type: 'array',
          items: RECIPE_INGREDIENT_JSON_SCHEMA,
        },
        missingIngredients: {
          type: 'array',
          items: RECIPE_INGREDIENT_JSON_SCHEMA,
        },
        pisirmeAdimlari: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: [
        'tarifAdi',
        'kisaAciklama',
        'tahminiSure',
        'goruntuUrl',
        'matchedIngredients',
        'pisirmeAdimlari',
      ],
    },
  },
  required: ['tarif'],
}

const BY_NAME_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tarif: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tarifAdi: { type: 'string' },
        kisaAciklama: { type: 'string' },
        tahminiSure: { type: 'string' },
        porsiyon: { type: 'string' },
        zorluk: { type: 'string' },
        ortalamaKalori: { type: 'string' },
        pufNoktasi: {
          type: 'array',
          items: { type: 'string' },
        },
        matchedIngredients: {
          type: 'array',
          items: RECIPE_INGREDIENT_JSON_SCHEMA,
        },
        missingIngredients: {
          type: 'array',
          items: RECIPE_INGREDIENT_JSON_SCHEMA,
        },
        pisirmeAdimlari: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: [
        'tarifAdi',
        'kisaAciklama',
        'tahminiSure',
        'porsiyon',
        'zorluk',
        'ortalamaKalori',
        'pufNoktasi',
        'matchedIngredients',
        'pisirmeAdimlari',
      ],
    },
  },
  required: ['tarif'],
}

const buildInlinePlaceholderImage = (title) => {
  const safeTitle = String(title ?? 'Kapya Dish').trim().slice(0, 48) || 'Kapya Dish'
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="50%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#fcd34d"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="512" cy="430" r="190" fill="#ffffff" fill-opacity="0.88"/>
  <text x="512" y="445" text-anchor="middle" font-size="82" font-family="Arial, sans-serif" fill="#92400e">KAPYA</text>
  <text x="512" y="765" text-anchor="middle" font-size="44" font-family="Arial, sans-serif" fill="#78350f">${safeTitle}</text>
</svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const ELEGANT_FALLBACK_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1495521821757-a1efb6729352?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop',
]

const getRandomFallbackImageUrl = () => {
  const randomIndex = Math.floor(Math.random() * ELEGANT_FALLBACK_IMAGE_URLS.length)
  return ELEGANT_FALLBACK_IMAGE_URLS[randomIndex] || ELEGANT_FALLBACK_IMAGE_URLS[0]
}

const DEFAULT_MAX_MISSING_INGREDIENTS = 3

const toBoundedInteger = ({ value, fallback, min, max }) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

const isFeatureEnabled = (value, fallback = false) => {
  const normalized = String(value ?? '').trim().toLocaleLowerCase('en-US')
  if (!normalized) {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

const parseCsvList = (value, fallback) => {
  const parsed = String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : fallback
}

const MAX_MISSING_INGREDIENTS = toBoundedInteger({
  value: process.env.RECIPE_AGENT_MAX_MISSING_INGREDIENTS,
  fallback: DEFAULT_MAX_MISSING_INGREDIENTS,
  min: 0,
  max: 8,
})

const SHOULD_AUTOFILL_MISSING_INGREDIENTS = isFeatureEnabled(
  process.env.RECIPE_AGENT_AUTOFILL_MISSING_INGREDIENTS,
  false,
)

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')

const FLAVOR_PROFILE = Object.freeze({
  SAVORY: 'savory',
  SWEET: 'sweet',
})

const DESSERT_CATEGORY_KEYS = new Set(
  parseCsvList(process.env.RECIPE_AGENT_DESSERT_CATEGORY_KEYS, ['tatli', 'dessert']).map((item) =>
    normalizeText(item),
  ),
)

const DESSERT_RECIPE_HINT_KEYWORDS = Object.freeze(
  parseCsvList(process.env.RECIPE_AGENT_DESSERT_HINT_KEYWORDS, [
    'tatli',
    'dessert',
    'kek',
    'kurabiye',
    'sutlac',
    'sütlaç',
    'baklava',
    'pasta',
    'muhallebi',
    'cheesecake',
    'revani',
  ]),
)

const DESSERT_DISALLOWED_AUXILIARY_KEYWORDS = Object.freeze(
  parseCsvList(process.env.RECIPE_AGENT_DESSERT_BLOCKLIST, [
    'kimyon',
    'pul biber',
    'karabiber',
    'sarımsak',
    'sarimsak',
    'tuz',
    'isot',
    'toz biber',
    'domates salçası',
    'domates salcasi',
  ]),
)

const SAVORY_AUXILIARY_KEYWORDS = Object.freeze(
  parseCsvList(process.env.RECIPE_AGENT_SAVORY_AUXILIARY_KEYWORDS, [
    'tuz',
    'karabiber',
    'kimyon',
    'pul biber',
    'toz biber',
    'isot',
    'kekik',
    'nane',
    'sumak',
    'baharat',
    'zeytinyağı',
    'zeytinyagi',
    'sıvı yağ',
    'sivi yag',
    'tereyağı',
    'tereyagi',
    'ayçiçek yağı',
    'aycicek yagi',
    'domates salçası',
    'domates salcasi',
    'biber salçası',
    'biber salcasi',
    'salça',
    'salca',
    'limon suyu',
    'sirke',
    'sos',
    'su',
  ]),
)

const SWEET_AUXILIARY_KEYWORDS = Object.freeze(
  parseCsvList(process.env.RECIPE_AGENT_SWEET_AUXILIARY_KEYWORDS, [
    'tarçın',
    'tarcin',
    'vanilya',
    'vanilin',
    'pudra şekeri',
    'pudra sekeri',
    'toz şeker',
    'toz seker',
    'şeker',
    'seker',
    'bal',
    'pekmez',
    'kakao',
    'çikolata',
    'cikolata',
    'hindistan cevizi',
    'süt',
    'sut',
    'krema',
    'kaymak',
    'nişasta',
    'nisasta',
    'limon kabuğu',
    'limon kabugu',
    'portakal kabuğu',
    'portakal kabugu',
    'su',
  ]),
)

const AUXILIARY_INGREDIENT_KEYWORDS = Object.freeze(
  Array.from(new Set([...SAVORY_AUXILIARY_KEYWORDS, ...SWEET_AUXILIARY_KEYWORDS])),
)

const DEFAULT_MISSING_INGREDIENTS_BY_FLAVOR_PROFILE = Object.freeze({
  [FLAVOR_PROFILE.SAVORY]: [
    { isim: 'zeytinyağı', miktar: '1', birim: 'yemek kaşığı' },
    { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
    { isim: 'karabiber', miktar: '1/2', birim: 'cay kasigi' },
  ],
  [FLAVOR_PROFILE.SWEET]: [
    { isim: 'tarçın', miktar: '1', birim: 'cay kasigi' },
    { isim: 'vanilya', miktar: '1', birim: 'cay kasigi' },
    { isim: 'pudra şekeri', miktar: '1', birim: 'yemek kasigi' },
  ],
})

const matchesAnyKeyword = (value, keywordList) => {
  const normalizedValue = normalizeText(value)
  if (!normalizedValue) {
    return false
  }

  return keywordList.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword)
    return (
      normalizedValue === normalizedKeyword ||
      normalizedValue.includes(normalizedKeyword) ||
      normalizedKeyword.includes(normalizedValue)
    )
  })
}

const isDessertCategory = (dishCategory) => DESSERT_CATEGORY_KEYS.has(normalizeText(dishCategory))

const resolveFlavorProfile = ({ dishCategory, recipeName, mealName }) => {
  if (isDessertCategory(dishCategory)) {
    return FLAVOR_PROFILE.SWEET
  }

  const contextText = [recipeName, mealName]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')

  if (matchesAnyKeyword(contextText, DESSERT_RECIPE_HINT_KEYWORDS)) {
    return FLAVOR_PROFILE.SWEET
  }

  return FLAVOR_PROFILE.SAVORY
}

const isDessertDisallowedAuxiliary = (ingredientName) =>
  matchesAnyKeyword(ingredientName, DESSERT_DISALLOWED_AUXILIARY_KEYWORDS)

const isAuxiliaryIngredientAllowedForFlavorProfile = ({ ingredientName, flavorProfile }) => {
  if (flavorProfile === FLAVOR_PROFILE.SWEET) {
    return !isDessertDisallowedAuxiliary(ingredientName)
  }

  return true
}

const getDefaultMissingIngredientsForFlavorProfile = (flavorProfile) =>
  Array.isArray(DEFAULT_MISSING_INGREDIENTS_BY_FLAVOR_PROFILE[flavorProfile])
    ? DEFAULT_MISSING_INGREDIENTS_BY_FLAVOR_PROFILE[flavorProfile]
    : DEFAULT_MISSING_INGREDIENTS_BY_FLAVOR_PROFILE[FLAVOR_PROFILE.SAVORY]

const isAuxiliaryIngredientName = (ingredientName) =>
  matchesAnyKeyword(ingredientName, AUXILIARY_INGREDIENT_KEYWORDS)

const isCoreIngredientName = (ingredientName) => {
  const normalizedName = normalizeText(ingredientName)
  if (!normalizedName) {
    return false
  }

  return !isAuxiliaryIngredientName(normalizedName)
}

const hasCoreIngredientInPantryForTemplate = ({ template, pantryLookupSet }) => {
  const matchedIngredients = Array.isArray(template?.matchedIngredients)
    ? template.matchedIngredients
    : []

  return matchedIngredients.some((ingredient) => {
    const ingredientName = normalizeText(ingredient?.isim)
    return ingredientName && pantryLookupSet.has(ingredientName) && isCoreIngredientName(ingredientName)
  })
}

const normalizeShortRecipeName = (value, fallback = 'Şef Önerisi') => {
  const text = String(value ?? '').trim()
  if (!text) {
    return fallback
  }

  const words = text.split(/\s+/g).filter(Boolean)
  if (words.length <= 3) {
    return text
  }

  return words.slice(0, 3).join(' ')
}

const REAL_RECIPE_FALLBACK_NAME_SET = new Set(
  [
    'Şanslı Şef Tabağı',
    'Sansli Sef Tabagi',
    'Şef Önerisi',
    'Sef Onerisi',
    'Odak Malzeme Tarifi',
    'Pratik Ev Yemeği',
    'Pratik Ev Yemegi',
  ].map((name) => normalizeText(name)),
)

const REAL_RECIPE_LIBRARY = [
  {
    tarifAdi: 'Menemen',
    aliases: ['menemen'],
    mealTypes: ['kahvalti'],
    quick15: true,
    onePot: true,
    highProtein: true,
    tahminiSure: '15 dakika',
    matchedIngredients: [
      { isim: 'domates', miktar: '2', birim: 'adet' },
      { isim: 'biber', miktar: '2', birim: 'adet' },
      { isim: 'yumurta', miktar: '3', birim: 'adet' },
      { isim: 'zeytinyagi', miktar: '2', birim: 'yemek kasigi' },
    ],
    missingIngredients: [
      { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
      { isim: 'karabiber', miktar: '1/2', birim: 'cay kasigi' },
    ],
    pufNoktasi: ['Yumurtayi son asamada ekleyip fazla karistirma.', 'Domates suyunu cekince servis et.'],
    pisirmeAdimlari: [
      'Tavada zeytinyagini isitip dogranmis biberleri sotele.',
      'Domatesleri ekleyip suyunu cekene kadar pisir.',
      'Yumurtalari kirip tuz-karabiber ekle.',
      'Kisiklik ayarda yumurta toparlaninca sicak servis et.',
    ],
  },
  {
    tarifAdi: 'Mercimek Corbasi',
    aliases: ['mercimek', 'mercimek corbasi'],
    mealTypes: ['ogle', 'aksam'],
    quick15: false,
    onePot: true,
    highProtein: true,
    tahminiSure: '35 dakika',
    matchedIngredients: [
      { isim: 'kirmizi mercimek', miktar: '1', birim: 'su bardagi' },
      { isim: 'sogan', miktar: '1', birim: 'adet' },
      { isim: 'havuc', miktar: '1', birim: 'adet' },
      { isim: 'tereyagi', miktar: '1', birim: 'yemek kasigi' },
    ],
    missingIngredients: [
      { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
      { isim: 'kimyon', miktar: '1/2', birim: 'cay kasigi' },
    ],
    pufNoktasi: ['Mercimegi iyi yikayip kopugunu al.', 'Blender sonrasi kivami sicak su ile ayarla.'],
    pisirmeAdimlari: [
      'Sogan ve havucu tencerede yag ile kavur.',
      'Mercimegi ekleyip kisa sure cevir.',
      'Sicak su ekleyip mercimek yumusayana kadar pisir.',
      'Blenderdan gecirip baharatla tamamla.',
    ],
  },
  {
    tarifAdi: 'Tavuk Sote',
    aliases: ['tavuk sote', 'tavuk'],
    mealTypes: ['ogle', 'aksam'],
    quick15: false,
    onePot: true,
    highProtein: true,
    tahminiSure: '30 dakika',
    matchedIngredients: [
      { isim: 'tavuk gogsu', miktar: '500', birim: 'gram' },
      { isim: 'biber', miktar: '2', birim: 'adet' },
      { isim: 'sogan', miktar: '1', birim: 'adet' },
      { isim: 'domates', miktar: '2', birim: 'adet' },
    ],
    missingIngredients: [
      { isim: 'zeytinyagi', miktar: '2', birim: 'yemek kasigi' },
      { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
    ],
    pufNoktasi: ['Tavugu yuksek ateste muhurlerek suyunu icinde tut.', 'Domatesi en son ekle.'],
    pisirmeAdimlari: [
      'Tavuklari kusbasi dograyip yuksek ateste muhurle.',
      'Sogan ve biberi ekleyip kavur.',
      'Domates ve baharatlari ilave et.',
      'Kivam alinca 5 dakika dinlendirip servis et.',
    ],
  },
  {
    tarifAdi: 'Nohut Yemegi',
    aliases: ['nohut', 'nohut yemegi'],
    mealTypes: ['ogle', 'aksam'],
    quick15: false,
    onePot: true,
    highProtein: true,
    tahminiSure: '45 dakika',
    matchedIngredients: [
      { isim: 'haslanmis nohut', miktar: '2', birim: 'su bardagi' },
      { isim: 'sogan', miktar: '1', birim: 'adet' },
      { isim: 'domates salcasi', miktar: '1', birim: 'yemek kasigi' },
      { isim: 'sivi yag', miktar: '2', birim: 'yemek kasigi' },
    ],
    missingIngredients: [
      { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
      { isim: 'kimyon', miktar: '1/2', birim: 'cay kasigi' },
    ],
    pufNoktasi: ['Salcayi yakmadan kavur.', 'Kisiklik ateste lezzetin oturmasini bekle.'],
    pisirmeAdimlari: [
      'Sogani yagda pembelestir.',
      'Salcayi ekleyip kokusu cikana kadar kavur.',
      'Nohut ve sicak suyu ekleyip kaynat.',
      'Baharatlarini ekleyip kisik ateste pisir.',
    ],
  },
  {
    tarifAdi: 'Sebzeli Makarna',
    aliases: ['makarna', 'sebzeli makarna'],
    mealTypes: ['ogle', 'aksam'],
    quick15: true,
    onePot: false,
    highProtein: false,
    tahminiSure: '20 dakika',
    matchedIngredients: [
      { isim: 'makarna', miktar: '1', birim: 'paket' },
      { isim: 'kabak', miktar: '1', birim: 'adet' },
      { isim: 'biber', miktar: '1', birim: 'adet' },
      { isim: 'zeytinyagi', miktar: '2', birim: 'yemek kasigi' },
    ],
    missingIngredients: [
      { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
      { isim: 'karabiber', miktar: '1/2', birim: 'cay kasigi' },
    ],
    pufNoktasi: ['Makarnayi diri birak.', 'Sebzeleri renklerini kaybetmeden sotele.'],
    pisirmeAdimlari: [
      'Makarnayi bol tuzlu suda hasla.',
      'Ayri tavada sebzeleri zeytinyagi ile sotele.',
      'Makarnayi tavaya alip baharatlarla harmanla.',
      'Sicak servis et.',
    ],
  },
]

const sanitizeProduct = (product) => ({
  name: String(product?.name ?? product?.urunAdi ?? '').trim(),
  quantity: Number(product?.quantity ?? product?.miktar ?? 0),
  unit: String(product?.unit ?? product?.birim ?? 'adet').trim() || 'adet',
  birimMaliyet: Number(product?.birimMaliyet ?? product?.unitCost ?? 0),
})

const sanitizeProductList = (products) =>
  (Array.isArray(products) ? products : []).map(sanitizeProduct).filter((item) => item.name)

const sanitizeStringList = (values) => {
  const uniqueMap = new Map()

  for (const rawValue of Array.isArray(values) ? values : []) {
    const label = String(rawValue ?? '').trim()
    const key = normalizeText(label)

    if (!label || !key || uniqueMap.has(key)) {
      continue
    }

    uniqueMap.set(key, label)
  }

  return Array.from(uniqueMap.values())
}

const isQuickRecipeDuration = (durationText) => {
  const duration = String(durationText ?? '').trim()
  const minutes = Number.parseInt(duration, 10)
  return Number.isFinite(minutes) && minutes <= 15
}

const buildPantryLookupSet = (pantryStock) =>
  new Set(
    sanitizeProductList(pantryStock)
      .map((item) => normalizeText(item.name))
      .filter(Boolean),
  )

const pickBestRealRecipeTemplate = ({ mealName, mealType, pantryStock, focusedIngredients, preferences }) => {
  const pantryLookupSet = buildPantryLookupSet(pantryStock)
  const focusedSet = new Set(sanitizeStringList(focusedIngredients).map((item) => normalizeText(item)))
  const preferenceSet = new Set(sanitizeStringList(preferences).map((item) => normalizeText(item)))
  const normalizedMealName = normalizeText(mealName)
  const normalizedMealType = normalizeText(mealType)

  const mealTypeCandidates = REAL_RECIPE_LIBRARY.filter((recipe) => {
    if (!normalizedMealType) {
      return true
    }

    return Array.isArray(recipe.mealTypes)
      ? recipe.mealTypes.some((value) => normalizeText(value) === normalizedMealType)
      : true
  })

  const candidatesWithCore = mealTypeCandidates.filter((recipe) =>
    hasCoreIngredientInPantryForTemplate({ template: recipe, pantryLookupSet }),
  )
  const candidates = candidatesWithCore.length > 0 ? candidatesWithCore : mealTypeCandidates

  if (normalizedMealName) {
    const exact = candidates.find((recipe) => {
      const aliasList = [recipe.tarifAdi, ...(Array.isArray(recipe.aliases) ? recipe.aliases : [])]
      return aliasList.some((alias) => normalizeText(alias) === normalizedMealName)
    })

    if (exact) {
      return exact
    }
  }

  let best = candidates[0] || REAL_RECIPE_LIBRARY[0]
  let bestScore = Number.NEGATIVE_INFINITY

  for (const recipe of candidates) {
    const aliasList = [recipe.tarifAdi, ...(Array.isArray(recipe.aliases) ? recipe.aliases : [])]
    const baseIngredients = Array.isArray(recipe.matchedIngredients) ? recipe.matchedIngredients : []
    let score = 0

    if (normalizedMealName && aliasList.some((alias) => normalizeText(alias).includes(normalizedMealName))) {
      score += 8
    }

    for (const ingredient of baseIngredients) {
      const ingredientName = normalizeText(ingredient?.isim)
      if (!ingredientName) {
        continue
      }

      if (pantryLookupSet.has(ingredientName)) {
        score += 2
      }

      if (focusedSet.has(ingredientName)) {
        score += 3
      }
    }

    if (preferenceSet.has('quick-15') && (recipe.quick15 || isQuickRecipeDuration(recipe.tahminiSure))) {
      score += 2
    }

    if (preferenceSet.has('one-pot') && recipe.onePot) {
      score += 2
    }

    if (preferenceSet.has('high-protein') && recipe.highProtein) {
      score += 2
    }

    if (score > bestScore) {
      best = recipe
      bestScore = score
    }
  }

  return best
}

const buildRealRecipeFromCatalog = ({ mealName, mealType, pantryStock, focusedIngredients, preferences }) => {
  const template = pickBestRealRecipeTemplate({
    mealName,
    mealType,
    pantryStock,
    focusedIngredients,
    preferences,
  })

  if (!template) {
    return null
  }

  const pantryLookupSet = buildPantryLookupSet(pantryStock)
  const matchedIngredients = []
  const candidateMissingIngredients = []

  for (const ingredient of Array.isArray(template?.matchedIngredients) ? template.matchedIngredients : []) {
    const ingredientName = normalizeText(ingredient?.isim)
    if (ingredientName && pantryLookupSet.has(ingredientName)) {
      matchedIngredients.push(ingredient)
    } else {
      candidateMissingIngredients.push(ingredient)
    }
  }

  for (const ingredient of Array.isArray(template?.missingIngredients) ? template.missingIngredients : []) {
    candidateMissingIngredients.push(ingredient)
  }

  const missingCoreIngredients = candidateMissingIngredients.filter((ingredient) =>
    isCoreIngredientName(ingredient?.isim),
  )
  if (missingCoreIngredients.length > 0) {
    return null
  }

  const matchedCoreIngredients = matchedIngredients.filter((ingredient) =>
    isCoreIngredientName(ingredient?.isim),
  )
  if (matchedCoreIngredients.length === 0) {
    return null
  }

  const usedNameSet = new Set(matchedIngredients.map((ingredient) => normalizeText(ingredient?.isim)))
  const flavorProfile = resolveFlavorProfile({
    recipeName: template?.tarifAdi,
    mealName,
  })
  const missingIngredients = ensureMissingIngredients({
    missingIngredients: sanitizeIngredientList(candidateMissingIngredients),
    pantryNameSet: pantryLookupSet,
    usedNameSet,
    flavorProfile,
  })

  return {
    tarifAdi: String(template?.tarifAdi ?? 'Menemen').trim(),
    kisaAciklama: `${String(template?.tarifAdi ?? 'Bu tarif').trim()} icin geleneksel ve uygulamasi bilinen tarif karti.`,
    tahminiSure: String(template?.tahminiSure ?? '30 dakika').trim(),
    porsiyon: '2-4 kisilik',
    zorluk: 'Kolay',
    ortalamaKalori: '420 kcal / porsiyon',
    pufNoktasi: Array.isArray(template?.pufNoktasi) ? template.pufNoktasi.slice(0, 4) : [],
    matchedIngredients: matchedIngredients.slice(0, 8),
    missingIngredients,
    pisirmeAdimlari: Array.isArray(template?.pisirmeAdimlari)
      ? template.pisirmeAdimlari.slice(0, 8)
      : ['Malzemeleri hazirla.', 'Ana pisirme adimini tamamla.', 'Sicak servis et.'],
    goruntuUrl: buildInlinePlaceholderImage(template?.tarifAdi),
  }
}

const getGeminiApiKey = () => String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()

const parseLooseJson = (rawValue) => {
  const text = String(rawValue ?? '').trim()
  if (!text) {
    return null
  }

  const cleanText = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleanText)
  } catch {
    const startIndex = cleanText.indexOf('{')
    const endIndex = cleanText.lastIndexOf('}')
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return null
    }

    try {
      return JSON.parse(cleanText.slice(startIndex, endIndex + 1))
    } catch {
      return null
    }
  }
}

const normalizeIngredient = (ingredient) => {
  const isim = String(ingredient?.isim ?? ingredient?.name ?? '').trim()
  if (!isim) {
    return null
  }

  return {
    isim,
    miktar: String(ingredient?.miktar ?? ingredient?.amount ?? '1').trim() || '1',
    birim: String(ingredient?.birim ?? ingredient?.unit ?? 'adet').trim() || 'adet',
  }
}

const sanitizeIngredientList = (ingredients) =>
  (Array.isArray(ingredients) ? ingredients : []).map(normalizeIngredient).filter(Boolean)

const MARKET_FALLBACK_UNIT_COST_BY_UNIT = Object.freeze({
  gram: 0.09,
  adet: 8.5,
  paket: 32,
  litre: 58,
  ml: 0.06,
  var: 6,
  default: 10,
})

const normalizeCostUnit = (value) => {
  const unit = normalizeText(value)
  if (['gram', 'gr'].includes(unit)) return 'gram'
  if (['adet', 'ad', 'tane'].includes(unit)) return 'adet'
  if (['paket', 'pkt', 'pk'].includes(unit)) return 'paket'
  if (['litre', 'lt', 'l'].includes(unit)) return 'litre'
  if (['ml', 'mililitre'].includes(unit)) return 'ml'
  if (['var', 'mevcut'].includes(unit)) return 'var'
  return ''
}

const parseAmountTextToNumber = (value) => {
  const text = String(value ?? '').trim().replaceAll(',', '.')
  if (!text) {
    return 1
  }

  const direct = Number(text)
  if (Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const fractionMatch = /([\d.]+)\s*\/\s*([\d.]+)/.exec(text)
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1])
    const denominator = Number(fractionMatch[2])
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
      return numerator / denominator
    }
  }

  const numericPrefix = Number.parseFloat(text)
  return Number.isFinite(numericPrefix) && numericPrefix > 0 ? numericPrefix : 1
}

const convertUnitCost = ({ unitCost, fromUnit, toUnit }) => {
  if (fromUnit === toUnit) {
    return unitCost
  }

  if (fromUnit === 'litre' && toUnit === 'ml') {
    return unitCost / 1000
  }

  if (fromUnit === 'ml' && toUnit === 'litre') {
    return unitCost * 1000
  }

  return 0
}

const resolvePantryUnitCost = ({ ingredientName, ingredientUnit, pantryStock }) => {
  const normalizedIngredientName = normalizeText(ingredientName)
  const normalizedIngredientUnit = normalizeCostUnit(ingredientUnit)
  if (!normalizedIngredientName) {
    return 0
  }

  const candidate = sanitizeProductList(pantryStock).find((item) => {
    const pantryName = normalizeText(item.name)
    if (!pantryName) {
      return false
    }

    return (
      pantryName === normalizedIngredientName ||
      pantryName.includes(normalizedIngredientName) ||
      normalizedIngredientName.includes(pantryName)
    )
  })

  if (!candidate) {
    return 0
  }

  const rawUnitCost = Number(candidate?.birimMaliyet ?? candidate?.unitCost ?? 0)
  if (!Number.isFinite(rawUnitCost) || rawUnitCost <= 0) {
    return 0
  }

  const pantryUnit = normalizeCostUnit(candidate?.unit)
  if (!normalizedIngredientUnit || !pantryUnit) {
    return rawUnitCost
  }

  return convertUnitCost({
    unitCost: rawUnitCost,
    fromUnit: pantryUnit,
    toUnit: normalizedIngredientUnit,
  })
}

const resolveFallbackUnitCost = (unit) => {
  const normalizedUnit = normalizeCostUnit(unit)
  return MARKET_FALLBACK_UNIT_COST_BY_UNIT[normalizedUnit] ?? MARKET_FALLBACK_UNIT_COST_BY_UNIT.default
}

const calculateRecipePortionCostTl = ({ matchedIngredients, missingIngredients, pantryStock }) => {
  const allIngredients = [
    ...(Array.isArray(matchedIngredients) ? matchedIngredients : []),
    ...(Array.isArray(missingIngredients) ? missingIngredients : []),
  ]

  const totalCost = allIngredients.reduce((sum, ingredient) => {
    const amount = parseAmountTextToNumber(ingredient?.miktar)
    const pantryUnitCost = resolvePantryUnitCost({
      ingredientName: ingredient?.isim,
      ingredientUnit: ingredient?.birim,
      pantryStock,
    })
    const unitCost = pantryUnitCost > 0 ? pantryUnitCost : resolveFallbackUnitCost(ingredient?.birim)

    return sum + amount * unitCost
  }, 0)

  return Number(totalCost.toFixed(2))
}

const buildPantryNameSet = (pantryStock) =>
  new Set(
    sanitizeProductList(pantryStock)
      .map((item) => normalizeText(item.name))
      .filter(Boolean),
  )

const isIngredientInPantry = (ingredientName, pantryNameSet) => {
  const normalized = normalizeText(ingredientName)
  if (!normalized) {
    return false
  }

  return Array.from(pantryNameSet).some((pantryName) => {
    if (!pantryName) {
      return false
    }

    if (pantryName === normalized) {
      return true
    }

    return pantryName.includes(normalized) || normalized.includes(pantryName)
  })
}

const ensureMissingIngredients = ({
  missingIngredients,
  pantryNameSet,
  usedNameSet,
  flavorProfile = FLAVOR_PROFILE.SAVORY,
  allowAutofill = SHOULD_AUTOFILL_MISSING_INGREDIENTS,
}) => {
  const filtered = missingIngredients
    .filter((ingredient) => isAuxiliaryIngredientName(ingredient.isim))
    .filter((ingredient) =>
      isAuxiliaryIngredientAllowedForFlavorProfile({
        ingredientName: ingredient.isim,
        flavorProfile,
      }),
    )
    .filter((ingredient) => !isIngredientInPantry(ingredient.isim, pantryNameSet))
    .filter((ingredient) => {
      const key = normalizeText(ingredient.isim)
      if (!key || usedNameSet.has(key)) {
        return false
      }
      usedNameSet.add(key)
      return true
    })
    .slice(0, MAX_MISSING_INGREDIENTS)

  if (!allowAutofill) {
    return filtered
  }

  for (const candidate of getDefaultMissingIngredientsForFlavorProfile(flavorProfile)) {
    if (filtered.length >= MAX_MISSING_INGREDIENTS) {
      break
    }

    const key = normalizeText(candidate.isim)
    if (!key || usedNameSet.has(key) || isIngredientInPantry(candidate.isim, pantryNameSet)) {
      continue
    }

    if (
      !isAuxiliaryIngredientAllowedForFlavorProfile({
        ingredientName: candidate.isim,
        flavorProfile,
      })
    ) {
      continue
    }

    usedNameSet.add(key)
    filtered.push(candidate)
  }

  return filtered.slice(0, MAX_MISSING_INGREDIENTS)
}

const sanitizeRecipeByFlavorProfile = ({ recipe, dishCategory, mealName }) => {
  if (!recipe || typeof recipe !== 'object') {
    return recipe
  }

  const flavorProfile = resolveFlavorProfile({
    dishCategory,
    recipeName: recipe?.tarifAdi,
    mealName,
  })
  const pantryNameSet = new Set()
  const usedNameSet = new Set(
    sanitizeIngredientList(recipe?.matchedIngredients)
      .map((ingredient) => normalizeText(ingredient?.isim))
      .filter(Boolean),
  )

  const sanitizedMissingIngredients = ensureMissingIngredients({
    missingIngredients: sanitizeIngredientList(recipe?.missingIngredients),
    pantryNameSet,
    usedNameSet,
    flavorProfile,
    allowAutofill: false,
  })

  return {
    ...recipe,
    missingIngredients: sanitizedMissingIngredients,
  }
}

// Rules: if recipe name contains a keyword, at least one main ingredient must appear in matched OR missing lists.
const RECIPE_MAIN_INGREDIENT_RULES = [
  { recipeKeywords: ['köfte', 'kofte'], mainIngredientKeywords: ['kıyma', 'kiyma', 'et', 'dana', 'kuzu'] },
  { recipeKeywords: ['tavuk', 'piliç', 'pilic'], mainIngredientKeywords: ['tavuk', 'piliç', 'pilic'] },
  {
    recipeKeywords: ['balık', 'balik'],
    mainIngredientKeywords: ['balık', 'balik', 'somon', 'levrek', 'çipura', 'cipura', 'hamsi', 'istavrit'],
  },
  { recipeKeywords: ['mercimek'], mainIngredientKeywords: ['mercimek'] },
  { recipeKeywords: ['nohut'], mainIngredientKeywords: ['nohut'] },
  { recipeKeywords: ['pilav'], mainIngredientKeywords: ['pirinç', 'pirinc', 'bulgur'] },
  { recipeKeywords: ['makarna'], mainIngredientKeywords: ['makarna'] },
  { recipeKeywords: ['patlıcan', 'patlican'], mainIngredientKeywords: ['patlıcan', 'patlican'] },
  { recipeKeywords: ['ıspanak', 'ispanak'], mainIngredientKeywords: ['ıspanak', 'ispanak'] },
]

const AGENT_HALLUCINATION_ERROR_MESSAGE =
  "Şefin kafası karıştı! Lütfen tekrar 'Tarif Üret' butonuna tıkla."

const validateRecipeAntiHallucination = (recipe, { dishCategory, mealName } = {}) => {
  if (!recipe || typeof recipe !== 'object') {
    return { valid: false, reason: 'Tarif objesi bos.' }
  }

  const recipeName = normalizeText(String(recipe?.tarifAdi ?? ''))
  if (!recipeName) {
    return { valid: false, reason: 'Tarif adi bos.' }
  }

  const matchedIngredients = Array.isArray(recipe.matchedIngredients) ? recipe.matchedIngredients : []
  const missingIngredients = Array.isArray(recipe.missingIngredients) ? recipe.missingIngredients : []

  const matchedCoreIngredients = matchedIngredients.filter((ingredient) =>
    isCoreIngredientName(ingredient?.isim),
  )
  if (matchedCoreIngredients.length === 0) {
    return {
      valid: false,
      reason: `Hard constraint ihlali: '${recipe.tarifAdi}' icin pantry kaynakli core malzeme yok.`,
    }
  }

  const missingCoreIngredients = missingIngredients.filter((ingredient) =>
    isCoreIngredientName(ingredient?.isim),
  )
  if (missingCoreIngredients.length > 0) {
    const missingCoreList = missingCoreIngredients
      .map((ingredient) => String(ingredient?.isim ?? '').trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(', ')

    return {
      valid: false,
      reason: `Hard constraint ihlali: missingIngredients sadece auxiliary olabilir (core bulundu: ${missingCoreList || 'bilinmiyor'}).`,
    }
  }

  const flavorProfile = resolveFlavorProfile({
    dishCategory,
    recipeName: recipe?.tarifAdi,
    mealName,
  })
  if (flavorProfile === FLAVOR_PROFILE.SWEET) {
    const dessertIncompatibleMissing = missingIngredients.filter((ingredient) =>
      isDessertDisallowedAuxiliary(ingredient?.isim),
    )

    if (dessertIncompatibleMissing.length > 0) {
      const blockedList = dessertIncompatibleMissing
        .map((ingredient) => String(ingredient?.isim ?? '').trim())
        .filter(Boolean)
        .slice(0, 5)
        .join(', ')

      return {
        valid: false,
        reason: `Tatli lezzet profili ihlali: missingIngredients icinde yasakli savory malzeme bulundu (${blockedList || 'bilinmiyor'}).`,
      }
    }
  }

  const allIngredients = [
    ...matchedIngredients,
    ...missingIngredients,
  ]

  const ingredientNameSet = new Set(
    allIngredients.map((ing) => normalizeText(String(ing?.isim ?? ''))).filter(Boolean),
  )

  for (const rule of RECIPE_MAIN_INGREDIENT_RULES) {
    const recipeHasKeyword = rule.recipeKeywords.some((kw) => recipeName.includes(normalizeText(kw)))
    if (!recipeHasKeyword) continue

    const mainIngredientFound = rule.mainIngredientKeywords.some((mainIng) => {
      const normalizedMain = normalizeText(mainIng)
      return Array.from(ingredientNameSet).some(
        (ingName) => ingName.includes(normalizedMain) || normalizedMain.includes(ingName),
      )
    })

    if (!mainIngredientFound) {
      return {
        valid: false,
        reason: `'${recipe.tarifAdi}' tarifi icin ana malzeme ingredient listelerinde bulunamadi.`,
      }
    }
  }

  return { valid: true }
}

const buildFallbackRecipe = ({ pantryStock, recentRecipeNames }) => {
  const normalizedStock = sanitizeProductList(pantryStock)
  if (normalizedStock.length === 0) {
    return null
  }

  const recentRecipeNameSet = new Set(
    sanitizeStringList(recentRecipeNames).map((recipeName) => normalizeText(recipeName)),
  )

  const fallbackPool = [
    { name: 'Menemen', sure: '20 dakika' },
    { name: 'Mercimek Çorbası', sure: '35 dakika' },
    { name: 'Tavuk Sote', sure: '30 dakika' },
  ]

  const selectedFallback =
    fallbackPool.find((item) => !recentRecipeNameSet.has(normalizeText(item.name))) || fallbackPool[0]

  const baseProduct = normalizedStock.find((item) => isCoreIngredientName(item?.name))
  if (!baseProduct) {
    return null
  }

  return {
    tarifAdi: selectedFallback.name,
    kisaAciklama: `${baseProduct.name} merkezli, hizli hazirlanan pratik bir ev yemegi.`,
    tahminiSure: selectedFallback.sure,
    goruntuUrl: buildInlinePlaceholderImage(selectedFallback.name),
    matchedIngredients: [
      {
        isim: baseProduct.name,
        miktar: String(Math.max(1, Number(baseProduct.quantity) || 1)),
        birim: baseProduct.unit || 'adet',
      },
    ],
    missingIngredients: [
      { isim: 'zeytinyağı', miktar: '1', birim: 'yemek kaşığı' },
      { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
    ],
    pisirmeAdimlari: [
      'Adim 1: Malzemeleri yikayip dograyin.',
      'Adim 2: Tavayi isitip ana malzemeyi pisirmeye baslayin.',
      'Adim 3: Baharatlari ekleyip lezzeti dengeleyin.',
      'Adim 4: Yemegi sicak servis edin.',
    ],
  }
}

const getTextAiClient = () => {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    const missingKeyError = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    missingKeyError.statusCode = 500
    throw missingKeyError
  }

  return new GoogleGenAI({ apiKey })
}

const toPromptProductSnapshot = (products, limit) =>
  sanitizeProductList(products)
    .slice(0, limit)
    .map((item) => ({
      name: item.name,
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'adet',
    }))

const toPromptRecentRecipeHints = (recentRecipeNames) =>
  sanitizeStringList(recentRecipeNames).slice(0, MAX_PROMPT_RECENT_RECIPES)

const invokeStrictRecipeJson = async ({ ai, prompt, schema, temperature = 0.2 }) => {
  const response = await withTimeout(
    ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: prompt,
      config: {
        temperature,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
      },
    }),
    15000,
    'Recipe generation timed out.',
  )

  return parseLooseJson(response?.text)
}

const buildGenerateRecipePrompt = ({
  budgetProfile,
  pantryStock,
  urgentProducts,
  agentInstruction,
  requestMode,
  recentRecipeNames,
  correctionHint,
}) => {
  const payload = {
    budgetProfile: String(budgetProfile ?? '').trim(),
    pantryStock: toPromptProductSnapshot(pantryStock, MAX_PROMPT_PANTRY_ITEMS),
    urgentProducts: toPromptProductSnapshot(urgentProducts, MAX_PROMPT_URGENT_ITEMS),
    agentInstruction: String(agentInstruction ?? '').trim(),
    requestMode: String(requestMode ?? '').trim(),
    recentRecipeNames: toPromptRecentRecipeHints(recentRecipeNames),
  }

  return [
    'ROLE: Sen Turk mutfagini bilen bir sefsin.',
    'GOAL: Yalnizca tek bir uygulanabilir tarif dondur.',
    'RULES:',
    '- CIKTI SADECE JSON olsun, markdown ve ekstra metin yazma.',
    '- Output Formatting: JSON payloadı içerisindeki tüm metin değerleri (keyler hariç) KESİNLİKLE UTF-8 Türkçe karakter seti kullanılarak oluşturulmalıdır. Karakter standardizasyonu yapma.',
    '- matchedIngredients sadece pantryStock icinden secilsin.',
    '- HARD CONSTRAINT: Malzemeleri Core (ana) ve Auxiliary (yardımcı/baharat) olarak sınıflandır.',
    '- Karar Ağacı: Tarifin zorunlu Core malzemesi pantryStock içinde yoksa tarifi anında REDDET ve stoğa uygun yeni varyasyon ara.',
    '- missingIngredients dizisine SADECE auxiliary malzemeleri yaz. Core malzeme missingIngredients içine ASLA yazılamaz.',
    '- BAGLAMSAL FARKINDALIK: Tarif tatlı (dessert) profiline giriyorsa kimyon, pul biber, karabiber, sarımsak, tuz gibi savory/umami/acı yardımcıları missingIngredients veya içerik adımlarına ASLA yazma. Tatlı yardımcıları tarçın, vanilya, pudra şekeri vb. ile %100 uyumlu olmalı.',
    '- missingIngredients OPTIONAL alandır. Eğer matchedIngredients yemeği kusursuz yapmak için yeterliyse missingIngredients dizisini BOS bırak ([]). Sirf dizi dolsun diye alakasiz malzeme uydurma.',
    '- Tarif tekrari yapma: recentRecipeNames listesi sadece ilham icin kullanilsin.',
    '- Tarif adi 2-3 kelime olsun ve tum malzemeler basliga yigilmamasin.',
    '- pisirmeAdimlari 4-7 adim olsun.',
    '- goruntuUrl alani bos string olabilir.',
    correctionHint ? `CORRECTION: ${String(correctionHint).slice(0, 220)}` : '',
    `GIRDI: ${JSON.stringify(payload)}`,
  ].join('\n')
}

const GenerateRecipeTool = async ({
  ai,
  budgetProfile,
  pantryStock,
  urgentProducts,
  agentInstruction,
  requestMode,
  recentRecipeNames,
  correctionHint,
}) => {
  return invokeStrictRecipeJson({
    ai,
    schema: WASTE_SAVER_RESPONSE_JSON_SCHEMA,
    prompt: buildGenerateRecipePrompt({
      budgetProfile,
      pantryStock,
      urgentProducts,
      agentInstruction,
      requestMode,
      recentRecipeNames,
      correctionHint,
    }),
  })
}

const PREFERENCE_PROMPT_RULES = {
  'quick-15': 'Toplam hazirlama ve pisirme suresi en fazla 15 dakika olmali.',
  'high-protein':
    'Protein odagi guclu olmali; yumurta, bakliyat, et, tavuk veya yogurt dengesi kullan.',
  'one-pot': 'Tarif tek tencere veya tek tava ile tamamlanmali.',
}

const MEAL_TYPE_PROMPT_RULES = {
  kahvalti:
    'OGUN TIPI KAHVALTI: Tarif yalnizca kahvaltiya uygun olmali. Menemen, omlet, yulaf, pankek, tost gibi kahvalti formatlarina sadik kal. Kurufasulye, etli tencere, agir aksam yemekleri asla onerme.',
  ogle:
    'OGUN TIPI OGLE: Tarif dengeli ve gun ortasina uygun olmali. Hafif-orta doyuruculukta, pratik veya ofise uygun formatlari onceliklendir.',
  aksam:
    'OGUN TIPI AKSAM: Tarif aksam yemegine uygun olmali. Tencere, firin, izgara veya doyurucu tabaklar tercih et. Kahvalti tabagi formati asla onerme.',
}

const DISH_CATEGORY_PROMPT_RULES = {
  ana_yemek:
    'KATEGORI ANA YEMEK: Tarif ana yemek karakterinde olmalı; doyurucu ana tabak formatından çıkma.',
  corba:
    'KATEGORI CORBA: Tarif mutlaka çorba formatında olmalı; ana yemek veya tatlıya kayma.',
  tatli:
    'KATEGORI TATLI: Tarif tatlı formatında olmalı. Kimyon, pul biber, karabiber, sarımsak, tuz gibi savory yardımcıları ASLA kullanma; yalnızca tatlı profiline uygun yardımcılar kullan.',
  atistirmalik:
    'KATEGORI ATISTIRMALIK: Tarif atıştırmalık formatında, hızlı ve pratik olmalı.',
}

const buildGenerateRecipeByNamePrompt = ({
  mealName,
  dishCategory,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
  mealType,
  recentRecipeNames,
  correctionHint,
  cacheBustToken,
}) => {
  const normalizedMealName = String(mealName ?? '').trim()
  const normalizedPantryStock = toPromptProductSnapshot(pantryStock, MAX_PROMPT_PANTRY_ITEMS)
  const normalizedFocusedIngredients = sanitizeStringList(focusedIngredients)
  const normalizedPreferences = sanitizeStringList(preferences)
  const normalizedRecentRecipeNames = toPromptRecentRecipeHints(recentRecipeNames)
  const normalizedMealType = String(mealType ?? '').trim().toLocaleLowerCase('tr-TR')
  const normalizedDishCategory = String(dishCategory ?? '').trim().toLocaleLowerCase('tr-TR')

  const dynamicInstructions = []

  if (isLucky) {
    dynamicInstructions.push(
      'SANS MODU AKTIF: Dolaptaki malzemelerden tamamen rastgele ama uygulanabilir bir kombinasyon sec ve yaratici bir tarif olustur.',
      'Verilen mutfak envanterinden her seferinde BIRBIRINDEN FARKLI, rastgele ve surpriz bir tarif uret. Daha once urettigin standart/beklenen tariflerin (ornek: menemen) disina cik.',
    )
  }

  if (normalizedFocusedIngredients.length > 0) {
    dynamicInstructions.push(
      `Su malzemeleri KESINLIKLE kullan ve tarifin merkezine koy: ${normalizedFocusedIngredients.join(', ')}`,
    )
  }

  if (normalizedPreferences.length > 0) {
    dynamicInstructions.push('TERCIH FILTRELERI:')

    for (const preference of normalizedPreferences) {
      const key = normalizeText(preference)
      if (PREFERENCE_PROMPT_RULES[key]) {
        dynamicInstructions.push(`- ${PREFERENCE_PROMPT_RULES[key]}`)
      }
    }
  }

  if (MEAL_TYPE_PROMPT_RULES[normalizedMealType]) {
    dynamicInstructions.push(MEAL_TYPE_PROMPT_RULES[normalizedMealType])
  }

  if (DISH_CATEGORY_PROMPT_RULES[normalizedDishCategory]) {
    dynamicInstructions.push(DISH_CATEGORY_PROMPT_RULES[normalizedDishCategory])
  }

  if (normalizedMealName) {
    dynamicInstructions.push(`Kullanicinin hizli arama ifadesi: ${normalizedMealName}`)
  } else {
    dynamicInstructions.push('Kullanici net bir yemek ismi vermedi, tarif adini ve konsepti sen belirle.')
  }

  const payload = {
    mealName: normalizedMealName || null,
    mealType: normalizedMealType || null,
    dishCategory: normalizedDishCategory || null,
    pantryStock: normalizedPantryStock,
    focusedIngredients: normalizedFocusedIngredients,
    preferences: normalizedPreferences,
    isLucky: Boolean(isLucky),
    cacheBustToken: String(cacheBustToken ?? ''),
  }

  return [
    'ROLE: Sen Turk mutfagi odakli bir sefsin.',
    'GOAL: Kisitlara uygun tek bir tarif dondur.',
    'RULES:',
    '- CIKTI SADECE JSON olsun.',
    '- Output Formatting: JSON payloadı içerisindeki tüm metin değerleri (keyler hariç) KESİNLİKLE UTF-8 Türkçe karakter seti kullanılarak oluşturulmalıdır. Karakter standardizasyonu yapma.',
    '- matchedIngredients sadece pantryStock icinden secilsin.',
    '- HARD CONSTRAINT: Malzemeleri Core (ana) ve Auxiliary (yardımcı/baharat) olarak sınıflandır.',
    '- Karar Ağacı: Tarifin zorunlu Core malzemesi pantryStock içinde yoksa tarifi anında REDDET ve stoğa uygun yeni varyasyon ara.',
    '- missingIngredients dizisine SADECE auxiliary malzemeleri yaz. Core malzeme missingIngredients içine ASLA yazılamaz.',
    "- BAGLAMSAL FARKINDALIK: dishCategory='tatli' ise missingIngredients veya tarif içeriğine KESINLIKLE kimyon, pul biber, karabiber, sarımsak, tuz gibi savory/umami/acı yardımcılar ekleme. Yardımcı malzemeler tatlı lezzet profiline %100 uymalı (örn: tarçın, vanilya, pudra şekeri).",
    '- missingIngredients OPTIONAL alandır. Eğer matchedIngredients yeterliyse missingIngredients dizisini BOS bırak ([]). Sırf alan dolsun diye gereksiz/alakasız eksik üretme.',
    '- mealType verildiyse o ogun disina cikma.',
    '- recentRecipeNames listesi ilham icin kullanilsin, ayni tarif adini kopyalama.',
    '- Tarif adi 2-3 kelime olsun.',
    '- pufNoktasi en az 3, pisirmeAdimlari 6-10 adim olsun.',
    correctionHint ? `CORRECTION: ${String(correctionHint).slice(0, 220)}` : '',
    ...dynamicInstructions,
    '',
    `RECENT: ${JSON.stringify(normalizedRecentRecipeNames)}`,
    `GIRDI: ${JSON.stringify(payload)}`,
  ].join('\n')
}

const GenerateRecipeByNameTool = async ({
  ai,
  mealName,
  dishCategory,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
  mealType,
  recentRecipeNames,
  correctionHint,
  cacheBustToken,
}) => {
  return invokeStrictRecipeJson({
    ai,
    schema: BY_NAME_RESPONSE_JSON_SCHEMA,
    temperature: isLucky ? 0.9 : 0.2,
    prompt: buildGenerateRecipeByNamePrompt({
      mealName,
      dishCategory,
      pantryStock,
      focusedIngredients,
      preferences,
      isLucky,
      mealType,
      recentRecipeNames,
      correctionHint,
      cacheBustToken,
    }),
  })
}

const resolveImagePromptRecipeName = (recipeName) =>
  normalizeShortRecipeName(String(recipeName ?? '').trim(), '').slice(0, 60)

const normalizeImageValue = (value) => {
  const imageValue = String(value ?? '').trim()
  if (!imageValue) {
    return ''
  }

  if (
    imageValue.startsWith('http://') ||
    imageValue.startsWith('https://') ||
    imageValue.startsWith('data:image/')
  ) {
    return imageValue
  }

  return `data:image/png;base64,${imageValue}`
}

const extractNanoBananaImageFromPayload = (payload) => {
  const directImage = [
    payload?.imageUrl,
    payload?.url,
    payload?.image,
    payload?.result?.imageUrl,
    payload?.result?.url,
    payload?.output?.imageUrl,
    payload?.output?.url,
    payload?.data?.imageUrl,
    payload?.data?.url,
    payload?.images?.[0]?.url,
    payload?.images?.[0]?.imageUrl,
    payload?.data?.[0]?.url,
    payload?.data?.[0]?.imageUrl,
  ]
    .map(normalizeImageValue)
    .find(Boolean)

  if (directImage) {
    return directImage
  }

  const base64Image = [
    payload?.base64,
    payload?.imageBase64,
    payload?.b64,
    payload?.b64_json,
    payload?.data?.base64,
    payload?.data?.b64_json,
    payload?.data?.[0]?.b64_json,
    payload?.data?.[0]?.base64,
    payload?.images?.[0]?.b64_json,
    payload?.generatedImages?.[0]?.image?.imageBytes,
  ]
    .map(normalizeImageValue)
    .find(Boolean)

  return base64Image || ''
}

const isQuotaExceededError = (error) => {
  const status = Number(error?.status)
  const message = String(error?.message ?? '').toLocaleLowerCase('en-US')
  return (
    status === 429 ||
    message.includes('429') ||
    message.includes('quota') ||
    message.includes('resource exhausted') ||
    message.includes('rate limit')
  )
}

const NON_DETERMINISTIC_IMAGE_CACHE_KEY_SET = new Set([
  ...REAL_RECIPE_FALLBACK_NAME_SET,
  normalizeText('Turkish food'),
])

const isUnsafeImageCacheKey = (cacheKey) =>
  !cacheKey || NON_DETERMINISTIC_IMAGE_CACHE_KEY_SET.has(cacheKey)

const isRecoverableImageApiServerError = (error) => {
  const status = Number(error?.status)
  return status === 429 || status >= 500 || isQuotaExceededError(error)
}

const withTimeout = async (promise, timeoutMs, timeoutMessage) => {
  const normalizedTimeoutMs = Number(timeoutMs)
  if (!Number.isFinite(normalizedTimeoutMs) || normalizedTimeoutMs <= 0) {
    return promise
  }

  let timeoutId

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = new Error(timeoutMessage || 'Operation timed out.')
          timeoutError.code = 'ETIMEDOUT'
          reject(timeoutError)
        }, normalizedTimeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

const generateImageWithGemini = async ({ prompt }) => {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    return ''
  }

  const ai = new GoogleGenAI({ apiKey })
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: IMAGE_MODEL_NAME,
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
      12000,
      'Gemini image generation timed out.',
    )

    const parts = Array.isArray(response?.candidates?.[0]?.content?.parts)
      ? response.candidates[0].content.parts
      : []

    for (const part of parts) {
      const imageBytes = String(part?.inlineData?.data ?? '').trim()
      if (!imageBytes) {
        continue
      }

      const mimeType = String(part?.inlineData?.mimeType ?? '').trim() || 'image/png'
      return `data:${mimeType};base64,${imageBytes}`
    }
  } catch (error) {
    if (isRecoverableImageApiServerError(error)) {
      throw error
    }

    console.warn('[image-generation] Gemini image model failed, falling back.', {
      model: IMAGE_MODEL_NAME,
      message: String(error?.message ?? error),
    })
  }

  return ''
}

const buildKeylessPromptImageUrl = ({ prompt, mealNameTr }) => {
  const encodedPrompt = encodeURIComponent(prompt)
  const seed = encodeURIComponent(normalizeText(mealNameTr || 'kapya-dish'))
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`
}

const buildStockFoodImageUrl = ({ mealNameTr }) => {
  const seedBase = normalizeText(mealNameTr || 'kapya-dish')
  let hash = 0
  for (const char of seedBase) {
    hash = (hash * 31 + Number(char.codePointAt(0) ?? 0)) % 2147483647
  }
  const lockValue = Math.max(hash, 1)
  return `https://loremflickr.com/1024/1024/food,meal,dish?lock=${lockValue}`
}

const fetchImageAsDataUri = async (url) => {
  const targetUrl = String(url ?? '').trim()
  if (!targetUrl) {
    return ''
  }

  try {
    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      return ''
    }

    const contentType = String(response.headers.get('content-type') ?? '').trim() || 'image/jpeg'
    if (!contentType.startsWith('image/')) {
      return ''
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) {
      return ''
    }

    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

const NanoBananaImageTool = async ({ recipeName }) => {
  const resolvedRecipeName = resolveImagePromptRecipeName(recipeName)
  if (!resolvedRecipeName) {
    return buildInlinePlaceholderImage('Kapya Dish')
  }

  try {
    const apiUrl = String(process.env.NANO_BANANA_API_URL ?? '').trim()
    const apiKey = String(process.env.NANO_BANANA_API_KEY ?? '').trim()
    const prompt = resolvedRecipeName

    if (apiUrl && apiKey) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          prompt,
          size: '1024x1024',
          aspectRatio: '1:1',
          n: 1,
        }),
      })

      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        const apiError = new Error('NanoBanana API gecici hata dondu.')
        apiError.status = response.status
        throw apiError
      }

      if (response.ok) {
        const payload = await response.json().catch(() => null)
        const imageFromPayload = extractNanoBananaImageFromPayload(payload)
        if (imageFromPayload) {
          return imageFromPayload
        }
      }
    }

    const geminiImage = await generateImageWithGemini({ prompt })
    if (geminiImage) {
      return geminiImage
    }

    return buildInlinePlaceholderImage(resolvedRecipeName)
  } catch (error) {
    if (isRecoverableImageApiServerError(error)) {
      console.warn('[image-generation] Server-side image API error, using random fallback image.', {
        status: Number(error?.status) || undefined,
        message: String(error?.message ?? error),
      })
      return getRandomFallbackImageUrl()
    }

    console.warn('[image-generation] Image generation failed, using fallback image.', {
      message: String(error?.message ?? error),
    })
    return buildInlinePlaceholderImage(resolvedRecipeName)
  }
}

const attachRecipeImageAsset = async ({ recipe }) => {
  const recipeName = normalizeShortRecipeName(recipe?.tarifAdi, '').trim()
  const fallbackName = recipeName || 'Kapya Dish'
  const generatedImageUrl = await NanoBananaImageTool({ recipeName: fallbackName })
  const resolvedImageUrl =
    normalizeImageValue(generatedImageUrl) ||
    normalizeImageValue(recipe?.goruntuUrl) ||
    buildInlinePlaceholderImage(fallbackName)

  return {
    ...recipe,
    goruntuUrl: resolvedImageUrl,
    nanoBananaGorseli: resolvedImageUrl,
  }
}

const normalizeGeneratedRecipe = ({ recipe, pantryStock, dishCategory, mealName }) => {
  const pantryNameSet = buildPantryNameSet(pantryStock)
  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const flavorProfile = resolveFlavorProfile({
    dishCategory,
    recipeName: recipe?.tarifAdi,
    mealName,
  })

  const matchedIngredientsRaw = sanitizeIngredientList(recipe?.matchedIngredients)
  let matchedIngredients = matchedIngredientsRaw.filter((ingredient) =>
    isIngredientInPantry(ingredient.isim, pantryNameSet),
  )

  if (matchedIngredients.length === 0) {
    const fallbackSource = normalizedPantryStock.filter((item) => isCoreIngredientName(item?.name))
    const selectedSource = fallbackSource.length > 0 ? fallbackSource : normalizedPantryStock

    matchedIngredients = selectedSource.slice(0, 2).map((item) => ({
      isim: item.name,
      miktar: String(Math.max(1, Number(item.quantity) || 1)),
      birim: item.unit || 'adet',
    }))
  }

  const usedNameSet = new Set(matchedIngredients.map((item) => normalizeText(item.isim)))
  const missingIngredientsRaw = sanitizeIngredientList(recipe?.missingIngredients)
  const missingIngredients = ensureMissingIngredients({
    missingIngredients: missingIngredientsRaw,
    pantryNameSet,
    usedNameSet,
    flavorProfile,
  })

  const pisirmeAdimlari = (Array.isArray(recipe?.pisirmeAdimlari) ? recipe.pisirmeAdimlari : [])
    .map((step) => String(step ?? '').trim())
    .filter(Boolean)
    .slice(0, 8)

  const recipeName = normalizeShortRecipeName(
    String(recipe?.tarifAdi ?? '').trim(),
    'Pratik Ev Yemegi',
  )

  const normalizedRecipe = {
    tarifAdi: recipeName,
    kisaAciklama:
      String(recipe?.kisaAciklama ?? '').trim() ||
      'Dolaptaki urunleri odaga alan dengeli bir ev yemegi onerisi.',
    tahminiSure:
      String(recipe?.tahminiSure ?? recipe?.tahminiSuresi ?? '').trim() || '30-40 dakika',
    goruntuUrl: String(recipe?.goruntuUrl ?? '').trim() || buildInlinePlaceholderImage(recipeName),
    matchedIngredients,
    missingIngredients,
    pisirmeAdimlari:
      pisirmeAdimlari.length > 0
        ? pisirmeAdimlari
        : [
            'Adim 1: Malzemeleri hazirlayin.',
            'Adim 2: Ana malzemeleri kontrollu sekilde pisirin.',
            `Adim 3: ${recipeName} icin baharat dengesini kurun ve sicak servis edin.`,
          ],
    porsiyonMaliyetiTl: calculateRecipePortionCostTl({
      matchedIngredients,
      missingIngredients,
      pantryStock,
    }),
  }

  return sanitizeRecipeByFlavorProfile({
    recipe: normalizedRecipe,
    dishCategory,
    mealName,
  })
}

const normalizeChefTips = (tips) => {
  if (Array.isArray(tips)) {
    return tips
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .slice(0, 6)
  }

  const text = String(tips ?? '').trim()
  if (!text) {
    return []
  }

  return text
    .split(/[\n\u2022*]/g)
    .map((item) => item.replace(/^[-\d.)\s]+/g, '').trim())
    .filter(Boolean)
    .slice(0, 6)
}

const resolveNamedRecipeName = ({ rawRecipeName, mealName, isLucky, focusedIngredients }) => {
  const normalizedRecipeName = normalizeShortRecipeName(String(rawRecipeName ?? '').trim(), '')
  if (normalizedRecipeName) {
    return normalizedRecipeName
  }

  const normalizedMealName = normalizeShortRecipeName(String(mealName ?? '').trim(), '')
  if (normalizedMealName) {
    return normalizedMealName
  }

  if (isLucky) {
    return 'Şanslı Şef Tabağı'
  }

  return focusedIngredients.length > 0 ? 'Odak Malzeme Tarifi' : 'Şef Önerisi'
}

const buildDefaultMatchedIngredients = (recipeName) => [
  { isim: recipeName, miktar: '500', birim: 'gram' },
  { isim: 'soğan', miktar: '1', birim: 'adet' },
  { isim: 'zeytinyağı', miktar: '2', birim: 'yemek kaşığı' },
  { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
  { isim: 'karabiber', miktar: '1/2', birim: 'cay kasigi' },
  { isim: 'su', miktar: '1', birim: 'su bardagi' },
]

const mergeFocusedIngredients = ({
  matchedIngredients,
  pantryStock,
  focusedIngredients,
  recipeName,
  isLucky,
}) => {
  const mergedMap = new Map()

  const pushIngredient = (ingredient) => {
    const ingredientName = String(ingredient?.isim ?? '').trim()
    const key = normalizeText(ingredientName)

    if (!ingredientName || !key || mergedMap.has(key)) {
      return
    }

    mergedMap.set(key, {
      isim: ingredientName,
      miktar: String(ingredient?.miktar ?? '1').trim() || '1',
      birim: String(ingredient?.birim ?? 'adet').trim() || 'adet',
    })
  }

  for (const ingredient of matchedIngredients) {
    pushIngredient(ingredient)
  }

  for (const focusedIngredient of focusedIngredients) {
    const focusedKey = normalizeText(focusedIngredient)
    const pantryHit = pantryStock.find((item) => normalizeText(item.name) === focusedKey)

    pushIngredient({
      isim: pantryHit?.name || focusedIngredient,
      miktar: String(Math.max(1, Number(pantryHit?.quantity) || 1)),
      birim: pantryHit?.unit || 'adet',
    })
  }

  if (mergedMap.size === 0 && pantryStock.length > 0) {
    const corePantryIngredients = pantryStock.filter((item) => isCoreIngredientName(item?.name))
    const prioritizedPantryIngredients =
      corePantryIngredients.length > 0 ? corePantryIngredients : pantryStock
    const sourceIngredients = isLucky
      ? [...prioritizedPantryIngredients].sort(() => Math.random() - 0.5)
      : prioritizedPantryIngredients

    for (const item of sourceIngredients.slice(0, 6)) {
      pushIngredient({
        isim: item.name,
        miktar: String(Math.max(1, Number(item.quantity) || 1)),
        birim: item.unit || 'adet',
      })
    }
  }

  if (mergedMap.size === 0) {
    for (const ingredient of buildDefaultMatchedIngredients(recipeName)) {
      pushIngredient(ingredient)
    }
  }

  return Array.from(mergedMap.values())
}

const buildPreferenceFallbackTips = (preferenceKeySet) => {
  const tips = [
    'Malzemeleri pisirmeden once oda sicakligina getir.',
    'Sos dengesini kontrollu tuzlama ile son asamada kur.',
    'Servisten once 2-3 dakika dinlendirerek aroma butunlugunu artir.',
  ]

  if (preferenceKeySet.has('quick-15')) {
    tips[0] = 'On hazirligi once bitirip yuksek ateste kisa surede pisir.'
  }

  if (preferenceKeySet.has('one-pot')) {
    tips[1] = 'Lezzeti tek tencerede katmanlayarak ekstra ekipman ihtiyacini azalt.'
  }

  if (preferenceKeySet.has('high-protein')) {
    tips[2] = 'Protein kaynagini ana omurga yapip karbonhidrat dengesini kontrollu tut.'
  }

  return tips
}

const normalizeNamedRecipe = ({
  mealName,
  dishCategory,
  recipe,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
}) => {
  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const normalizedFocusedIngredients = sanitizeStringList(focusedIngredients)
  const preferenceKeySet = new Set(
    sanitizeStringList(preferences).map((preference) => normalizeText(preference)),
  )

  const recipeName = resolveNamedRecipeName({
    rawRecipeName: recipe?.tarifAdi,
    mealName,
    isLucky,
    focusedIngredients: normalizedFocusedIngredients,
  })
  const flavorProfile = resolveFlavorProfile({
    dishCategory,
    recipeName,
    mealName,
  })

  const matchedIngredients = mergeFocusedIngredients({
    matchedIngredients: sanitizeIngredientList(recipe?.matchedIngredients),
    pantryStock: normalizedPantryStock,
    focusedIngredients: normalizedFocusedIngredients,
    recipeName,
    isLucky,
  })

  const pantryNameSet = buildPantryNameSet(normalizedPantryStock)
  const usedNameSet = new Set(matchedIngredients.map((ingredient) => normalizeText(ingredient?.isim)))
  const missingIngredients = ensureMissingIngredients({
    missingIngredients: sanitizeIngredientList(recipe?.missingIngredients),
    pantryNameSet,
    usedNameSet,
    flavorProfile,
  })
  const pisirmeAdimlari = (Array.isArray(recipe?.pisirmeAdimlari) ? recipe.pisirmeAdimlari : [])
    .map((step) => String(step ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)
  const pufNoktasi = normalizeChefTips(recipe?.pufNoktasi ?? recipe?.pufNoktalari)

  const fallbackDescription = isLucky
    ? `${recipeName}, dolaptaki urunlerle rastgele ilhamdan dogan yaratici bir secim.`
    : `${recipeName} icin geleneksel tekniklerle dengelenmis pratik bir tarif.`
  const fallbackDuration = preferenceKeySet.has('quick-15') ? '15 dakika' : '45 dakika'
  const fallbackTips = buildPreferenceFallbackTips(preferenceKeySet)

  const normalizedRecipe = {
    tarifAdi: recipeName,
    kisaAciklama: String(recipe?.kisaAciklama ?? '').trim() || fallbackDescription,
    tahminiSure: String(recipe?.tahminiSure ?? recipe?.tahminiSuresi ?? '').trim() || fallbackDuration,
    porsiyon: String(recipe?.porsiyon ?? '').trim() || '2-4 kisilik',
    zorluk: String(recipe?.zorluk ?? '').trim() || 'Orta',
    ortalamaKalori: String(recipe?.ortalamaKalori ?? '').trim() || '420 kcal / porsiyon',
    pufNoktasi: pufNoktasi.length > 0 ? pufNoktasi : fallbackTips,
    matchedIngredients,
    missingIngredients,
    pisirmeAdimlari:
      pisirmeAdimlari.length > 0
        ? pisirmeAdimlari
        : [
            'Adim 1: Tum malzemeleri yikayip dograyarak mise-en-place hazirla.',
            'Adim 2: Tencerede yagi isitip sogani saydamlasana kadar cevir.',
            `Adim 3: ${recipeName} ana malzemesini kontrollu ateste muhurlerek lezzeti yogunlastir.`,
            'Adim 4: Baharat ve sicak suyu ekleyip kapagi kapali sekilde pisir.',
            'Adim 5: Kivami kontrol edip gerekirse kisa sure dinlendir.',
            'Adim 6: Sicak servis ederek son dokunusu yap.',
          ],
    porsiyonMaliyetiTl: calculateRecipePortionCostTl({
      matchedIngredients,
      missingIngredients,
      pantryStock,
    }),
    goruntuUrl: String(recipe?.goruntuUrl ?? '').trim() || buildInlinePlaceholderImage(recipeName),
  }

  return sanitizeRecipeByFlavorProfile({
    recipe: normalizedRecipe,
    dishCategory,
    mealName,
  })
}

const extractFirstRecipeCandidate = (generated) => {
  if (generated?.tarif && typeof generated.tarif === 'object') {
    return generated.tarif
  }

  if (Array.isArray(generated?.tarifler)) {
    return generated.tarifler[0] || null
  }

  return generated && typeof generated === 'object' ? generated : null
}

const getFirstNonRecentCatalogRecipeName = (recentRecipeNameSet) => {
  const candidate = REAL_RECIPE_LIBRARY.find(
    (item) => !recentRecipeNameSet.has(normalizeText(item?.tarifAdi)),
  )
  return String(candidate?.tarifAdi ?? '').trim()
}

const getRandomNonRecentCatalogRecipeName = (recentRecipeNameSet) => {
  const candidatePool = REAL_RECIPE_LIBRARY.filter(
    (item) => !recentRecipeNameSet.has(normalizeText(item?.tarifAdi)),
  )
  const sourcePool = candidatePool.length > 0 ? candidatePool : REAL_RECIPE_LIBRARY
  if (sourcePool.length === 0) {
    return ''
  }

  const randomIndex = Math.floor(Math.random() * sourcePool.length)
  return String(sourcePool[randomIndex]?.tarifAdi ?? '').trim()
}

export const executeKapyaAgent = async ({
  budgetProfile,
  pantryStock,
  urgentProducts,
  agentInstruction,
  requestMode,
  recentRecipeNames,
}) => {
  try {
    const ai = getTextAiClient()

    const normalizedPantryStock = sanitizeProductList(pantryStock)
    const normalizedUrgentProducts = sanitizeProductList(urgentProducts)
    const normalizedRecentRecipeNames = sanitizeStringList(recentRecipeNames)
    const recentRecipeNameSet = new Set(
      normalizedRecentRecipeNames.map((recipeName) => normalizeText(recipeName)),
    )
    const combinedStock = [...normalizedUrgentProducts, ...normalizedPantryStock]

    if (combinedStock.length === 0) {
      return { tarif: null }
    }

    let normalizedGeneratedRecipe = null
    let correctionHint = ''

    for (let attempt = 0; attempt < MAX_RECIPE_GENERATION_ATTEMPTS; attempt += 1) {
      const generated = await GenerateRecipeTool({
        ai,
        budgetProfile,
        pantryStock: combinedStock,
        urgentProducts: normalizedUrgentProducts,
        agentInstruction,
        requestMode,
        recentRecipeNames: normalizedRecentRecipeNames,
        correctionHint,
      }).catch(() => null)

      const rawGeneratedRecipe = extractFirstRecipeCandidate(generated)
      if (!rawGeneratedRecipe || typeof rawGeneratedRecipe !== 'object') {
        correctionHint = 'Tarif JSON cikti bos veya semaya uygun degildi.'
        continue
      }

      const candidateRecipe = normalizeGeneratedRecipe({
        recipe: rawGeneratedRecipe,
        pantryStock: combinedStock,
        mealName: rawGeneratedRecipe?.tarifAdi,
      })

      if (!candidateRecipe?.tarifAdi) {
        correctionHint = 'Tarif adi bos geldi, 2-3 kelimelik gecerli isim gerekli.'
        continue
      }

      if (recentRecipeNameSet.has(normalizeText(candidateRecipe.tarifAdi))) {
        correctionHint = 'recentRecipeNames listesinde olan tarifi tekrar etme, farkli isimde alternatif uret.'
        continue
      }

      const validation = validateRecipeAntiHallucination(candidateRecipe, {
        mealName: candidateRecipe?.tarifAdi,
      })
      if (!validation.valid) {
        correctionHint = validation.reason
        continue
      }

      normalizedGeneratedRecipe = candidateRecipe
      break
    }

    const selectedRecipe =
      normalizedGeneratedRecipe ||
      buildFallbackRecipe({
        pantryStock: combinedStock,
        recentRecipeNames: normalizedRecentRecipeNames,
      })

    if (!selectedRecipe) {
      return { tarif: null }
    }

    const flavorSafeRecipe = sanitizeRecipeByFlavorProfile({
      recipe: selectedRecipe,
      mealName: selectedRecipe?.tarifAdi,
    })

    const baseRecipe = {
      ...flavorSafeRecipe,
      porsiyonMaliyetiTl:
        Number(flavorSafeRecipe?.porsiyonMaliyetiTl) ||
        calculateRecipePortionCostTl({
          matchedIngredients: flavorSafeRecipe?.matchedIngredients,
          missingIngredients: flavorSafeRecipe?.missingIngredients,
          pantryStock: combinedStock,
        }),
    }

    const enrichedRecipe = await attachRecipeImageAsset({
      recipe: baseRecipe,
    })

    return {
      tarif: enrichedRecipe,
    }
  } catch (error) {
    console.error('[agent] executeKapyaAgent failed:', String(error?.message ?? error))
    return { error: true, message: AGENT_HALLUCINATION_ERROR_MESSAGE }
  }
}

export const executeRecipeByNameAgent = async ({
  mealName,
  dishCategory,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
  mealType,
  recentRecipeNames,
}) => {
  const normalizedMealName = String(mealName ?? '').trim()
  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const normalizedFocusedIngredients = sanitizeStringList(focusedIngredients)
  const normalizedPreferences = sanitizeStringList(preferences)
  const normalizedDishCategory = String(dishCategory ?? '').trim().toLocaleLowerCase('tr-TR')
  const normalizedRecentRecipeNames = sanitizeStringList(recentRecipeNames)
  const recentRecipeNameSet = new Set(
    normalizedRecentRecipeNames.map((recipeName) => normalizeText(recipeName)),
  )
  const normalizedMealType = String(mealType ?? '').trim().toLocaleLowerCase('tr-TR')
  const luckyMode = isLucky === true
  const luckyCacheBustToken = luckyMode
    ? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    : ''

  if (
    !normalizedMealName &&
    !luckyMode &&
    normalizedFocusedIngredients.length === 0 &&
    normalizedPreferences.length === 0
  ) {
    return { tarif: null }
  }

  try {
    const ai = getTextAiClient()
    let normalizedRecipe = null
    let correctionHint = ''

    for (let attempt = 0; attempt < MAX_RECIPE_GENERATION_ATTEMPTS; attempt += 1) {
      const generated = await GenerateRecipeByNameTool({
        ai,
        mealName: normalizedMealName,
        dishCategory: normalizedDishCategory,
        pantryStock: normalizedPantryStock,
        focusedIngredients: normalizedFocusedIngredients,
        preferences: normalizedPreferences,
        isLucky: luckyMode,
        mealType: normalizedMealType,
        recentRecipeNames: normalizedRecentRecipeNames,
        correctionHint,
        cacheBustToken: luckyCacheBustToken,
      }).catch(() => null)

      const rawRecipe = extractFirstRecipeCandidate(generated)
      if (!rawRecipe || typeof rawRecipe !== 'object') {
        correctionHint = 'Tarif JSON cikti bos veya semaya uygun degildi.'
        continue
      }

      let candidateRecipe = normalizeNamedRecipe({
        mealName: normalizedMealName,
        dishCategory: normalizedDishCategory,
        recipe: rawRecipe,
        pantryStock: normalizedPantryStock,
        focusedIngredients: normalizedFocusedIngredients,
        preferences: normalizedPreferences,
        isLucky: luckyMode,
      })

      if (REAL_RECIPE_FALLBACK_NAME_SET.has(normalizeText(candidateRecipe?.tarifAdi))) {
        const fallbackMealName =
          normalizedMealName ||
          (luckyMode
            ? getRandomNonRecentCatalogRecipeName(recentRecipeNameSet)
            : getFirstNonRecentCatalogRecipeName(recentRecipeNameSet))

        const catalogFallbackRecipe = buildRealRecipeFromCatalog({
          mealName: fallbackMealName,
          mealType: normalizedMealType,
          pantryStock: normalizedPantryStock,
          focusedIngredients: normalizedFocusedIngredients,
          preferences: normalizedPreferences,
        })

        if (!catalogFallbackRecipe) {
          correctionHint = 'Core malzemesi pantryStock icinde olan yeni bir varyasyon sec.'
          continue
        }

        candidateRecipe = catalogFallbackRecipe
      }

      const candidateRecipeNameKey = normalizeText(candidateRecipe?.tarifAdi)
      const shouldPreventRepeat = !normalizedMealName && recentRecipeNameSet.has(candidateRecipeNameKey)
      if (shouldPreventRepeat) {
        correctionHint = 'recentRecipeNames listesinde olan tarif adini tekrar etme, farkli tarif sec.'
        continue
      }

      const validation = validateRecipeAntiHallucination(candidateRecipe, {
        dishCategory: normalizedDishCategory,
        mealName: normalizedMealName || candidateRecipe?.tarifAdi,
      })
      if (!validation.valid) {
        correctionHint = validation.reason
        continue
      }

      normalizedRecipe = candidateRecipe
      break
    }

    if (!normalizedRecipe) {
      const fallbackMealName =
        normalizedMealName ||
        (luckyMode
          ? getRandomNonRecentCatalogRecipeName(recentRecipeNameSet)
          : getFirstNonRecentCatalogRecipeName(recentRecipeNameSet))

      normalizedRecipe = buildRealRecipeFromCatalog({
        mealName: fallbackMealName,
        mealType: normalizedMealType,
        pantryStock: normalizedPantryStock,
        focusedIngredients: normalizedFocusedIngredients,
        preferences: normalizedPreferences,
      })

      if (!normalizedRecipe) {
        return { error: true, message: AGENT_HALLUCINATION_ERROR_MESSAGE }
      }
    }

    const flavorSafeRecipe = sanitizeRecipeByFlavorProfile({
      recipe: normalizedRecipe,
      dishCategory: normalizedDishCategory,
      mealName: normalizedMealName || normalizedRecipe?.tarifAdi,
    })

    const normalizedRecipeWithCost = {
      ...flavorSafeRecipe,
      porsiyonMaliyetiTl:
        Number(flavorSafeRecipe?.porsiyonMaliyetiTl) ||
        calculateRecipePortionCostTl({
          matchedIngredients: flavorSafeRecipe?.matchedIngredients,
          missingIngredients: flavorSafeRecipe?.missingIngredients,
          pantryStock: normalizedPantryStock,
        }),
    }

    const normalizedRecipeWithImage = await attachRecipeImageAsset({
      recipe: normalizedRecipeWithCost,
    })

    return {
      tarif: normalizedRecipeWithImage,
    }
  } catch (error) {
    console.error('[agent] executeRecipeByNameAgent failed:', String(error?.message ?? error))
    return { error: true, message: AGENT_HALLUCINATION_ERROR_MESSAGE }
  }
}