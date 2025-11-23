'use server';

/**
 * @fileOverview This flow maintains conversation history for contextual relevance.
 *
 * - maintainConversationHistory - A function that handles the conversation history.
 * - MaintainConversationHistoryInput - The input type for the maintainConversationHistory function, including the template name and data.
 * - MaintainConversationHistoryOutput - The return type for the maintainConversationHistory function.
 */

import {ai}from '@/ai/genkit';
import {z} from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  fileDataUri: z.string().optional().nullable(),
});

const MaintainConversationHistoryInputSchema = z.object({
  userPrompt: z.string().describe('The latest user prompt.'),
  fileDataUri: z.string().optional().nullable().describe("A file, if provided by the user, as a data URI."),
  conversationHistory: z
    .array(MessageSchema)
    .optional()
    .describe('The history of the conversation.'),
});
export type MaintainConversationHistoryInput = z.infer<
  typeof MaintainConversationHistoryInputSchema
>;

const MaintainConversationHistoryOutputSchema = z.object({
  response: z.string().describe('The AI generated response.'),
  updatedConversationHistory: z.array(MessageSchema),
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
  output: {schema: z.object({ response: z.string() }) },
  prompt: `You are an AI assistant specializing in Senegalese labor law.
You must answer in the same language as the user's question (French or English).
You must only answer questions relating to the Senegalese labor code and existing collective agreements in Senegal.
If a question does not relate to either the Senegalese labor code or collective agreements, you must decline to answer.
Answer the user's question based on the conversation history and any attached file.

Conversation history:
{{#each conversationHistory}}
  {{this.role}}: {{this.content}}
{{/each}}

User's question: {{userPrompt}}
{{#if fileDataUri}}Attached file: {{media url=fileDataUri}}{{/if}}

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
      {role: 'user', content: input.userPrompt, fileDataUri: input.fileDataUri},
      {role: 'assistant', content: output!.response, fileDataUri: null},
    ];

    return {
      response: output!.response,
      updatedConversationHistory: updatedConversationHistory,
    };
  }
);
