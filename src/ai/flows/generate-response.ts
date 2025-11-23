// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview An AI agent that generates responses based on user prompts.
 *
 * - generateResponse - A function that generates a response based on a user prompt.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate a response for.'),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The generated response.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `Vous êtes un assistant IA spécialisé dans le droit du travail sénégalais.
Vous devez répondre dans la même langue que la question de l'utilisateur (français ou wolof).
Vous ne devez répondre qu'aux questions relatives au code du travail sénégalais et aux conventions collectives existantes au Sénégal.
Si une question ne concerne ni le code du travail sénégalais ni les conventions collectives, vous devez refuser de répondre.

Veuillez répondre à la question suivante :

{{prompt}}`,
});

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    const {output} = await generateResponsePrompt(input);
    return output!;
  }
);
