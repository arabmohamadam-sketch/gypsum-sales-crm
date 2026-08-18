import * as XLSX from "xlsx";

export function readWorkbook(file: ArrayBuffer) {
  return XLSX.read(file, {
    type: "array",
    cellDates: false,
    raw: true,
  });
}

export function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: string
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(
      `شیت "${sheetName}" در فایل Excel پیدا نشد.`
    );
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
}