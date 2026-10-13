# Sportoto Uzmanı

15 maçlık haftalar için sistem kuponu, beraberlik filtresi, kapsama doğrulama ve kayıt aracı.
Bahis oynatmaz veya para kabul etmez. **Gerçek sonuçların tümü seçilen işaretlerde olursa** kapsama garantisi geçerlidir; kazanç garantisi değildir.

## Mevcut uygulama

- Next.js 15, React 19, Prisma 6 / PostgreSQL.
- E-posta/Argon2 şifre, NextAuth JWT oturumu; veritabanında ortak giriş/kayıt deneme sınırı.
- USER ve ADMIN rolleri. Rol, istemciden değil veritabanından okunur.
- Yönetici program ve skorları JSON ile yükler. İlk maç başlayınca kayıt kapanır; bütün sonuçlar tamamlanınca kuponun en iyi kolon puanı hesaplanır.
- Web Worker içinde **TypeScript** hesaplama motoru (Rust/WASM değildir). En fazla 4.096 kolon; 12/13/14/15 doğru kapsama.
- İndirilen veya kaydedilen kolonlar seçimlere uymalı, benzersiz olmalı. İddia edilen garanti sunucuda tam seçili sistem üzerinde yeniden doğrulanır.
- İndirgeme en küçük kolon sayısını vaat etmez. Tam sistemi daraltan filtreler ile garanti birlikte kullanılamaz.
- Canlı maç kaynağı, otomatik cron, Google OAuth ve Redis entegrasyonu bu sürümde yoktur. Örnek program kendiliğinden yüklenmez.

## Yerel kurulum

```bash
cp .env.example .env
# .env içindeki DATABASE_URL, NEXTAUTH_URL ve NEXTAUTH_SECRET değerlerini ayarlayın.
docker compose up -d db
npm ci
npm run db:migrate
# .env içinde SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD tanımlayın.
npm run db:seed
npm run dev
```

Admin şifresi en az 12 karakter olmalıdır. Seed mevcut adminin şifresini değiştirir; tekrar çalıştırmadan önce bunu dikkate alın.
Uygulamada giriş yaptıktan sonra **Yönetim** sekmesine aşağıdaki biçimde JSON yapıştırın.

## Program biçimi

```json
{
  "weeks": [
    {
      "season": "2026/2027",
      "number": 1,
      "matches": [
        {
          "matchNo": 1,
          "home": "Ev sahibi",
          "away": "Deplasman",
          "league": "Lig",
          "kickoff": "2027-01-01T18:00:00Z",
          "finished": false,
          "homeGoals": null,
          "awayGoals": null
        }
      ]
    }
  ]
}
```

`matches` tam **15 benzersiz maç** içermelidir; yukarıdaki tek maç yalnızca alan örneğidir.
Aynı `season` ve `number` tekrar yüklenirse hafta güncellenir. Kayıtlı kupon içeren haftanın takım, maç numarası veya kickoff alanları değiştirilemez; skorlar güncellenebilir.
Bitmiş maçta iki skor da zorunludur. Başlangıç zamanı UTC ISO biçimindedir.

## Vercel

Proje kökü bu deponun köküdür, `sportoto-expert` alt klasörü değildir.
Build: `npm run build`; install: `npm ci` (Prisma generate postinstall ile çalışır).
PostgreSQL veritabanı sağlayıp şunları **Production ve Preview için ayrı veritabanları kullanarak** tanımlayın:

- `DATABASE_URL`: PostgreSQL bağlantısı (gerekirse sağlayıcının SSL ve pool ayarları).
- `NEXTAUTH_URL`: ilgili ortamın uygulama adresi.
- `NEXTAUTH_SECRET`: güvenli, rastgele oturum imzalama anahtarı (en az 32 karakter).

Bağlantıları hazır olan yerel bir ortamda `npm run db:migrate` çalıştırıp admini `npm run db:seed` ile oluşturun; sonra PR'ı birleştirip deploy edin. Build sırasında veritabanı değiştirilmez.
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` yalnızca güvenilir kurulum ortamında gerekli; herkese açık değişkenlere dönüştürmeyin.
Sağlık: `GET /api/health` (bağlantı yoksa 503).
Docker için `docker compose --profile app up -d --build`; uygulama açılışta versioned migration uygular.

## CI kurulumu

GitHub Actions şablonu `ci.workflow.example.yml` dosyasındadır. GitHub üzerinde gerekli workflow yazma yetkisiyle bu dosyayı `.github/workflows/ci.yml` konumuna taşıyın; bu manuel adım yapılana kadar otomatik CI etkin değildir.

## Kontroller

```bash
npm ci
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

`lint` eski komut uyumluluğu için yalnızca TypeScript kontrolünü çağırır; ayrı ESLint kural seti yoktur.
Birim testleri tam sonuç uzayı üzerinde kapsama, geçersiz seçim, filtre, kilit ve program doğrulamasını denetler.
Tarayıcı arayüz testleri API yanıtlarını mock'layarak Web Worker ve UI davranışını test eder.
Gerçek PostgreSQL entegrasyon testi ayrıca kayıt, giriş, admin yetkisi, program yükleme, kupon kaydı, sahte garanti/tekrarlı kolon reddi, kilit ve sonuç hesaplamasını doğrular. Bu test varsayılan olarak atlanır. **Yalnızca izole bir test veritabanında**, migration ve admin seed uyguladıktan sonra `DATABASE_URL`, `NEXTAUTH_URL=http://localhost:3000`, `NEXTAUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` ortam değişkenleriyle `INTEGRATION_TEST=1 npm run test:e2e` çalıştırın; test program ve kupon oluşturur. Production veritabanında çalıştırmayın.

## Yayın öncesi

Gizlilik/kullanım şartları **taslaktır**, hukuki inceleme ve işletmeci bilgileri gerekir. E-posta doğrulama, şifre sıfırlama, hesap silme ve çok faktörlü doğrulama henüz yoktur.
Herkese açık kullanımdan önce gerçek veritabanıyla migration, admin girişi, kullanıcı kaydı, kupon kaydı ve sonuç güncelleme akışlarını staging ortamında doğrulayın.
Oturum anahtarını koruyun; admin şifresini değiştirin, PostgreSQL yedekleme ve uygulama erişim kontrolünü yapılandırın.
