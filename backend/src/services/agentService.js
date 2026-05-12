import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

const MEAL_DB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1'
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const NANO_BANANA_FALLBACK_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5J2nEAAAAASUVORK5CYII='

const MAX_MISSING_INGREDIENTS = 3

const TR_TO_EN_INGREDIENT_MAP = {
  yumurta: 'egg',
  sut: 'milk',
  peynir: 'cheese',
  yogurt: 'yogurt',
  tereyagi: 'butter',
  margarin: 'margarine',
  zeytinyagi: 'olive oil',
  aycicek_yagi: 'sunflower oil',
  domates: 'tomato',
  salatalik: 'cucumber',
  biber: 'pepper',
  patates: 'potato',
  sogan: 'onion',
  sarimsak: 'garlic',
  havuc: 'carrot',
  pirinc: 'rice',
  makarna: 'pasta',
  tavuk: 'chicken',
  et: 'beef',
  kiyma: 'minced beef',
  nohut: 'chickpea',
  mercimek: 'lentil',
  fasulye: 'beans',
  ekmek: 'bread',
  un: 'flour',
  seker: 'sugar',
  tuz: 'salt',
  karabiber: 'black pepper',
  maydanoz: 'parsley',
  dereotu: 'dill',
  limon: 'lemon',
}

const UNIT_MAP = {
  tbsp: 'yemek kasigi',
  tablespoons: 'yemek kasigi',
  tablespoon: 'yemek kasigi',
  tsp: 'cay kasigi',
  teaspoon: 'cay kasigi',
  teaspoons: 'cay kasigi',
  cup: 'su bardagi',
  cups: 'su bardagi',
  g: 'gram',
  gram: 'gram',
  grams: 'gram',
  kg: 'kilogram',
  ml: 'mililitre',
  l: 'litre',
  litre: 'litre',
  liter: 'litre',
  pinch: 'tutam',
  cloves: 'dis',
  clove: 'dis',
  piece: 'adet',
  pieces: 'adet',
}

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')

const normalizeEnglishText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, ' ')
    .replaceAll(/\s+/g, ' ')

const sanitizeProduct = (product) => ({
  name: String(product?.name ?? product?.urunAdi ?? '').trim(),
  quantity: Number(product?.quantity ?? product?.miktar ?? 0),
  unit: String(product?.unit ?? product?.birim ?? 'adet').trim() || 'adet',
})

const sanitizeProductList = (products) =>
  (Array.isArray(products) ? products : []).map(sanitizeProduct).filter((item) => item.name)

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

const fractionToNumber = (value) => {
  const text = String(value ?? '').trim()
  if (!text) {
    return null
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return Number(text)
  }

  if (/^\d+\/\d+$/.test(text)) {
    const [numerator, denominator] = text.split('/').map(Number)
    if (denominator === 0) {
      return null
    }
    return numerator / denominator
  }

  if (/^\d+\s+\d+\/\d+$/.test(text)) {
    const [whole, fraction] = text.split(' ')
    const wholeNumber = Number(whole)
    const fractionNumber = fractionToNumber(fraction)
    if (!Number.isFinite(wholeNumber) || !Number.isFinite(fractionNumber)) {
      return null
    }
    return wholeNumber + fractionNumber
  }

  return null
}

const parseMeasure = (measureText) => {
  const raw = String(measureText ?? '').trim()
  if (!raw) {
    return { miktar: '1', birim: 'adet' }
  }

  const compact = raw.replaceAll(',', '.')
  const match = /^([\d./\s]+)?\s*([A-Za-z]+)?/.exec(compact)
  const amountCandidate = String(match?.[1] ?? '').trim()
  const unitCandidate = normalizeEnglishText(match?.[2] ?? '')
  const numericAmount = fractionToNumber(amountCandidate)
  const miktar =
    numericAmount === null
      ? amountCandidate || '1'
      : String(Number(numericAmount.toFixed(2)))

  return {
    miktar,
    birim: UNIT_MAP[unitCandidate] || unitCandidate || 'adet',
  }
}

const extractMealIngredients = (mealDetails) => {
  const ingredients = []

  for (let index = 1; index <= 20; index += 1) {
    const englishName = String(mealDetails?.[`strIngredient${index}`] ?? '').trim()
    if (!englishName) {
      continue
    }

    const measure = String(mealDetails?.[`strMeasure${index}`] ?? '').trim()
    ingredients.push({
      englishName,
      measure,
      ...parseMeasure(measure),
    })
  }

  return ingredients
}

const fetchJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`External API request failed: ${response.status}`)
  }
  return response.json()
}

const fetchMealIdsByIngredient = async (ingredientEnglish) => {
  const queryValue = encodeURIComponent(String(ingredientEnglish ?? '').trim())
  if (!queryValue) {
    return []
  }

  const payload = await fetchJson(`${MEAL_DB_BASE_URL}/filter.php?i=${queryValue}`)
  const meals = Array.isArray(payload?.meals) ? payload.meals : []
  return meals
    .map((meal) => String(meal?.idMeal ?? '').trim())
    .filter(Boolean)
}

const fetchMealDetailById = async (mealId) => {
  const payload = await fetchJson(`${MEAL_DB_BASE_URL}/lookup.php?i=${encodeURIComponent(mealId)}`)
  const meal = Array.isArray(payload?.meals) ? payload.meals[0] : null
  if (!meal) {
    return null
  }

  return {
    idMeal: String(meal.idMeal),
    strMeal: String(meal.strMeal ?? '').trim(),
    strMealThumb: String(meal.strMealThumb ?? '').trim(),
    strInstructions: String(meal.strInstructions ?? '').trim(),
    ingredients: extractMealIngredients(meal),
  }
}

const isIngredientInStock = (ingredientEnglish, pantryEnglishNames) => {
  const normalizedIngredient = normalizeEnglishText(ingredientEnglish)
  if (!normalizedIngredient) {
    return false
  }

  return pantryEnglishNames.some((pantryName) => {
    if (!pantryName) {
      return false
    }

    if (pantryName === normalizedIngredient) {
      return true
    }

    return pantryName.includes(normalizedIngredient) || normalizedIngredient.includes(pantryName)
  })
}

const getLlmClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) {
    const missingKeyError = new Error('Sunucuda GEMINI_API_KEY tanimli degil.')
    missingKeyError.statusCode = 500
    throw missingKeyError
  }

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: MODEL_NAME,
    temperature: 0.2,
  })
}

const getLlmClientOrNull = () => {
  try {
    return getLlmClient()
  } catch {
    return null
  }
}

const translateIngredientNamesToEnglish = async ({ llm, pantryIngredientNames }) => {
  const normalizedNames = pantryIngredientNames
    .map((name) => String(name ?? '').trim())
    .filter(Boolean)

  if (normalizedNames.length === 0) {
    return []
  }

  const missingNames = normalizedNames.filter((name) => {
    const key = normalizeText(name).replaceAll(' ', '_')
    return !TR_TO_EN_INGREDIENT_MAP[key]
  })

  const fallbackTranslations = normalizedNames.map((name) => {
    const key = normalizeText(name).replaceAll(' ', '_')
    return {
      source: name,
      english: TR_TO_EN_INGREDIENT_MAP[key] || name,
    }
  })

  if (missingNames.length === 0) {
    return fallbackTranslations
  }

  if (!llm) {
    return fallbackTranslations
  }

  const prompt = [
    'Translate Turkish pantry ingredient names to concise culinary English.',
    'Return STRICT JSON only in this format:',
    '{"translations":[{"source":"...","english":"..."}]}',
    'Rules:',
    '- Preserve ingredient meaning in kitchen context.',
    '- Use lowercase English names.',
    `Ingredients: ${JSON.stringify(missingNames)}`,
  ].join('\n')

  const llmResponse = await llm.invoke(prompt)
  const parsed = parseLooseJson(readLlmText(llmResponse))
  const translatedItems = Array.isArray(parsed?.translations) ? parsed.translations : []

  const translationMap = new Map()
  translatedItems.forEach((item) => {
    const source = String(item?.source ?? '').trim()
    const english = String(item?.english ?? '').trim()
    if (source && english) {
      translationMap.set(source, english)
    }
  })

  return fallbackTranslations.map((item) => ({
    ...item,
    english: translationMap.get(item.source) || item.english,
  }))
}

const buildConstraintTranslatorOutput = async ({ llm, acceptedMeals }) => {
  if (acceptedMeals.length === 0 || !llm) {
    return []
  }

  const payload = acceptedMeals.map((meal) => ({
    mealId: meal.idMeal,
    mealName: meal.strMeal,
    instructions: meal.strInstructions,
    ingredients: meal.ingredients.map((ingredient) => ({
      englishName: ingredient.englishName,
      measure: ingredient.measure,
    })),
  }))

  const prompt = [
    'You are ConstraintTranslator_Tool for a Turkish recipe assistant.',
    'Return STRICT JSON only in this format:',
    '{"recipes":[{"mealId":"...","tarifAdi":"...","kisaAciklama":"...","tahminiSuresi":"...","pisirmeAdimlari":["Adim 1..."],"ingredientTranslations":[{"englishName":"...","isim":"...","miktar":"...","birim":"..."}]}]}',
    'Rules:',
    '1) Turkish must be natural and culinary-correct.',
    '2) Convert ingredient measures naturally (example: 2 Tbsp Olive Oil -> 2 yemek kasigi zeytinyagi).',
    '3) Keep 4-8 clear cooking steps per recipe.',
    '4) Keep ingredientTranslations complete for each ingredient in input.',
    `Input recipes: ${JSON.stringify(payload)}`,
  ].join('\n')

  const llmResponse = await llm.invoke(prompt)
  const parsed = parseLooseJson(readLlmText(llmResponse))
  return Array.isArray(parsed?.recipes) ? parsed.recipes : []
}

const fallbackTurkishName = (englishName) => {
  const normalized = normalizeEnglishText(englishName)
  const match = Object.entries(TR_TO_EN_INGREDIENT_MAP).find(([, value]) => value === normalized)
  if (!match) {
    return englishName
  }
  return match[0].replaceAll('_', ' ')
}

const toCompactIngredient = (ingredient, translatedIngredient) => {
  return {
    isim:
      String(translatedIngredient?.isim ?? '').trim() || fallbackTurkishName(ingredient.englishName),
    miktar:
      String(translatedIngredient?.miktar ?? '').trim() || String(ingredient.miktar ?? '1').trim() || '1',
    birim:
      String(translatedIngredient?.birim ?? '').trim() || String(ingredient.birim ?? 'adet').trim() || 'adet',
  }
}

const splitMatchedAndMissingIngredients = ({
  ingredients,
  pantryEnglishSet,
  translatedIngredientMap,
}) => {
  const matchedIngredients = []
  const missingIngredients = []

  ingredients.forEach((ingredient) => {
    const translatedIngredient = translatedIngredientMap.get(normalizeEnglishText(ingredient.englishName))
    const compactIngredient = toCompactIngredient(ingredient, translatedIngredient)

    if (isIngredientInStock(ingredient.englishName, Array.from(pantryEnglishSet))) {
      matchedIngredients.push(compactIngredient)
    } else {
      missingIngredients.push(compactIngredient)
    }
  })

  return { matchedIngredients, missingIngredients }
}

const buildCookingStepsFallback = (instructionsText) => {
  const chunks = String(instructionsText ?? '')
    .split(/\r?\n|\./)
    .map((step) => step.trim())
    .filter(Boolean)
    .slice(0, 8)

  if (chunks.length === 0) {
    return ['Adim 1: Malzemeleri hazirlayin.', 'Adim 2: Pisirme islemini tarife gore tamamlayin.']
  }

  return chunks.map((step, index) => `Adim ${index + 1}: ${step}`)
}

const NanoBananaImageTool = async ({ mealNameTr, mealNameEn, fallbackImageUrl }) => {
  const apiUrl = String(process.env.NANO_BANANA_API_URL ?? '').trim()
  const apiKey = String(process.env.NANO_BANANA_API_KEY ?? '').trim()

  if (apiUrl && apiKey) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: `Plate photo of cooked dish: ${mealNameTr || mealNameEn}`,
          size: '1024x1024',
        }),
      })

      if (response.ok) {
        const payload = await response.json().catch(() => null)
        const imageUrl = String(payload?.imageUrl ?? '').trim()
        const base64Image = String(payload?.base64 ?? '').trim()

        if (imageUrl) {
          return imageUrl
        }

        if (base64Image) {
          return `data:image/png;base64,${base64Image}`
        }
      }
    } catch {
      // Fallback path intentionally silent.
    }
  }

  return String(fallbackImageUrl ?? '').trim() || NANO_BANANA_FALLBACK_IMAGE
}

const rankMealsByStockFit = ({ mealDetails, pantryEnglishSet }) => {
  const pantryEnglishNames = Array.from(pantryEnglishSet)

  return mealDetails
    .map((meal) => {
      const ingredientCount = meal.ingredients.length
      const missingCount = meal.ingredients.filter(
        (ingredient) => !isIngredientInStock(ingredient.englishName, pantryEnglishNames),
      ).length

      return {
        ...meal,
        ingredientCount,
        missingCount,
        matchedCount: Math.max(ingredientCount - missingCount, 0),
      }
    })
    .sort((left, right) => {
      if (left.missingCount !== right.missingCount) {
        return left.missingCount - right.missingCount
      }
      return right.matchedCount - left.matchedCount
    })
}

const buildPantryFallbackRecipes = ({ pantryStock }) => {
  const stock = sanitizeProductList(pantryStock)
  if (stock.length === 0) {
    return []
  }

  return stock.slice(0, 3).map((product, index) => {
    const dishName = `${product.name} Tavasi`

    return {
      tarifAdi: dishName,
      kisaAciklama: 'Stoktaki urunleri hizla degerlendirmek icin pratik bir alternatif.',
      tahminiSuresi: '20-30 dakika',
      goruntuUrl: NANO_BANANA_FALLBACK_IMAGE,
      matchedIngredients: [
        {
          isim: product.name,
          miktar: String(Math.max(1, Number(product.quantity) || 1)),
          birim: product.unit || 'adet',
        },
      ],
      missingIngredients: [
        {
          isim: 'zeytinyagi',
          miktar: '1',
          birim: 'yemek kasigi',
        },
      ],
      pisirmeAdimlari: [
        `Adim 1: ${product.name} malzemesini hazirlayin.`,
        'Adim 2: Tavayi isitin ve az miktarda yag ekleyin.',
        'Adim 3: Malzemeleri orta ateste kontrollu sekilde pisirin.',
        `Adim 4: Sicakken servis edin.${index === 0 ? '' : ' Istege gore baharat ekleyin.'}`,
      ],
    }
  })
}

export const executeKapyaAgent = async ({ pantryStock, urgentProducts }) => {
  const llm = getLlmClientOrNull()

  const normalizedPantryStock = sanitizeProductList(pantryStock)
  const normalizedUrgentProducts = sanitizeProductList(urgentProducts)
  const combinedStock = [...normalizedUrgentProducts, ...normalizedPantryStock]

  const pantryIngredientNames = Array.from(new Set(combinedStock.map((item) => item.name.trim())))

  if (pantryIngredientNames.length === 0) {
    return { tarifler: [] }
  }

  const translations = await translateIngredientNamesToEnglish({
    llm,
    pantryIngredientNames,
  })

  const pantryEnglishSet = new Set(
    translations.map((item) => normalizeEnglishText(item.english)).filter(Boolean),
  )

  const englishIngredientList = Array.from(pantryEnglishSet).slice(0, 8)
  const mealIdGroups = await Promise.all(
    englishIngredientList.map((ingredient) => fetchMealIdsByIngredient(ingredient)),
  )

  const mealIds = Array.from(new Set(mealIdGroups.flat())).slice(0, 24)
  if (mealIds.length === 0) {
    return {
      tarifler: buildPantryFallbackRecipes({ pantryStock: combinedStock }),
    }
  }

  const rawMealDetails = await Promise.all(mealIds.map((mealId) => fetchMealDetailById(mealId)))
  const mealDetails = rawMealDetails
    .filter(Boolean)
    .filter((meal) => Array.isArray(meal.ingredients) && meal.ingredients.length > 0)

  if (mealDetails.length === 0) {
    return {
      tarifler: buildPantryFallbackRecipes({ pantryStock: combinedStock }),
    }
  }

  const rankedMeals = rankMealsByStockFit({
    mealDetails,
    pantryEnglishSet,
  })

  const strictMeals = rankedMeals.filter((meal) => meal.missingCount <= MAX_MISSING_INGREDIENTS)
  const acceptedMeals =
    strictMeals.length > 0
      ? strictMeals.slice(0, 3)
      : rankedMeals.slice(0, 3)

  if (acceptedMeals.length === 0) {
    return {
      tarifler: buildPantryFallbackRecipes({ pantryStock: combinedStock }),
    }
  }

  const translatedRecipes = await buildConstraintTranslatorOutput({
    llm,
    acceptedMeals,
  })

  const translatedRecipeMap = new Map()
  translatedRecipes.forEach((recipe) => {
    const mealId = String(recipe?.mealId ?? '').trim()
    if (mealId) {
      translatedRecipeMap.set(mealId, recipe)
    }
  })

  const tarifler = await Promise.all(
    acceptedMeals.map(async (meal) => {
      const translatedRecipe = translatedRecipeMap.get(meal.idMeal)
      const translatedIngredientMap = new Map(
        (Array.isArray(translatedRecipe?.ingredientTranslations)
          ? translatedRecipe.ingredientTranslations
          : []
        )
          .map((item) => ({
            key: normalizeEnglishText(item?.englishName),
            value: item,
          }))
          .filter((item) => item.key)
          .map((item) => [item.key, item.value]),
      )

      const { matchedIngredients, missingIngredients } = splitMatchedAndMissingIngredients({
        ingredients: meal.ingredients,
        pantryEnglishSet,
        translatedIngredientMap,
      })

      const translatedName = String(translatedRecipe?.tarifAdi ?? '').trim()
      const imageUrl = await NanoBananaImageTool({
        mealNameTr: translatedName,
        mealNameEn: meal.strMeal,
        fallbackImageUrl: meal.strMealThumb,
      })

      return {
        tarifAdi: translatedName || meal.strMeal,
        kisaAciklama:
          String(translatedRecipe?.kisaAciklama ?? '').trim() ||
          'Mevcut stokla hizli sekilde hazirlanabilen dengeli bir tarif.',
        tahminiSuresi: String(translatedRecipe?.tahminiSuresi ?? '').trim() || '30-45 dakika',
        goruntuUrl: imageUrl,
        matchedIngredients,
        missingIngredients,
        pisirmeAdimlari:
          Array.isArray(translatedRecipe?.pisirmeAdimlari) && translatedRecipe.pisirmeAdimlari.length
            ? translatedRecipe.pisirmeAdimlari.map((step) => String(step ?? '').trim()).filter(Boolean)
            : buildCookingStepsFallback(meal.strInstructions),
      }
    }),
  )

  if (tarifler.length === 0) {
    return {
      tarifler: buildPantryFallbackRecipes({ pantryStock: combinedStock }),
    }
  }

  return { tarifler }
}
