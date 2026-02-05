import { NextRequest, NextResponse } from 'next/server';
import { getIntent } from '@/lib/store';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const intent = getIntent(id);

    if (!intent) {
        return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    return NextResponse.json(intent);
}
