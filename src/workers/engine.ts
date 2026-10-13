import { generate, filterColumns, reduceSystem } from "../lib/engine";
self.onmessage = (event) => {
  try {
    const { selections, minDraws, maxDraws, guarantee } = event.data;
    const full = generate(selections);
    const filtered = filterColumns(full, minDraws, maxDraws);
    if (!filtered.length) throw new Error("Filtre sonrası kolon kalmadı.");
    if (guarantee && filtered.length !== full.length)
      throw new Error(
        "Filtre tam sistemi daraltıyorsa garanti verilemez. Filtreyi kaldırın.",
      );
    const columns = guarantee ? reduceSystem(full, guarantee) : filtered;
    self.postMessage({ columns, total: full.length });
  } catch (e) {
    self.postMessage({
      error: e instanceof Error ? e.message : "Hesaplama başarısız.",
    });
  }
};
