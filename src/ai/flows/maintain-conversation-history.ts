'use server';

/**
 * @fileOverview This flow maintains conversation history for contextual relevance.
 *
 * - maintainConversationHistory - A function that handles the conversation history.
 * - MaintainConversationHistoryInput - The input type for the maintainConversationHistory function.
 * - MaintainConversationHistoryOutput - The return type for the maintainConversationHistory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MaintainConversationHistoryInputSchema = z.object({
  userPrompt: z.string().describe('The latest user prompt.'),
  conversationHistory: z
    .array(z.object({role: z.enum(['user', 'assistant']), content: z.string()}))
    .optional()
    .describe('The history of the conversation.'),
});
export type MaintainConversationHistoryInput = z.infer<
  typeof MaintainConversationHistoryInputSchema
>;

const MaintainConversationHistoryOutputSchema = z.object({
  response: z.string().describe('The AI generated response.'),
  updatedConversationHistory:
    z.array(z.object({role: z.enum(['user', 'assistant']), content: z.string()})),
});
export type MaintainConversationHistoryOutput = z.infer<
  typeof MaintainConversationHistoryOutputSchema
>;

export async function maintainConversationHistory(
  input: MaintainConversationHistoryInput
): Promise<MaintainConversationHistoryOutput> {
  return maintainConversationHistoryFlow(input);
}

const conversationPrompt = ai.definePrompt({
  name: 'conversationPrompt',
  input: {schema: MaintainConversationHistoryInputSchema},
  output: {schema: MaintainConversationHistoryOutputSchema},
  prompt: `You are a helpful AI assistant. Respond to the user prompt based on the conversation history.

Conversation History:
{{#each conversationHistory}}
  {{this.role}}: {{this.content}}
{{/each}}

User Prompt: {{userPrompt}}

Assistant:`, // Respond as the assistant
});

const maintainConversationHistoryFlow = ai.defineFlow(
  {
    name: 'maintainConversationHistoryFlow',
    inputSchema: MaintainConversationHistoryInputSchema,
    outputSchema: MaintainConversationHistoryOutputSchema,
  },
  async input => {
    const {output} = await conversationPrompt(input);

    const updatedConversationHistory = [
      ...(input.conversationHistory || []),
      {role: 'user', content: input.userPrompt},
      {role: 'assistant', content: output!.response},
    ];

    return {
      response: output!.response,
      updatedConversationHistory: updatedConversationHistory,
    };
  }
);
