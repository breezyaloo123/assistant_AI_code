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
  prompt: `Vous êtes un assistant IA spécialisé dans le droit du travail sénégalais.
Vous devez répondre dans la même langue que la question de l'utilisateur (français ou wolof).
Vous ne devez répondre qu'aux questions relatives au code du travail sénégalais et aux conventions collectives existantes au Sénégal.
Si une question ne concerne ni le code du travail sénégalais ni les conventions collectives, vous devez refuser de répondre.
Répondez à la question de l'utilisateur en vous basant sur l'historique de la conversation et sur le fichier joint s'il y en a un.

Historique de la conversation :
{{#each conversationHistory}}
  {{this.role}}: {{this.content}}
{{/each}}

Question de l'utilisateur : {{userPrompt}}
{{#if fileDataUri}}Fichier joint: {{media url=fileDataUri}}{{/if}}

Assistant :`, // Respond as the assistant
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
