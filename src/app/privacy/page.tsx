export default function Privacy() {
  return (
    <main className="panel">
      <h1>Gizlilik — taslak</h1>
      <p>
        E-posta adresi, şifre özeti ve kayıtlı kuponlar PostgreSQL veritabanında
        saklanır. Şifreler Argon2 ile özetlenir. Oturum için kimlik doğrulama
        çerezi kullanılır.
      </p>
      <p>
        İşletmeci kimliği, iletişim adresi, saklama süreleri ve silme/erişim
        talebi yöntemi yayından önce belirlenmelidir. Bu metin hukuki olarak
        incelenmiş bir politika değildir.
      </p>
      <a href="/">Ana sayfa</a>
    </main>
  );
}
