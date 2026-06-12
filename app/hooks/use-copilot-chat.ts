import { useCallback } from "react";
import { useLocation } from "react-router";
import { useCopilotStore, msgId, type ChatMessage } from "~/stores/copilot-store";
import { getMockAIResponse, getAlternative } from "~/lib/ai-mock";
import { useSchemaStore } from "~/stores/schema-store";

// Shared send logic for both the Copilot Rail and the full Copilot page.
// Pushes a user message, then an assistant message that the StreamingText
// component reveals. Pure client-side, no network.
export function useCopilotChat() {
  const pushMessage = useCopilotStore((s) => s.pushMessage);
  const messages = useCopilotStore((s) => s.messages);
  const location = useLocation();

  const send = useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      // context: which model is open (for "add fields" type prompts)
      const modelId = location.pathname.startsWith("/schema/")
        ? location.pathname.split("/")[2]
        : undefined;
      const model = modelId
        ? useSchemaStore.getState().getModel(modelId)?.name
        : undefined;

      pushMessage({ id: msgId(), role: "user", text: trimmed });

      const res = getMockAIResponse(trimmed, { model, route: location.pathname });
      const id = msgId();
      // small "thinking" delay before the assistant streams
      const assistant: ChatMessage = {
        id,
        role: "assistant",
        text: res.text,
        preview: res.preview,
        streaming: true,
      };
      window.setTimeout(() => pushMessage(assistant), Math.min(600, res.thinkingMs ?? 400));
    },
    [pushMessage, location.pathname],
  );

  const alternative = useCallback(
    (prompt: string) => {
      const res = getAlternative(prompt);
      pushMessage({
        id: msgId(),
        role: "assistant",
        text: res.text,
        preview: res.preview,
        streaming: true,
      });
    },
    [pushMessage],
  );

  return { send, alternative, messages };
}
