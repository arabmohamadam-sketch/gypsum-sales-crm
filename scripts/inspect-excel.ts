import * as XLSX from "xlsx";

const file = "./data/customers_import.xlsx";

const workbook = XLSX.readFile(file);

console.log("Sheets:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];

  console.log("\n==============================");
  console.log("SHEET:", sheetName);
  console.log("RANGE:", sheet["!ref"]);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    sheet,
    {
      defval: null,
    }
  );

  console.log("TOTAL ROWS:", rows.length);

  const nonEmptyRows = rows.filter(
    (row) =>
      Object.values(row).some(
        (value) =>
          value !== null &&
          value !== undefined &&
          value !== ""
      )
  );

  console.log(
    "NON-EMPTY ROWS:",
    nonEmptyRows.length
  );

  console.log(
    "\nFIRST 10 NON-EMPTY ROWS:"
  );

  console.log(
    nonEmptyRows.slice(0, 10)
  );
}