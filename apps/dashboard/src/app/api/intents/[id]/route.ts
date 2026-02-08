import { NextRequest, NextResponse } from 'next/server';
import { getIntent, isValidIntentId } from '@/lib/store';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    
    if (!isValidIntentId(id)) {
        return NextResponse.json({ error: 'Invalid intent identifier' }, { status: 400 });
    }
    
    const intent = getIntent(id);

    if (!intent) {
        return NextResponse.json({ error: 'Intent not found' }, { status: 404 });
    }

    return NextResponse.json(intent);
}
