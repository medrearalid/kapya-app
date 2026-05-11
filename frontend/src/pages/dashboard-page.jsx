import { useMemo, useState } from 'react'
import { AlertTriangle, Boxes, LoaderCircle, Siren, Sparkles, Wallet } from 'lucide-react'
import { usePantryStore } from '../store/pantry-store'
import { generateWasteSaverRecipes } from '../services/recipe-agent-api'

const MS_PER_DAY = 1000 * 60 * 60 * 24

const calculateDaysLeft = (dateValue) => {
  const targetDate = new Date(dateValue)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  )

  return Math.ceil((startOfTarget - startOfToday) / MS_PER_DAY)
}

function DashboardPage() {
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)

  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false)
  const [generatedRecipes, setGeneratedRecipes] = useState([])
  const [requestError, setRequestError] = useState('')

  const urgentProducts = useMemo(
    () =>
      products.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft <= 2
      }),
    [products],
  )

  const expiringSoonProducts = useMemo(
    () =>
      products.filter((product) => {
        const daysLeft = calculateDaysLeft(product.estimatedShelfLifeEndDate)
        return daysLeft >= 0 && daysLeft <= 3
      }),
    [products],
  )

  const handleGenerateRecipes = async () => {
    setIsGeneratingRecipes(true)
    setRequestError('')

    try {
      const recipeData = await generateWasteSaverRecipes({
        budgetProfile: selectedBudgetProfile,
        pantryStock: products,
        urgentProducts,
      })

      setGeneratedRecipes(Array.isArray(recipeData?.tarifler) ? recipeData.tarifler : [])
    } catch (error) {
      setGeneratedRecipes([])
      setRequestError(error?.message || 'Tarifler uretilirken bir hata olustu.')
    } finally {
      setIsGeneratingRecipes(false)
    }
  }

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-900">
          <Siren className="h-4 w-4" aria-hidden="true" />
          Tuketilmesi Gerekenler (Kirmizi Alarm)
        </p>

        {urgentProducts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {urgentProducts.map((product) => (
              <li
                key={product.id}
                className="rounded-xl border border-orange-200 bg-white/80 px-3 py-2 text-sm text-red-900"
              >
                <span className="font-semibold">{product.name}</span> - {product.quantity}{' '}
                {product.unit} - SKT {product.estimatedShelfLifeEndDate}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-red-800">Bugun kritik seviyede urun bulunmuyor.</p>
        )}

        <button
          type="button"
          onClick={handleGenerateRecipes}
          disabled={isGeneratingRecipes || urgentProducts.length === 0}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {isGeneratingRecipes ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              Tarifler uretiliyor...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Beni Israftan Kurtar / Tarif Uret
            </>
          )}
        </button>

        {requestError ? <p className="mt-2 text-xs text-red-900">{requestError}</p> : null}
      </article>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700">Ana Ekran</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-900 sm:text-3xl">Dashboard</h1>
      </header>

      <div className="grid gap-3">
        <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-900">
            <Wallet className="h-4 w-4" aria-hidden="true" />
            Secili Butce Profili
          </p>
          <p className="mt-2 text-lg font-medium capitalize text-sand-900">{selectedBudgetProfile}</p>
        </article>

        <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-sand-900">
            <Boxes className="h-4 w-4" aria-hidden="true" />
            Toplam Urun
          </p>
          <p className="mt-2 text-lg font-medium text-sand-900">{products.length}</p>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Yaklasan Raf Omru Uyarilari
          </p>
          <p className="mt-2 text-sm text-amber-900">
            {expiringSoonProducts.length > 0
              ? `${expiringSoonProducts.length} urun icin tuketim plani olusturulabilir.`
              : 'Simdilik kritik urun yok.'}
          </p>
        </article>

        {generatedRecipes.length > 0 ? (
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-900">
              Proaktif Tarif Onerileri
            </p>
            <ul className="mt-3 space-y-3">
              {generatedRecipes.map((recipe, index) => (
                <li key={`${recipe.tarifAdi}-${index}`} className="rounded-xl bg-white/85 p-3">
                  <p className="text-sm font-semibold text-emerald-900">{recipe.tarifAdi}</p>
                  <p className="mt-1 text-xs text-emerald-800">{recipe.kisaAciklama}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-900">
                    Porsiyon maliyeti: {recipe.tahminiPorsiyonBasiMaliyet}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}
      </div>
    </section>
  )
}

export default DashboardPage