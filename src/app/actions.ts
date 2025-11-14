'use server';

import { maintainConversationHistory } from '@/ai/flows/maintain-conversation-history';
import type { Message } from '@/components/chat-interface';

export async function getAiResponse(history: Message[]): Promise<string> {
  const lastUserMessage = history.length > 0 ? history[history.length - 1] : null;

  if (!lastUserMessage || lastUserMessage.role !== 'user') {
    return "I'm sorry, I couldn't find your last message to respond to.";
  }

  try {
    const result = await maintainConversationHistory({
      userPrompt: lastUserMessage.content,
      conversationHistory: history.slice(0, history.length - 1),
    });
    return result.response;
  } catch (error) {
    console.error('AI Error:', error);
    return 'An error occurred while generating a response. Please try again.';
  }
}
