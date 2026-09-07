import { NextResponse } from 'next/server';
import { readSheet, updateRow, deleteRow } from '@/lib/googleSheets';

export async function PUT(req, { params }) {
  try {
    const sheetName = decodeURIComponent(params.sheet);
    const rowNum = Number(params.rowNum);
    const body = await req.json();
    const { headers } = await readSheet(sheetName);
    await updateRow(sheetName, rowNum, headers, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const sheetName = decodeURIComponent(params.sheet);
    const rowNum = Number(params.rowNum);
    await deleteRow(sheetName, rowNum);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
