"use client";
import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import type { Match } from "@/lib/program";
import { isLocked, resultOf } from "@/lib/program";
import type { Outcome } from "@/lib/engine";
type Week = { id: string; season: string; number: number; matches: Match[] };
type User = { id: string; email: string; role: string };
type Coupon = {
  id: string;
  week: Week;
  columns: string[];
  guarantee: number | null;
  bestHits: number | null;
};
const emptySelections = () =>
  Array.from({ length: 15 }, () => ["1"] as Outcome[]);
async function request(url: string, body?: unknown) {
  const res = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "İşlem başarısız.");
  return data;
}
export default function Home() {
  const [weeks, setWeeks] = useState<Week[]>([]),
    [weekId, setWeekId] = useState("");
  const [user, setUser] = useState<User | null>(null),
    [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selections, setSelections] = useState<Outcome[][]>(emptySelections),
    [columns, setColumns] = useState<string[]>([]);
  const [guarantee, setGuarantee] = useState(0),
    [minDraws, setMinDraws] = useState(0),
    [maxDraws, setMaxDraws] = useState(15);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [program, setProgram] = useState(""),
    [tab, setTab] = useState("system"),
    [computedGuarantee, setComputedGuarantee] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const week = weeks.find((w) => w.id === weekId),
    locked = week ? isLocked(week.matches) : true;
  async function refresh() {
    try {
      const [w, u] = await Promise.all([
        request("/api/weeks"),
        request("/api/me"),
      ]);
      setWeeks(w);
      setUser(u);
      setWeekId((old) =>
        w.some((x: Week) => x.id === old) ? old : (w[0]?.id ?? ""),
      );
      if (u) setCoupons(await request("/api/coupons"));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
    return () => worker.current?.terminate();
  }, []);
  function invalidate() {
    worker.current?.terminate();
    setBusy(false);
    setColumns([]);
    setComputedGuarantee(null);
  }
  async function action(fn: () => Promise<void>) {
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function calculate() {
    invalidate();
    setNotice("");
    setBusy(true);
    const g = guarantee;
    worker.current = new Worker(
      new URL("../workers/engine.ts", import.meta.url),
    );
    worker.current.onmessage = (e) => {
      setBusy(false);
      if (e.data.error) setNotice(e.data.error);
      else {
        setColumns(e.data.columns);
        setComputedGuarantee(g || null);
        setNotice(
          `${e.data.total} kolondan ${e.data.columns.length} kolon oluşturuldu.`,
        );
      }
      worker.current?.terminate();
    };
    worker.current.onerror = () => {
      setBusy(false);
      setNotice("Hesaplama motoru yüklenemedi.");
      worker.current?.terminate();
    };
    worker.current.postMessage({ selections, minDraws, maxDraws, guarantee });
  }
  function toggle(i: number, sign: Outcome) {
    invalidate();
    setSelections((prev) =>
      prev.map((s, n) =>
        n !== i
          ? s
          : s.includes(sign)
            ? s.filter((x) => x !== sign)
            : [...s, sign],
      ),
    );
  }
  function download() {
    const blob = new Blob(["kolon\n" + columns.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sportoto-kupon.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ⚽ Sportoto<span>Uzmanı</span>
        </a>
        <span className="badge">15 MAÇ · SİSTEM ANALİZİ</span>
        {user && <button onClick={() => void signOut()}>Çıkış</button>}
      </header>
      <section className="hero">
        <p className="eyebrow">SEÇ · FİLTRELE · DOĞRULA</p>
        <h1>
          Kuponunu şansa değil,
          <br />
          <em>sisteme bırak.</em>
        </h1>
        <p>
          15 maçlık seçimlerini kolonlara dönüştür. Garanti kapsamını hesapla,
          sonuçlarını takip et.
        </p>
        <small>
          Bahis oynatmaz, para kabul etmez. Garanti, yalnızca gerçek sonuçların
          tümü seçtiğin işaretler içindeyse geçerlidir; kazanç garantisi
          değildir.
        </small>
      </section>
      <nav>
        {[
          ["system", "Sistem oluştur"],
          ["coupons", "Kuponlarım"],
          ["account", user ? "Hesabım" : "Giriş / Kayıt"],
          ...(user?.role === "ADMIN" ? [["admin", "Yönetim"]] : []),
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <div role="status" className="notice">
          {notice}
        </div>
      )}
      {tab === "system" && (
        <section className="panel">
          <div className="sectionTitle">
            <h2>Haftalık program</h2>
            <select
              aria-label="Hafta"
              value={weekId}
              onChange={(e) => {
                invalidate();
                setSelections(emptySelections());
                setWeekId(e.target.value);
              }}
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.season} · {w.number}. hafta
                </option>
              ))}
            </select>
          </div>
          {!week ? (
            <div className="empty">
              <h3>Henüz program yüklenmedi</h3>
              <p>
                Yönetici hesabıyla program yükleyerek başlayın. Örnek maçlar
                gerçek veri gibi gösterilmez.
              </p>
            </div>
          ) : (
            <>
              <p className="status">
                {resultOf(week.matches)
                  ? "SONUÇLANDI"
                  : locked
                    ? "KİLİTLİ — ilk maç başladı"
                    : "AÇIK — seçim yapabilirsiniz"}
              </p>
              <div className="matches">
                {week.matches.map((m, i) => (
                  <div className="match" key={m.matchNo}>
                    <span className="number">{m.matchNo}</span>
                    <div className="teams">
                      <strong>
                        {m.home} <span>—</span> {m.away}
                      </strong>
                      <small>
                        {new Date(m.kickoff).toLocaleString("tr-TR")}{" "}
                        {m.finished && ` · ${m.homeGoals}–${m.awayGoals}`}
                      </small>
                    </div>
                    <div className="signs">
                      {(["1", "X", "2"] as Outcome[]).map((s) => (
                        <button
                          aria-pressed={selections[i].includes(s)}
                          key={s}
                          className={
                            selections[i].includes(s) ? "selected" : ""
                          }
                          onClick={() => toggle(i, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="settings">
                <label>
                  En az beraberlik
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={minDraws}
                    onChange={(e) => {
                      invalidate();
                      setMinDraws(Number(e.target.value));
                    }}
                  />
                </label>
                <label>
                  En çok beraberlik
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={maxDraws}
                    onChange={(e) => {
                      invalidate();
                      setMaxDraws(Number(e.target.value));
                    }}
                  />
                </label>
                <label>
                  Garanti
                  <select
                    aria-label="Garanti"
                    value={guarantee}
                    onChange={(e) => {
                      invalidate();
                      setGuarantee(Number(e.target.value));
                    }}
                  >
                    <option value="0">Tam / filtreli sistem</option>
                    {[12, 13, 14, 15].map((g) => (
                      <option key={g} value={g}>
                        {g} doğru kapsama
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="hint">
                En fazla 4.096 kolon. Tam sistemi daraltan filtrelerle garanti
                verilmez. Hesaplama tarayıcıdaki ayrı işlemcide yapılır.
              </p>
              <div className="actions">
                <button className="primary" disabled={busy} onClick={calculate}>
                  {busy ? "Hesaplanıyor…" : "Kolonları hesapla"}
                </button>
                {columns.length > 0 && (
                  <>
                    <button onClick={download}>CSV indir</button>
                    <button
                      disabled={!user || locked}
                      onClick={() =>
                        void action(async () => {
                          await request("/api/coupons", {
                            weekId,
                            selections,
                            columns,
                            guarantee: computedGuarantee,
                          });
                          setNotice("Kupon kaydedildi.");
                          await refresh();
                        })
                      }
                    >
                      Kuponu kaydet
                    </button>
                  </>
                )}
              </div>
              {columns.length > 0 && (
                <details>
                  <summary>
                    {columns.length} kolon{" "}
                    {computedGuarantee &&
                      ` · ${computedGuarantee} doğru kapsama doğrulandı`}
                  </summary>
                  <pre>
                    {columns.slice(0, 100).join("\n")}
                    {columns.length > 100
                      ? "\n… Tam liste CSV dosyasında."
                      : ""}
                  </pre>
                </details>
              )}
            </>
          )}
        </section>
      )}
      {tab === "coupons" && (
        <section className="panel">
          <h2>Kuponlarım</h2>
          {!user ? (
            <p>Kuponlarını görmek için giriş yap.</p>
          ) : coupons.length === 0 ? (
            <p>Henüz kayıtlı kupon yok.</p>
          ) : (
            coupons.map((c) => (
              <article className="coupon" key={c.id}>
                <h3>
                  {c.week.season} · {c.week.number}. hafta
                </h3>
                <p>
                  {c.columns.length} kolon ·{" "}
                  {c.guarantee ? `${c.guarantee} doğru kapsama` : "Garanti yok"}
                </p>
                <strong>
                  {c.bestHits === null
                    ? "Sonuçlar bekleniyor"
                    : `En iyi kolon: ${c.bestHits}/15`}
                </strong>
              </article>
            ))
          )}
        </section>
      )}
      {tab === "account" && (
        <section className="panel account">
          <h2>{user ? "Hesabın" : "Giriş / Kayıt"}</h2>
          {user ? (
            <p>{user.email}</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () => {
                  const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                  });
                  if (result?.error)
                    throw new Error("E-posta veya şifre hatalı.");
                  setPassword("");
                  await refresh();
                  setTab("system");
                });
              }}
            >
              <label>
                E-posta
                <input
                  autoComplete="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Şifre
                <input
                  autoComplete="current-password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <p className="hint">
                En az 12 karakter. Kayıt olarak taslak gizlilik ve kullanım
                şartlarını kabul edersin.
              </p>
              <div className="actions">
                <button className="primary" type="submit">
                  Giriş yap
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void action(async () => {
                      await request("/api/register", { email, password });
                      setPassword("");
                      setNotice("Kayıt tamamlandı. Şimdi giriş yapabilirsin.");
                    })
                  }
                >
                  Kayıt ol
                </button>
              </div>
            </form>
          )}
        </section>
      )}
      {tab === "admin" && user?.role === "ADMIN" && (
        <section className="panel">
          <h2>Program ve sonuç yükle</h2>
          <p>
            JSON biçimi:{" "}
            {`{ "weeks": [{ "season": "2026/2027", "number": 1, "matches": [...] }] }`}
          </p>
          <p className="hint">
            Her hafta 1–15 numaralı tam 15 maç. Alanlar: matchNo, home, away,
            kickoff (ISO UTC), finished, homeGoals, awayGoals. Sonuç güncellemek
            için aynı hafta kimliğini kullan.
          </p>
          <textarea
            aria-label="Program JSON"
            rows={14}
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="Program JSON verisini buraya yapıştırın"
          />
          <button
            className="primary"
            onClick={() =>
              void action(async () => {
                await request("/api/admin/program", JSON.parse(program));
                setNotice("Program güncellendi.");
                await refresh();
              })
            }
          >
            Doğrula ve yükle
          </button>
        </section>
      )}
      <footer>
        Sportoto Uzmanı · 18+ · Analiz aracıdır, bahis platformu değildir.
        <div>
          <a href="/privacy">Gizlilik taslağı</a> ·{" "}
          <a href="/terms">Kullanım şartları taslağı</a>
        </div>
      </footer>
    </main>
  );
}
