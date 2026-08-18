import fs from "fs";
import * as XLSX from "xlsx";

const workbook = XLSX.read(
  fs.readFileSync("./data/customers_import.xlsx")
);

console.log(workbook.SheetNames);