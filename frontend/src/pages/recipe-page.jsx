import { Lightbulb, Sparkles } from 'lucide-react'
import { usePantryStore } from '../store/pantry-store'

function RecipePage() {
  const selectedBudgetProfile = usePantryStore((state) => state.selectedBudgetProfile)
  const products = usePantryStore((state) => state.products)

  const ingredientPreview = products.slice(0, 4).map((product) => product.name)

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand-700">Tarif</p>
        <h1 className="mt-2 text-2xl font-semibold text-sand-900 sm:text-3xl">Yapay Zeka Onerileri</h1>
      </header>

      <article className="rounded-2xl border border-sand-100 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-sand-900">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Oneri Parametreleri
        </p>
        <p className="mt-2 text-sm text-sand-700">Butce modu: {selectedBudgetProfile}</p>
        <p className="mt-1 text-sm text-sand-700">
          Kullanilabilir urunler: {ingredientPreview.length > 0 ? ingredientPreview.join(', ') : 'Henüz urun yok'}
        </p>
      </article>

      <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          Tarif Iskeleti
        </p>
        <p className="mt-2 text-sm text-emerald-900">
          Bu alan, AI servisinden gelen tarif onerilerinin listelenecegi ekran iskeletidir.
        </p>
      </article>
    </section>
  )
}

export default RecipePage