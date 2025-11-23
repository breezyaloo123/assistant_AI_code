'use server';

import { maintainConversationHistory } from '@/ai/flows/maintain-conversation-history';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { speechToText } from '@/ai/flows/speech-to-text';
import type { Message } from '@/components/chat-interface';

export async function getAiResponse(history: Message[]): Promise<string> {
  const lastUserMessage = history.length > 0 ? history[history.length - 1] : null;

  if (!lastUserMessage || lastUserMessage.role !== 'user') {
    throw new Error("I'm sorry, I couldn't find your last message to respond to.");
  }

  try {
    const result = await maintainConversationHistory({
      userPrompt: lastUserMessage.content,
      fileDataUri: lastUserMessage.fileDataUri,
      conversationHistory: history.slice(0, history.length - 1),
    });
    return result.response;
  } catch (error) {
    console.error('AI Error:', error);
    // Re-throw the error to be caught by the client
    throw new Error('An error occurred while generating a response. Please try again.');
  }
}

export async function getAiResponseAudio(text: string): Promise<string | null> {
  try {
    const result = await textToSpeech({ text });
    return result.audio;
  } catch (error) {
    console.error('TTS Error:', error);
    // Return null instead of throwing an error to not break the chat flow
    return null;
  }
}

export async function transcribeAudio(audioDataUri: string): Promise<string> {
  try {
    const result = await speechToText({ audioDataUri });
    return result.text;
  } catch (error) {
    console.error('Transcription Error:', error);
    return '';
  }
}
