'use server';

/**
 * @fileOverview A flow for transcribing audio to text.
 * - speechToText - A function that transcribes audio to text.
 * - SpeechToTextInput - The input type for the speechToText function.
 * - SpeechToTextOutput - The return type for the speechToText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const SpeechToTextInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio to transcribe, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SpeechToTextInput = z.infer<typeof SpeechToTextInputSchema>;

const SpeechToTextOutputSchema = z.object({
  text: z.string().describe('The transcribed text.'),
});
export type SpeechToTextOutput = z.infer<typeof SpeechToTextOutputSchema>;

export async function speechToText(
  input: SpeechToTextInput
): Promise<SpeechToTextOutput> {
  return speechToTextFlow(input);
}

const speechToTextFlow = ai.defineFlow(
  {
    name: 'speechToTextFlow',
    inputSchema: SpeechToTextInputSchema,
    outputSchema: SpeechToTextOutputSchema,
  },
  async ({audioDataUri}) => {
    const {text} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash'),
      prompt: [
        {media: {url: audioDataUri}},
        {text: 'Transcrivez cet audio.'},
      ],
    });

    return {
      text: text,
    };
  }
);
