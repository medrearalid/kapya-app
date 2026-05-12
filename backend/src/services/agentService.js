import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { GoogleGenAI } from '@google/genai'

const TEXT_MODEL_NAME = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash-lite'
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'

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

const NANO_BANANA_FALLBACK_IMAGE = buildInlinePlaceholderImage('Kapya Recipe')

const MIN_MISSING_INGREDIENTS = 2
const MAX_MISSING_INGREDIENTS = 3

const DEFAULT_MISSING_INGREDIENTS = [
  { isim: 'zeytinyagi', miktar: '1', birim: 'yemek kasigi' },
  { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
  { isim: 'karabiber', miktar: '1/2', birim: 'cay kasigi' },
  { isim: 'sogan', miktar: '1', birim: 'adet' },
  { isim: 'sarimsak', miktar: '1', birim: 'dis' },
  { isim: 'domates salcasi', miktar: '1', birim: 'yemek kasigi' },
]

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('\u00e7', 'c')
    .replaceAll('\u011f', 'g')
    .replaceAll('\u0131', 'i')
    .replaceAll('\u00f6', 'o')
    .replaceAll('\u015f', 's')
    .replaceAll('\u00fc', 'u')

const sanitizeProduct = (product) => ({
  name: String(product?.name ?? product?.urunAdi ?? '').trim(),
  quantity: Number(product?.quantity ?? product?.miktar ?? 0),
  unit: String(product?.unit ?? product?.birim ?? 'adet').trim() || 'adet',
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

const readLlmText = (message) => {
  const content = message?.content
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        return typeof item?.text === 'string' ? item.text : ''
      })
      .join('\n')
      .trim()
  }

  return ''
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

const ensureMissingIngredients = ({ missingIngredients, pantryNameSet, usedNameSet }) => {
  const filtered = missingIngredients
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

  if (filtered.length >= MIN_MISSING_INGREDIENTS) {
    return filtered
  }

  for (const candidate of DEFAULT_MISSING_INGREDIENTS) {
    if (filtered.length >= MIN_MISSING_INGREDIENTS) {
      break
    }

    const key = normalizeText(candidate.isim)
    if (!key || pantryNameSet.has(key) || usedNameSet.has(key)) {
      continue
    }

    usedNameSet.add(key)
    filtered.push(candidate)
  }

  return filtered.slice(0, MAX_MISSING_INGREDIENTS)
}

const buildFallbackRecipes = ({ pantryStock }) => {
  const normalizedStock = sanitizeProductList(pantryStock)
  if (normalizedStock.length === 0) {
    return []
  }

  const fallbackPool = [
    { name: 'Menemen', sure: '20 dakika' },
    { name: 'Mercimek Corbasi', sure: '35 dakika' },
    { name: 'Tavuk Sote', sure: '30 dakika' },
  ]

  return fallbackPool.map((item, index) => {
    const baseProduct = normalizedStock[index % normalizedStock.length]

    return {
      tarifAdi: item.name,
      kisaAciklama: `${baseProduct.name} merkezli, hizli hazirlanan pratik bir ev yemegi.`,
      tahminiSure: item.sure,
      goruntuUrl: buildInlinePlaceholderImage(item.name),
      matchedIngredients: [
        {
          isim: baseProduct.name,
          miktar: String(Math.max(1, Number(baseProduct.quantity) || 1)),
          birim: baseProduct.unit || 'adet',
        },
      ],
      missingIngredients: [
        { isim: 'zeytinyagi', miktar: '1', birim: 'yemek kasigi' },
        { isim: 'tuz', miktar: '1', birim: 'cay kasigi' },
      ],
      pisirmeAdimlari: [
        'Adim 1: Malzemeleri yikayip dograyin.',
        'Adim 2: Tavayi isitip ana malzemeyi pisirmeye baslayin.',
        'Adim 3: Baharatlari ekleyip lezzeti dengeleyin.',
        'Adim 4: Yemegi sicak servis edin.',
      ],
    }
  })
}

const getLlmClient = () => {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    const missingKeyError = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    missingKeyError.statusCode = 500
    throw missingKeyError
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: TEXT_MODEL_NAME,
    temperature: 0.2,
  })
}

const buildGenerateRecipePrompt = ({ budgetProfile, pantryStock, urgentProducts, agentInstruction }) => {
  const payload = {
    budgetProfile: String(budgetProfile ?? '').trim(),
    pantryStock: sanitizeProductList(pantryStock),
    urgentProducts: sanitizeProductList(urgentProducts),
    agentInstruction: String(agentInstruction ?? '').trim(),
  }

  return [
    'SYSTEM:',
    'Sen sadece Turk mutfagina ve Turkiye\'deki damak tadina hakim uzman bir sefsin.',
    'Asla cikolata ile zeytinyagi gibi birbiriyle uyumsuz, mantiksiz malzemeleri ayni tarifte birlestirme (Halusinasyon YASAK).',
    'Buzdolabindaki malzemeleri merkeze alarak 3 gercekci, pratik Turk yemegi veya evrensel ev yemegi oner.',
    '',
    'KRITIK CIKTI KURALLARI:',
    '1) Yanit STRICT JSON olmalidir, markdown veya aciklama yazma.',
    '2) JSON sadece su semaya uymali:',
    '{"tarifler":[{"tarifAdi":"string","kisaAciklama":"string","tahminiSure":"string","goruntuUrl":"string","matchedIngredients":[{"isim":"string","miktar":"string","birim":"string"}],"missingIngredients":[{"isim":"string","miktar":"string","birim":"string"}],"pisirmeAdimlari":["string"]}]}',
    '3) Tam olarak 3 tarif dondur.',
    '4) matchedIngredients yalnizca kullanicinin dolabinda olanlardan olusmali.',
    `5) missingIngredients her tarifte zorunlu olmali, en az ${MIN_MISSING_INGREDIENTS} en fazla ${MAX_MISSING_INGREDIENTS} adet olmali ve dolapta olmamali.`,
    '6) Tarifler gercek hayatta yapilabilir, dengeli ve mantikli olmali.',
    '7) Pisirme adimlari 4-7 adim olmali.',
    '8) goruntuUrl alanini bos string dondurebilirsin.',
    '',
    `GIRDI: ${JSON.stringify(payload)}`,
  ].join('\n')
}

const GenerateRecipeTool = async ({
  llm,
  budgetProfile,
  pantryStock,
  urgentProducts,
  agentInstruction,
}) => {
  const llmResponse = await llm.invoke(
    buildGenerateRecipePrompt({
      budgetProfile,
      pantryStock,
      urgentProducts,
      agentInstruction,
    }),
  )

  return parseLooseJson(readLlmText(llmResponse))
}

const PREFERENCE_PROMPT_RULES = {
  'quick-15': 'Toplam hazirlama ve pisirme suresi en fazla 15 dakika olmali.',
  'high-protein':
    'Protein odagi guclu olmali; yumurta, bakliyat, et, tavuk veya yogurt dengesi kullan.',
  'one-pot': 'Tarif tek tencere veya tek tava ile tamamlanmali.',
}

const buildGenerateRecipeByNamePrompt = ({
  mealName,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
}) => {
  const normalizedMealName = String(mealName ?? '').trim()
  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const normalizedFocusedIngredients = sanitizeStringList(focusedIngredients)
  const normalizedPreferences = sanitizeStringList(preferences)

  const dynamicInstructions = []

  if (isLucky) {
    dynamicInstructions.push(
      'SANS MODU AKTIF: Dolaptaki malzemelerden tamamen rastgele ama uygulanabilir bir kombinasyon sec ve yaratici bir tarif olustur.',
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

  if (normalizedMealName) {
    dynamicInstructions.push(`Kullanicinin hizli arama ifadesi: ${normalizedMealName}`)
  } else {
    dynamicInstructions.push('Kullanici net bir yemek ismi vermedi, tarif adini ve konsepti sen belirle.')
  }

  const payload = {
    mealName: normalizedMealName || null,
    pantryStock: normalizedPantryStock,
    focusedIngredients: normalizedFocusedIngredients,
    preferences: normalizedPreferences,
    isLucky: Boolean(isLucky),
  }

  return [
    'SYSTEM:',
    'Sen yalnizca Turk ve Anadolu mutfaginin geleneksel tekniklerine hakim uzman bir sefsin.',
    'Kullanicidan gelen coklu parametrelere gore tek bir uygulanabilir tarif olusturursun.',
    '',
    'KRITIK CIKTI KURALLARI:',
    '1) Yanit STRICT JSON olmalidir, markdown veya aciklama yazma.',
    '2) JSON sadece su semaya uymali:',
    '{"tarif":{"tarifAdi":"string","kisaAciklama":"string","tahminiSure":"string","porsiyon":"string","zorluk":"string","ortalamaKalori":"string","pufNoktasi":["string"],"matchedIngredients":[{"isim":"string","miktar":"string","birim":"string"}],"missingIngredients":[{"isim":"string","miktar":"string","birim":"string"}],"pisirmeAdimlari":["string"]}}',
    '3) pufNoktasi en az 3 madde olmali.',
    '4) pisirmeAdimlari 6-10 adim arasinda olmali.',
    '5) matchedIngredients en az 4 adet olmali.',
    '6) missingIngredients 0-4 adet olabilir.',
    '7) Tarif pratik ama geleneksel teknige sadik olmali ve verilen kisitlarla celismemeli.',
    '',
    ...dynamicInstructions,
    '',
    `GIRDI: ${JSON.stringify(payload)}`,
  ].join('\n')
}

const GenerateRecipeByNameTool = async ({
  llm,
  mealName,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
}) => {
  const llmResponse = await llm.invoke(
    buildGenerateRecipeByNamePrompt({
      mealName,
      pantryStock,
      focusedIngredients,
      preferences,
      isLucky,
    }),
  )

  return parseLooseJson(readLlmText(llmResponse))
}

const translateRecipeNameToEnglish = async ({ llm, mealNameTr }) => {
  const sourceName = String(mealNameTr ?? '').trim()
  if (!sourceName) {
    return 'Turkish homemade dish'
  }

  try {
    const response = await llm.invoke(
      [
        'Translate this Turkish dish name to natural English culinary wording.',
        'Return strict JSON only in this shape: {"englishName":"..."}',
        `Dish name: ${sourceName}`,
      ].join('\n'),
    )

    const parsed = parseLooseJson(readLlmText(response))
    const translated = String(parsed?.englishName ?? '').trim()
    return translated || sourceName
  } catch {
    return sourceName
  }
}

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

const generateImageWithGemini = async ({ prompt }) => {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    return ''
  }

  const ai = new GoogleGenAI({ apiKey })
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })

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

const NanoBananaImageTool = async ({ llm, mealNameTr, fallbackImageUrl }) => {
  const apiUrl = String(process.env.NANO_BANANA_API_URL ?? '').trim()
  const apiKey = String(process.env.NANO_BANANA_API_KEY ?? '').trim()
  const translatedMealName = await translateRecipeNameToEnglish({
    llm,
    mealNameTr,
  })

  const prompt = `Professional food photography of ${translatedMealName}, served on an elegant matte ceramic plate, top-down view, rustic wooden table background, cinematic studio lighting, hyper-realistic, 4k resolution, appetizing, Michelin star presentation style, highly detailed.`

  if (apiUrl && apiKey) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          size: '1024x1024',
          aspectRatio: '1:1',
          n: 1,
        }),
      })

      if (response.ok) {
        const payload = await response.json().catch(() => null)
        const imageFromPayload = extractNanoBananaImageFromPayload(payload)
        if (imageFromPayload) {
          return imageFromPayload
        }
      }
    } catch {
      // Intentionally silent: fallback path handles image generation.
    }
  }

  const geminiImage = await generateImageWithGemini({ prompt })
  if (geminiImage) {
    return geminiImage
  }

  const keylessImageUrl = buildKeylessPromptImageUrl({ prompt, mealNameTr })
  const keylessImageDataUri = await fetchImageAsDataUri(keylessImageUrl)
  if (keylessImageDataUri) {
    return keylessImageDataUri
  }

  const stockFoodImageUrl = buildStockFoodImageUrl({ mealNameTr })
  const stockFoodImageDataUri = await fetchImageAsDataUri(stockFoodImageUrl)
  if (stockFoodImageDataUri) {
    return stockFoodImageDataUri
  }

  return String(fallbackImageUrl ?? '').trim() || buildInlinePlaceholderImage(mealNameTr)
}

const normalizeGeneratedRecipe = ({ recipe, pantryStock }) => {
  const pantryNameSet = buildPantryNameSet(pantryStock)
  const normalizedPantryStock = sanitizeProductList(pantryStock)

  const matchedIngredientsRaw = sanitizeIngredientList(recipe?.matchedIngredients)
  let matchedIngredients = matchedIngredientsRaw.filter((ingredient) =>
    isIngredientInPantry(ingredient.isim, pantryNameSet),
  )

  if (matchedIngredients.length === 0) {
    matchedIngredients = normalizedPantryStock.slice(0, 2).map((item) => ({
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
  })

  const pisirmeAdimlari = (Array.isArray(recipe?.pisirmeAdimlari) ? recipe.pisirmeAdimlari : [])
    .map((step) => String(step ?? '').trim())
    .filter(Boolean)
    .slice(0, 8)

  const recipeName = String(recipe?.tarifAdi ?? '').trim() || 'Pratik Ev Yemegi'

  return {
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
  }
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
  const normalizedRecipeName = String(rawRecipeName ?? '').trim()
  if (normalizedRecipeName) {
    return normalizedRecipeName
  }

  const normalizedMealName = String(mealName ?? '').trim()
  if (normalizedMealName) {
    return normalizedMealName
  }

  if (isLucky) {
    return 'Sansli Sef Tabagi'
  }

  return focusedIngredients.length > 0 ? 'Odak Malzeme Tarifi' : 'Sef Onerisi'
}

const buildDefaultMatchedIngredients = (recipeName) => [
  { isim: recipeName, miktar: '500', birim: 'gram' },
  { isim: 'sogan', miktar: '1', birim: 'adet' },
  { isim: 'zeytinyagi', miktar: '2', birim: 'yemek kasigi' },
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
    const sourceIngredients = isLucky ? [...pantryStock].sort(() => Math.random() - 0.5) : pantryStock

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

  const matchedIngredients = mergeFocusedIngredients({
    matchedIngredients: sanitizeIngredientList(recipe?.matchedIngredients),
    pantryStock: normalizedPantryStock,
    focusedIngredients: normalizedFocusedIngredients,
    recipeName,
    isLucky,
  })

  const missingIngredients = sanitizeIngredientList(recipe?.missingIngredients).slice(0, 4)
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

  return {
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
    goruntuUrl: String(recipe?.goruntuUrl ?? '').trim() || buildInlinePlaceholderImage(recipeName),
  }
}

export const executeKapyaAgent = async ({
  budgetProfile,
  pantryStock,
  urgentProducts,
  agentInstruction,
}) => {
  const llm = getLlmClient()

  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const normalizedUrgentProducts = sanitizeProductList(urgentProducts)
  const combinedStock = [...normalizedUrgentProducts, ...normalizedPantryStock]

  if (combinedStock.length === 0) {
    return { tarifler: [] }
  }

  const generated = await GenerateRecipeTool({
    llm,
    budgetProfile,
    pantryStock: combinedStock,
    urgentProducts: normalizedUrgentProducts,
    agentInstruction,
  }).catch(() => null)

  const generatedRecipes = Array.isArray(generated?.tarifler) ? generated.tarifler : []
  const normalizedRecipes = generatedRecipes
    .map((recipe) => normalizeGeneratedRecipe({ recipe, pantryStock: combinedStock }))
    .filter((recipe) => recipe.tarifAdi)

  const fallbackRecipes = buildFallbackRecipes({ pantryStock: combinedStock })
  const fallbackMap = new Map(
    fallbackRecipes.map((recipe) => [normalizeText(recipe.tarifAdi), recipe]),
  )

  for (const recipe of normalizedRecipes) {
    fallbackMap.delete(normalizeText(recipe.tarifAdi))
  }

  const tarifler = [...normalizedRecipes, ...Array.from(fallbackMap.values())].slice(0, 3)

  const enrichedRecipes = await Promise.all(
    tarifler.map(async (recipe) => ({
      ...recipe,
      goruntuUrl: await NanoBananaImageTool({
        llm,
        mealNameTr: recipe.tarifAdi,
        fallbackImageUrl: recipe.goruntuUrl,
      }),
    })),
  )

  return {
    tarifler: enrichedRecipes,
  }
}

export const executeRecipeByNameAgent = async ({
  mealName,
  pantryStock,
  focusedIngredients,
  preferences,
  isLucky,
}) => {
  const normalizedMealName = String(mealName ?? '').trim()
  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const normalizedFocusedIngredients = sanitizeStringList(focusedIngredients)
  const normalizedPreferences = sanitizeStringList(preferences)
  const luckyMode = isLucky === true

  if (
    !normalizedMealName &&
    !luckyMode &&
    normalizedFocusedIngredients.length === 0 &&
    normalizedPreferences.length === 0
  ) {
    return { tarif: null }
  }

  const llm = getLlmClient()

  const generated = await GenerateRecipeByNameTool({
    llm,
    mealName: normalizedMealName,
    pantryStock: normalizedPantryStock,
    focusedIngredients: normalizedFocusedIngredients,
    preferences: normalizedPreferences,
    isLucky: luckyMode,
  }).catch(() => null)

  const rawRecipe = generated?.tarif && typeof generated.tarif === 'object' ? generated.tarif : generated
  const normalizedRecipe = normalizeNamedRecipe({
    mealName: normalizedMealName,
    recipe: rawRecipe,
    pantryStock: normalizedPantryStock,
    focusedIngredients: normalizedFocusedIngredients,
    preferences: normalizedPreferences,
    isLucky: luckyMode,
  })

  return {
    tarif: {
      ...normalizedRecipe,
      goruntuUrl: await NanoBananaImageTool({
        llm,
        mealNameTr: normalizedRecipe.tarifAdi,
        fallbackImageUrl: normalizedRecipe.goruntuUrl,
      }),
    },
  }
}