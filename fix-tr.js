const fs = require('node:fs');
const path = require('node:path');

const trPath = path.join(__dirname, 'frontend/src/locales/tr.json');
let content = fs.readFileSync(trPath, 'utf8');

const replacements = {
  '"recipes": "Sef"': '"recipes": "Şef"',
  '"headline": "Tarif Uretim Envanteri"': '"headline": "Tarif Envanteri"',
  '"subtitle": "Stoktaki urunlerle aninda tarif uret, kritik urunleri degerlendir ve israfi azalt."': '"subtitle": "Stoktaki ürünlerle tarif üret ve israfı önle."',
  '"promptPlaceholder": "Ne pisirmek istiyorsun? Orn: zeytinyagli taze fasulye"': '"promptPlaceholder": "Ne pişirmek istersin? Örn: Zeytinyağlı taze fasulye"',
  '"generateButton": "Tarif Uret"': '"generateButton": "Tarif Üret"',
  '"luckyButton": "Surpriz Tarif"': '"luckyButton": "Sürpriz Tarif"',
  '"guidedButton": "Birlikte Sec"': '"guidedButton": "Birlikte Seç"',
  '"validationPrompt": "Yemek adi yaz veya sihirbazdan secim yap."': '"validationPrompt": "Yemek adı yaz veya seçim yap."',
  '"successToast": "Tarif hazir. Detaya yonlendiriliyorsun."': '"successToast": "Tarif hazır. Yönlendiriliyorsunuz."',
  '"defaultError": "Tarif uretilirken bir sorun olustu."': '"defaultError": "Tarif üretilirken hata oluştu."',
  '"activeStockDescription": "Kullanima hazir urun"': '"activeStockDescription": "Kullanıma hazır"',
  '"urgentStockDescription": "2 gun icinde tuketilmeli"': '"urgentStockDescription": "2 gün içinde tüketilmeli"',
  '"inventoryValue": "Envanter Degeri"': '"inventoryValue": "Envanter Değeri"',
  '"inventoryValueDescription": "Anlik toplam stok maliyeti"': '"inventoryValueDescription": "Anlık toplam maliyet"',
  '"addProductTitle": "Hızlı Ürün Ekle"': '"addProductTitle": "Ürün Ekle"',
  '"namePromptTitle": "Hangi yemegi merak ediyorsun?"': '"namePromptTitle": "Hangi yemeği merak ediyorsun?"',
  '"namePromptPlaceholder": "Orn: izmir kofte, yayla corbasi, imam bayildi"': '"namePromptPlaceholder": "Örn: İzmir köfte, yayla çorbası"',
  '"byNameLoading": "Tarif hazirlaniyor..."': '"byNameLoading": "Tarif hazırlanıyor..."',
  '"byNameError": "Tarif alinirken bir sorun olustu."': '"byNameError": "Tarif alınırken hata oluştu."',
  '"libraryTitle": "Tarif Kutuphanesi ({{count}})"': '"libraryTitle": "Tarif Kütüphanesi ({{count}})"',
  '"chefAssistantEmpty": "Yukaridan bir yemek adi yazip tarif olusturabilir veya Mutfak sayfasindan AI onerileri uretebilirsin."': '"chefAssistantEmpty": "Yemek adı yazarak veya Mutfak sayfasından öneri alarak tarif oluştur."',
  '"backToLibrary": "Kutuphaneye Don"': '"backToLibrary": "Kütüphaneye Dön"',
  '"detailNotFoundTitle": "Tarif bulunamadi"': '"detailNotFoundTitle": "Tarif bulunamadı"',
  '"detailNotFoundDescription": "Bu tarif artik kutuphanede olmayabilir."': '"detailNotFoundDescription": "Tarif artık kütüphanede olmayabilir."',
  '"favoriteRemovedToast": "Tarif favorilerden cikarildi."': '"favoriteRemovedToast": "Tarif favorilerden çıkarıldı."',
  '"favoriteAddAria": "{{name}} tarifini favorilere ekle"': '"favoriteAddAria": "{{name}} favorilere ekle"',
  '"favoriteRemoveAria": "{{name}} tarifini favorilerden cikar"': '"favoriteRemoveAria": "{{name}} favorilerden çıkar"',
  '"closeDetailAria": "Tarif detayini kapat"': '"closeDetailAria": "Detayı kapat"',
  '"filterAll": "Tumu"': '"filterAll": "Tümü"',
  '"favoritesEmptyTitle": "Henuz favori tarif yok"': '"favoritesEmptyTitle": "Favori tarif yok"',
  '"summaryTime": "Sure"': '"summaryTime": "Süre"',
  '"stepsImmersiveTitle": "Nasil Yapilir?"': '"stepsImmersiveTitle": "Nasıl Yapılır?"',
  '"tipsSection": "Sefin Puf Noktalari"': '"tipsSection": "Şefin Püf Noktaları"',
  '"betaWarningTitle": "Planlayici beta surumunde"': '"betaWarningTitle": "Planlayıcı Beta"',
  '"betaWarningDescription": "Bazi otomatik planlama akislari ve senkron davranislari tam olarak stabillesmedi. Sonuclari kontrol ederek ilerlemeni oneririz."': '"betaWarningDescription": "Bazı otomatik planlama akışları stabil olmayabilir. Sonuçları kontrol ediniz."',
  '"developerModeLabel": "Geliştirici Modu (Agentic Debug)"': '"developerModeLabel": "Geliştirici Modu"',
  '"emptyDescription": "Mutfak sayfasindan yeni tarif onerileri olusturabilirsin."': '"emptyDescription": "Mutfak sayfasından yeni tarif önerileri oluşturabilirsiniz."',
  '"byNameButton": "Tarif Al"': '"byNameButton": "Tarif Al"',
  '"title": "Mutfak Stokları"': '"title": "Mutfak"',
  '"listTitle": "Kategorilere Göre Stoklar"': '"listTitle": "Kategoriler"',
  '"recipeInventory": {': '"recipeInventory": {',
  '"chefAssistantTitle": "Şef Asistanı"': '"chefAssistantTitle": "Şef Asistanı"',
  '"smartHubTitle": "Kapya Akıllı Mutfak Şefi"': '"smartHubTitle": "Akıllı Şef"',
  '"guidedAssistantTitle": "Adım Adım Şef Asistanı"': '"guidedAssistantTitle": "Adım Adım Şef"',
  '"filtersCardTitle": "Özel Filtreler"': '"filtersCardTitle": "Filtreler"'
};

for (const [key, value] of Object.entries(replacements)) {
  content = content.replace(key, value);
}

fs.writeFileSync(trPath, content, 'utf8');
console.log('Done replacing TR characters and simplifying.');
