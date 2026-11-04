# ⚽ SportAgent AI — Çoklu Ajan Spor Analiz Platformu

Yapay zeka destekli **6 uzman ajandan** oluşan bir ajan ordusu; internet genelinde araştırma
yaparak sakatlıkları, cezaları, form durumunu, güncel haberleri ve tarihsel karşılaşmaları analiz
eder ve **hangi takımın kazanabileceğine dair kapsamlı bir tahmin** üretir.

> 🌐 **Tam kurulum (canlı) modunda çalışır.** Ajan ordusu gerçek internet araştırması yapar ve AI
> ile analiz üretir. Bunun için `OPENAI_API_KEY` ve `TAVILY_API_KEY` anahtarları **zorunludur**.

---

## 🤖 Ajan Ordusu (18 Uzman Ajan — 3 Katmanlı Doğruluk Motoru)

**1. Katman — Takım & İleri İstatistik Ajanları** (her iki takım için ayrı çalışır):

| Ajan | Görevi |
|------|--------|
| 📈 xG & İleri İstatistik Ajanı | Beklenen gol (xG/xGA), şut kalitesi ve şans faktörü |
| 🏥 Sakatlık & Ceza Ajanı | As kadro eksikleri ve 10 üzerinden etki skoru |
| 📊 Form Analiz Ajanı | Son 5 maç formu ve oynanan rakiplerin zorluk derecesi |
| 👔 Teknik Direktör & Taktik Ajanı | Diziliş, pres şiddeti ve oyun planı |
| ⭐ Yıldız Oyuncu Ajanı | Skorer ve kilit oyuncuların güncel formu |
| 🔁 Transfer & Kadro Derinliği Ajanı | Yedek kulübesi hamle gücü ve kadro kalitesi |
| 📰 Güncel Haberler Ajanı | Son dakika kamp ve kulüp gelişmeleri |
| 📱 Sosyal Medya & Baskı Ajanı | Taraftar desteği / stres baskısı analizi |
| 💬 Uzman Yorum Ajanı | Güçlü/zayıf yönler + objektif performans notu |

**2. Katman — Maç Dinamikleri & Keskin Piyasa Ajanları:**

| Ajan | Görevi |
|------|--------|
| 🏟️ İç / Dış Saha Split Uzmanı | Ev sahibinin iç saha vs deplasmanın dış saha karnesi |
| ⏱️ Fikstür Yorgunluğu & Rotasyon Ajanı | Dinlenme günleri, kupa/Avrupa yorgunluğu ve rotasyon riski |
| 🧩 Muhtemel 11 & Duran Top Ajanı | Beklenen 11'ler, mevki eşleşmeleri ve korner/frikik zaafları |
| 📉 Keskin Oran & Piyasa Hareketleri Ajanı | İma edilen olasılıklar, oran düşüşleri ve tuzak oran sinyali |
| 🔥 Motivasyon & Hedef Ajanı | Şampiyonluk/Avrupa/küme düşme puan ihtiyacı |
| ⚔️ Tarihsel H2H Ajanı | Yakın dönem karşılaşma ve gol paternleri |
| 🌦️ Hava Durumu & Saha Zemin Ajanı | Yağış, rüzgar ve zemin koşulları etkisi |
| 🟨 Hakem & Disiplin Ajanı | Hakemin kart/penaltı ortalaması ve tempo etkisi |

**3. Katman — Çapraz Doğrulama & Olasılık Kalibrasyon Komitesi:**

| Ajan | Görevi |
|------|--------|
| 🤖 Orkestrasyon Ajanı | Tüm 3 katmanı ve eşzamanlılık kuyruğunu yönetir |
| 📐 Kantitatif & Poisson Model Ajanı | Beklenen gol (λ) ve %1 / %X / %2 olasılık dağılımını hesaplar |
| ⚖️ Şeytanın Avukatı & Tuzak Denetçisi | Popüler takım yanlılığını kırar, sürpriz/tuzak riskini denetler |
| 🎯 Tahmin Komutanı (Ensemble) | Tüm verileri ağırlıklı sentezleyip kalibre edilmiş final tahmini üretir |

---

## 🚀 Vercel'e Deploy

1. **Vercel'de projeyi GitHub deposundan içe aktarın** (Add New → Project → `sportotouzmani`).
   Next.js otomatik algılanır; Build Command `npm run build`, Root Directory depo kökü (`./`).
2. **Ortam değişkenlerini ekleyin** (Project Settings → Environment Variables):
   | Değişken | Açıklama | Gerekli mi? |
   |----------|----------|-------------|
   | `OPENAI_API_KEY` | AI analizleri için | ✅ Zorunlu |
   | `TAVILY_API_KEY` | Gerçek internet araştırması için | ✅ Zorunlu |
   | `DATABASE_URL` | Analiz geçmişini kaydetmek için (Neon/Supabase) | ⬜ Opsiyonel |
3. Değişkenlerden sonra **Deployments → Redeploy** ile yeniden yayınlayın.

Notlar:
* Analiz uç noktası (`/api/analyze`) `maxDuration = 300` saniye kullanır; Vercel Pro planında desteklenir
  (Hobby planında üst sınır daha düşüktür ve uzun analizler yarıda kesilebilir).
* `DATABASE_URL` tanımlıysa tablolar ilk istekte otomatik oluşturulur; ayrı bir migration adımı gerekmez.
* Vercel Marketplace'ten Neon eklerseniz `DATABASE_URL` otomatik tanımlanır.

---

## 🔑 API Anahtarları Nereden Alınır?

| Servis | Link | Ücretsiz? |
|--------|------|-----------|
| OpenAI | https://platform.openai.com/api-keys | Kullandıkça öde |
| Tavily | https://app.tavily.com | ✅ Ücretsiz katman |
| Neon (PostgreSQL) | https://neon.tech | ✅ Ücretsiz |
| Supabase (PostgreSQL) | https://supabase.com | ✅ Ücretsiz |

> **Not:** `OPENAI_API_KEY` ve `TAVILY_API_KEY` **zorunludur** — bunlar olmadan analiz başlatılamaz
> (arayüzde "Kurulum Gerekli" uyarısı gösterilir).

---

## 🗄️ Veritabanı (Opsiyonel)

Analiz geçmişini saklamak isterseniz bir bulut PostgreSQL bağlayın:

1. [Neon](https://neon.tech) veya [Supabase](https://supabase.com)'de ücretsiz bir veritabanı açın.
2. Bağlantı dizesini (connection string) kopyalayın.
3. Vercel'de `DATABASE_URL` ortam değişkenine yapıştırın. Tablolar ilk istekte otomatik oluşturulur.

`DATABASE_URL` yoksa uygulama **"veritabanısız mod"** ile çalışır: analizler üretilir ama kaydedilmez.

---

## 💻 Yerel Geliştirme

```bash
npm install
cp .env.example .env      # değerleri doldurun (opsiyonel)
npm run dev               # http://localhost:3000
```

Production build test:
```bash
npm run build
npm run start
```

---

## 🛠️ Teknoloji Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Stil:** Tailwind CSS
- **AI:** OpenAI (GPT-4o-mini)
- **Web Araştırma:** Tavily API
- **Veritabanı:** PostgreSQL + Drizzle ORM (opsiyonel)
- **Deploy:** Vercel
- **Streaming:** Server-Sent Events (SSE) ile canlı ajan takibi

---

## ⚠️ Yasal Uyarı

Bu platform yalnızca bilgi ve eğlence amaçlıdır. Üretilen tahminler **bahis tavsiyesi değildir**.
Kararlarınızdan siz sorumlusunuz.
