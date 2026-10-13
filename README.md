# SportotoExpert

Spor Toto 15 maç için sistem kuponu oluşturma, filtreleme ve **garantili kupon düşürme** aracı.
Next.js 15 + Prisma/PostgreSQL + Rust→WebAssembly hesaplama çekirdeği. Bahis oynatmaz, para kabul etmez.

## Hızlı başlangıç

```bash
cp .env.example .env           # NEXTAUTH_SECRET'i değiştirin
docker compose up -d db        # PostgreSQL
npm install
npm run db:push
npm run db:seed                # referans seçenekleri + admin + ÖRNEK program
npm run dev
```

Seed, admin hesabı için rastgele şifre üretip ekrana yazar (`SEED_ADMIN_PASSWORD` ile belirleyebilirsiniz).
`public/wasm` içindeki derlenmiş çekirdek repoda hazırdır. Rust kodunu değiştirirseniz: `npm run wasm:build`
(`wasm32-unknown-unknown` hedefi ve `wasm-bindgen-cli` ya da `wasm-pack` gerekir). Testler: `npm run rust:test`, `npm test`, `npm run test:e2e`.

## Her hafta otomatik program

Program, `PROGRAM_FEED_URL` ile gösterilen JSON kaynaktan çekilir:

* `GET /api/cron/sync` — Vercel Cron ile **saatte bir** (`vercel.json`), `Authorization: Bearer $CRON_SECRET`.
* Ayrıca ana sayfa istekleri en çok 10 dakikada bir arka planda senkronizasyon başlatır.
* Her senkronizasyon: yeni haftaları oluşturur, oranları/skorları günceller, ilk maç başlayınca kuponu kilitler
  (`OPEN → LOCKED`), 15 sonuç tamamlanınca haftayı kesinleştirip tüm kuponları değerlendirir (`FINAL`).
* Eski haftalar ana sayfadaki hafta seçici / ok düğmeleriyle her zaman görüntülenir.

**Önemli:** Spor Toto'nun resmi, herkese açık bir JSON API'si yoktur ve bu depo hazır bir veri kaynağına bağlı değildir.
`PROGRAM_FEED_URL` sizin sağladığınız (ya da yazacağınız bir scraper/aracı servisin) kaynağı göstermelidir.
Kaynak yoksa yönetim panelinden (`/admin`) aynı biçimde JSON yükleyebilirsiniz. Seed'deki 9. ve 10. hafta **örnek veridir**.

Feed biçimi (`{ "weeks": [...] }` veya doğrudan dizi):

```json
{
  "weeks": [{
    "season": "2026/2027",            // opsiyonel; verilmezse ilk maç tarihinden türetilir
    "number": 11,
    "totalColumnsTR": 1359420, "poolTotal": 120800000,
    "rollovers": { "r15": 0, "r14": 0, "r13": 0, "r12": 0 },
    "official": { "winners15": 29, "prize15": 1457880.74, "winners14": 0, "prize14": 0, "winners13": 0, "prize13": 0, "winners12": 0, "prize12": 0 },
    "matches": [{
      "matchNo": 1, "home": "Fenerbahçe", "away": "Beşiktaş", "league": "Süper Lig",
      "kickoff": "2026-10-31T11:00:00Z",
      "pct1": 48, "pctX": 26, "pct2": 26,
      "homeGoals": null, "awayGoals": null, "finished": false
    }]                                // tam 15 maç, matchNo 1–15
  }]
}
```

## Mimari notlar

* **Hesaplama** tarayıcıda, Web Worker içinde Rust/WASM ile yapılır: üret → filtrele → açgözlü küme örtüsü (12/13/14 garantisi) →
  sonuç, kapsama açısından yeniden **doğrulanır**. Rust testleri küçük sistemlerde garantiyi tüm olası sonuçlar için kanıtlar.
* Kuponlar kaydedilirken kolonlar gzip'lenmiş `Uint32` olarak saklanır; sunucu her kolonun seçimlere uyduğunu ve tekrar etmediğini doğrular
  (garantinin/filtrelerin kendisini yeniden hesaplamaz). Üst sınır: 1.000.000 kolon.
* Önbellek: `UPSTASH_REDIS_*` tanımlıysa Redis, değilse süreç içi bellek.
* Kimlik doğrulama: NextAuth v4 (kullanıcı adı/e-posta + argon2; isteğe bağlı Google).
* Gizlilik ve kullanım şartları sayfaları **taslaktır**; yayından önce hukuki gözden geçirme gerekir.

## Yayına alma

* **Docker (kendi sunucunuz):** `.env` hazırlayın, sonra `docker compose --profile app up -d --build`. Konteyner açılışta `prisma db push` çalıştırır.
  İlk kurulumda admin ve referans seçenekleri için `npm run db:seed` çalıştırın. Saatlik senkron için dışarıdan
  `curl -H "Authorization: Bearer $CRON_SECRET" https://alanadiniz/api/cron/sync` çağıran bir cron ekleyin (sayfa istekleri de tetikler).
* **Vercel:** Proje kökü `sportoto-expert`, Postgres (Neon/Supabase vb.) `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `PROGRAM_FEED_URL` ayarlayın; `vercel.json` saatlik cron'u içerir.
* Sağlık kontrolü: `GET /api/health`. CI: `.github/workflows/sportoto-expert.yml`.
