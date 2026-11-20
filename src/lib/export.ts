import "server-only";
import ExcelJS from "exceljs";
import type { ResponseRow } from "./db/schema";
import { v3Headers, v3Row } from "./v3/exportColumns";

export { toCsv } from "./v3/exportColumns";

/** Excel workbook with a "v3" sheet in the spec section 10 column order. */
export async function toXlsx(rows: ResponseRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Audience DNA";
  const ws = wb.addWorksheet("v3", { views: [{ state: "frozen", xSplit: 4, ySplit: 1 }] });
  const header = v3Headers();
  const h = ws.addRow(header);
  h.font = { bold: true };
  rows.forEach((r, i) => ws.addRow(v3Row(r, i)));
  ws.columns.forEach((col, i) => {
    col.width = i < 11 ? [5, 38, 24, 24, 30, 26, 18, 12, 16, 9, 20][i] : 12;
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}
