import { NextResponse } from 'next/server';
import { readSheet, appendRow } from '@/lib/googleSheets';

export async function GET(req, { params }) {
  try {
    const sheetName = decodeURIComponent(params.sheet);
    const data = await readSheet(sheetName);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const sheetName = decodeURIComponent(params.sheet);
    const body = await req.json();
    const { headers } = await readSheet(sheetName);
    await appendRow(sheetName, headers, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
