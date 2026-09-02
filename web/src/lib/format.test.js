import { describe, it, expect } from "vitest";
import { formatCompactAmount } from "./format.js";

describe("formatCompactAmount", () => {
  it("miliar dipersingkat jadi 'M' (bukan angka panjang)", () => {
    expect(formatCompactAmount(1_379_098_237, "idr")).toBe("Rp1,38 M");
  });

  it("juta dipersingkat jadi 'Jt'", () => {
    expect(formatCompactAmount(2_400_000, "idr")).toBe("Rp2,4 Jt");
  });

  it("ribuan dipersingkat jadi 'Rb'", () => {
    expect(formatCompactAmount(2471, "usd")).toBe("$2,47 Rb");
  });

  it("angka kecil dipakai apa adanya (nggak perlu suffix)", () => {
    expect(formatCompactAmount(77.5, "usd")).toBe("$77,50");
  });

  it("nilai bukan angka -> em dash, bukan error", () => {
    expect(formatCompactAmount(NaN, "usd")).toBe("–");
  });
});
