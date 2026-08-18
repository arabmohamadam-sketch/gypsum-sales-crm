import XLSX from "xlsx";

const filePath = "./data/customers_import.xlsx";

const wb = XLSX.readFile(filePath, {
  cellFormula: true,
  cellNF: true,
  cellStyles: true,
});

console.log("Sheets:", wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];

  console.log("\n==============================");
  console.log("SHEET:", sheetName);
  console.log("RANGE:", ws["!ref"]);

  const cells = Object.keys(ws)
    .filter((key) => !key.startsWith("!"))
    .map((key) => {
      const cell = ws[key];

      return {
        address: key,
        value: cell?.v,
        type: cell?.t,
        formula: cell?.f,
        formatted: cell?.w,
      };
    })
    .filter(
      (cell) =>
        cell.value !== undefined ||
        cell.formula !== undefined ||
        cell.formatted !== undefined
    );

  console.log("REAL CELLS:", cells.length);

  console.log("\nFIRST 100 CELLS:");

  console.log(cells.slice(0, 100));
}