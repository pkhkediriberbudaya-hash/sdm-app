import { NextResponse } from 'next/server';
import { readSheet } from '@/lib/googleSheets';

const SHEET = process.env.SHEET_MENUS || 'Menus';

export async function GET() {
  try {
    const { records } = await readSheet(SHEET);
    const menus = records
      .map((r) => ({
        key: r.KEY,
        label: r.LABEL,
        sheetName: r.SHEET_NAME,
        primaryKey: r.PRIMARY_KEY,
        icon: r.ICON || '📄',
        order: Number(r.ORDER) || 0,
      }))
      .filter((m) => m.key && m.sheetName)
      .sort((a, b) => a.order - b.order);
    return NextResponse.json({ menus });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
