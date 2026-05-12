# Kapya

Kapya, mutfak stok yonetimi, yemek planlama ve AI destekli tarif uretimini tek bir mobil-oncelikli deneyimde birlestiren bir web uygulamasidir. Proje, gida israfini azaltmaya odaklanir ve kullanicinin dolabindaki urunleri merkeze alarak uygulanabilir yemek onerileri sunar.

## Neden Kapya?

- Dolaptaki urunleri ve son tuketim tarihlerini tek ekranda takip etmeyi kolaylastirir.
- Fis gorselinden gida urunlerini ayiklayip otomatik stok guncellemesini destekler.
- Butce profiline gore 3 farkli tarif onerisi uretir.
- Tarifleri ogle/aksam planina ekleyerek haftalik duzeni guclendirir.
- LocalStorage tabanli kalicilik sayesinde kullanici deneyimini hizlandirir.

## Ozellikler

### 1) Kiler (Pantry) Yonetimi
- Urun ekleme, guncelleme, birlestirme ve silme
- Birim bazli takip: adet, gram, kilogram, paket, bag, litre, mililitre
- Tahmini raf omru bitis tarihine gore stok gorunurlugu

### 2) Fis Analizi (AI Vision)
- Fis gorselini base64 veya data URL formatinda alir
- Once gorselin fis olup olmadigini siniflandirir
- Sonra sadece uygun gida urunlerini JSON formatinda cikarir
- Hazir tuketime uygun urunleri ve gida disi kalemleri filtreler

### 3) Israf Azaltan Tarif Ajanı
- Butce profili + mevcut stok + acil urunler girdisiyle calisir
- Tam olarak 3 tarif dondurur
- Her tarifte eslesen ve eksik malzemeleri ayristirir
- Tarif gorseli icin coklu fallback stratejisi uygular

### 4) Yemek Planlayici
- Tarifleri ogle/aksam olarak takvime ekleme
- Porsiyon boyutu secimi
- Tamamlandi/tamamlanmadi durum takibi

### 5) UX Katmani
- Mobile-first arayuz
- Karanlik/aydinlik tema
- TR/EN dil destegi
- Onboarding akisi ve global hata gosterimi

## Mimari

Proje monorepo yapisindadir:

- frontend: React + Vite istemci uygulamasi
- backend: Express tabanli API katmani

Veri saklama yaklasimi:

- Frontend uygulama durumu: LocalStorage (Zustand persist)
- Backend gecici isleme: in-memory is akislari

## Teknoloji Yigini

### Frontend
- React 19
- Vite 8
- Tailwind CSS 3
- Zustand 5
- React Router 7
- i18next
- Framer Motion

### Backend
- Node.js + Express 5
- @google/genai
- @langchain/google-genai
- dotenv
- cors

## Dizin Yapisi

```text
kapya-app/
  frontend/
    src/
      components/
      pages/
      services/
      store/
      utils/
  backend/
    src/
      controllers/
      routes/
      services/
      scripts/
```

## Gereksinimler

- Node.js 20+
- npm 10+
- Google Gemini API anahtari

## Kurulum

1. Depoyu klonlayin.
2. Bagimliliklari yukleyin:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Ortam Degiskenleri

### backend/.env

```env
# API
PORT=3001
GEMINI_API_KEY=your_api_key_here

# Opsiyonel model override ayarlari
GEMINI_MODEL=gemini-2.5-flash
GEMINI_VISION_MODEL=gemini-2.5-flash-lite
GEMINI_RECEIPT_CLASSIFIER_MODEL=gemini-2.5-flash-lite
GEMINI_TEXT_MODEL=gemini-3.1-flash-lite
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image-preview

# Opsiyonel harici gorsel servisi
NANO_BANANA_API_URL=
NANO_BANANA_API_KEY=
```

### frontend/.env

```env
VITE_API_BASE_URL=http://localhost:3001
```

## Gelistirme Modunda Calistirma

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

## Production Build

Frontend build:

```bash
cd frontend
npm run build
```

Backend production baslatma:

```bash
cd backend
npm start
```

## API Ozeti

### Health Check
- Method: GET
- Path: /health
- Response:

```json
{ "status": "ok" }
```

### Fis Analizi
- Method: POST
- Path: /api/receipts/analyze
- Request body:

```json
{
  "imageBase64": "data:image/jpeg;base64,..."
}
```

- Basarili response:

```json
{
  "success": true,
  "data": [
    {
      "name": "Yumurta",
      "quantity": 10,
      "unit": "adet",
      "estimatedShelfLifeDays": 9
    }
  ]
}
```

### Israf Azaltan Tarif Uretimi
- Method: POST
- Path: /api/ai/recipes/waste-saver
- Request body:

```json
{
  "budgetProfile": "ogrenci",
  "pantryStock": [
    {
      "name": "Yumurta",
      "quantity": 4,
      "unit": "adet",
      "estimatedShelfLifeEndDate": "2026-05-14"
    }
  ],
  "urgentProducts": [
    {
      "name": "Yumurta",
      "quantity": 4,
      "unit": "adet",
      "estimatedShelfLifeEndDate": "2026-05-14"
    }
  ],
  "agentInstruction": "Protein agirlikli secenekler",
  "requestMode": "default"
}
```

- Basarili response:

```json
{
  "success": true,
  "data": {
    "tarifler": [
      {
        "tarifAdi": "Menemen",
        "kisaAciklama": "...",
        "tahminiSure": "20 dakika",
        "goruntuUrl": "data:image/...",
        "matchedIngredients": [
          { "isim": "Yumurta", "miktar": "4", "birim": "adet" }
        ],
        "missingIngredients": [
          { "isim": "zeytinyagi", "miktar": "1", "birim": "yemek kasigi" }
        ],
        "pisirmeAdimlari": ["Adim 1", "Adim 2"]
      }
    ]
  }
}
```

## Smoke Test

Backend smoke test script'i:

```bash
cd backend
npm run test:smoke
```

Opsiyonel degiskenler:

- TEST_API_BASE_URL: Varsayilan deger http://localhost:5000
- RECEIPT_IMAGE_PATH: Testte kullanilacak yerel fis gorseli yolu

## Kod Kalitesi ve Ilkeler

- Bilesen/servis ayrimi ile SRP odakli yapi
- Controller katmaninda yalnizca request/response sorumlulugu
- Servis katmaninda AI entegrasyonu ve veri normalizasyonu
- Uretim hatalarinda tutarli JSON error cevabi

## Yol Haritasi (Kisa)

- Unit ve integration test kapsamini artirma
- Kimlik dogrulama ve kullanici bazli veri ayrimi
- Tarif kalori/makro besin degerlerinin eklenmesi
- AI maliyet optimizasyonu ve cache stratejileri

## Lisans

Copyright (c) 2026 REG. Tüm hakları saklıdır. Bu projenin kaynak kodları yalnızca BTK Akademi Hackathon 2026 değerlendirme süreci için incelemeye açılmıştır. Kaynak kodların veya projenin kopyalanması, çoğaltılması veya ticari amaçlarla kullanılması kesinlikle yasaktır.
