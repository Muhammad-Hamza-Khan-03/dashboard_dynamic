
import { NextRequest, NextResponse } from 'next/server';
import { reqGroqAI } from "@/lib/utils/groq";

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Call Groq AI
    const chatCompletion = await reqGroqAI(content);
    
    // Return the response
    return NextResponse.json({
      content: chatCompletion.choices[0]?.message?.content || '',
    });
  } catch (error) {
    console.error('Error in AI dashboard generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate dashboard' },
      { status: 500 }
    );
  }
}