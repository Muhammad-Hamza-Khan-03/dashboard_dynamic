import { reqGroqAI } from "@/lib/utils/groq";

export async function POST(req:Request) {
  const data = await req.json();
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Only POST requests are allowed" }), { status: 405 });
  }

  try {
    const chatCompletion = await reqGroqAI(data.content);
    return Response.json({
      content: chatCompletion.choices[0]?.message?.content || "",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Internal Server Error" });
  }
}