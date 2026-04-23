import { supabase } from "../lib/supabase";
import type { BarcodeResult } from "../types/database";

export async function lookupBarcode(
  barcode: string,
  barcodeFormat = "EAN13"
): Promise<BarcodeResult> {
  const { data, error } = await supabase.functions.invoke<BarcodeResult>("barcode-lookup", {
    body: { barcode, barcode_format: barcodeFormat },
  });
  if (error) throw error;
  return data!;
}
