import { PDCAMode, PDCAStep } from "../types";

/**
 * Frontend service:
 * Calls our Vercel Serverless Function (/api/coach) so the API Key stays server-side.
 *
 * Note: This is implemented as an async generator to match App.tsx's `for await` loop.
 * We yield the full text once (you can extend to true streaming later).
 */
export class AICoachService {
  async *getSuggestionStream(
    mode: PDCAMode,
    step: keyof PDCAStep,
    currentData: PDCAStep,
    prompt: string
  ) {
    // If user opens the app via file:// (offline preview), there is no backend.
    // Provide a friendly hint instead of throwing network errors.
    const isFilePreview =
      typeof window !== "undefined" && window.location?.protocol === "file:";

    if (isFilePreview) {
      yield "离线预览模式：界面可以正常查看，但 AI 教师点评需要部署到 Vercel 并配置 DEEPSEEK_API_KEY 后才可用。";
      return;
    }

    try {
      const resp = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          step,
          currentData: (currentData as any)?.[step] ?? currentData,
          prompt,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        yield `无法生成教师点评：服务器返回错误（${resp.status}）。\n\n${errText}`;
        return;
      }

      const data = await resp.json();
      yield data?.text ?? "（模型未返回内容）";
    } catch (error: any) {
      yield "无法生成教师点评，请检查网络或稍后再试。";
    }
  }
}
