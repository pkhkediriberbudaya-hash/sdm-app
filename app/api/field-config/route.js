import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';

const SHEET = process.env.SHEET_FIELD_CONFIG || 'FieldConfig';

export async function GET() {
  try {
    const { records } = await readSheet(SHEET);
    const config = records
      .map((r) => ({
        fieldName: (r.FIELD_NAME || '').trim(),
        groupLabel: (r.GROUP_LABEL || '').trim() || 'Data Lainnya',
        order: Number(r.ORDER) || 0,
        inputType: (r.INPUT_TYPE || 'text').trim(),
      }))
      .filter((c) => c.fieldName);
    return NextResponse.json({ config });
  } catch (e) {
    // Sheet FieldConfig belum dibuat -> anggap saja belum ada konfigurasi tambahan
    return NextResponse.json({ config: [] });
  }
}
