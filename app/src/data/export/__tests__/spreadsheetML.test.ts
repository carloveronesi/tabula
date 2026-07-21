import { describe, it, expect } from "vitest";
import { sheetsToXls } from "../spreadsheetML";

describe("sheetsToXls", () => {
  it("emette un Worksheet per foglio, col nome", () => {
    const xml = sheetsToXls([
      { name: "Giornaliero", headers: ["h"], rows: [] },
      { name: "Totale", headers: ["h"], rows: [] },
    ]);
    expect(xml.match(/<Worksheet/g)).toHaveLength(2);
    expect(xml).toContain('ss:Name="Giornaliero"');
    expect(xml).toContain('ss:Name="Totale"');
  });

  it("numeri come Number, stringhe come String", () => {
    const xml = sheetsToXls([{ name: "S", headers: ["x"], rows: [["ciao", 7.5]] }]);
    expect(xml).toContain('ss:Type="Number">7.5<');
    expect(xml).toContain('ss:Type="String">ciao<');
  });

  it("fa escaping di & < >", () => {
    const xml = sheetsToXls([{ name: "S", headers: ["h"], rows: [["a & b < c > d"]] }]);
    expect(xml).toContain("a &amp; b &lt; c &gt; d");
  });

  it("fa escaping di \" nei nomi foglio", () => {
    const xml = sheetsToXls([{ name: 'A "x" B', headers: ["h"], rows: [] }]);
    expect(xml).toContain('ss:Name="A &quot;x&quot; B"');
    expect(xml).not.toContain('ss:Name="A "x" B"');
  });
});
