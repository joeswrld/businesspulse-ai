import { NextRequest, NextResponse } from 'next/server';
import handler from '@/api/send-feedback-email';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const headers = Object.fromEntries(request.headers.entries());
  
  const req = { method: 'POST', body, headers };
  const res = {
    status: (code: number) => ({
      json: (data: any) => NextResponse.json(data, { status: code })
    })
  };
  
  return handler(req, res);
}