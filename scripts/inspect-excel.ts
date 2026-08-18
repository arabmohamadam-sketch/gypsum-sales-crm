import XLSX from "xlsx";

const file = "./data/customers_import.xlsx";

const workbook = XLSX.readFile(file);

console.log("Sheets:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];

  console.log("\n==============================");
  console.log("SHEET:", sheetName);
  console.log("RANGE:", sheet["!ref"]);

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
  });

  console.log("TOTAL ROWS:", rows.length);

  const nonEmptyRows = rows.filter((row: any) =>
    Object.values(row).some(
      (value) => value !== null && value !== ""
    )
  );

  console.log("NON-EMPTY ROWS:", nonEmptyRows.length);

  console.log("\nFIRST 10 NON-EMPTY ROWS:");

  console.log(
    nonEmptyRows.slice(0, 10)
  );
}