import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY1,
});

export const reqGroqAI = async (content: any) => {
  const res = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content,
      },
    ],
    model: "deepseek-r1-distill-llama-70b",
  });
  return res;
};