'use server';

/**
 * @fileOverview This file defines a Genkit flow that allows users to select from predefined prompt templates for common AI tasks.
 *
 * - promptFromTemplate - A function that accepts a template name and input data, then generates a prompt from the selected template.
 * - PromptFromTemplateInput - The input type for the promptFromTemplate function, including the template name and data.
 * - PromptFromTemplateOutput - The output type for the promptFromTemplate function, which is a string representing the generated prompt.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PromptFromTemplateInputSchema = z.object({
  templateName: z
    .string()
    .describe('The name of the prompt template to use.'),
  templateData: z
    .record(z.any())
    .describe('The data to inject into the prompt template.'),
});
export type PromptFromTemplateInput = z.infer<typeof PromptFromTemplateInputSchema>;

const PromptFromTemplateOutputSchema = z.string().describe('The generated prompt string.');
export type PromptFromTemplateOutput = z.infer<typeof PromptFromTemplateOutputSchema>;

export async function promptFromTemplate(
  input: PromptFromTemplateInput
): Promise<PromptFromTemplateOutput> {
  return promptFromTemplateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promptFromTemplatePrompt',
  input: {schema: PromptFromTemplateInputSchema},
  output: {schema: PromptFromTemplateOutputSchema},
  prompt: `Prompt for template: {{{templateName}}}. Data: {{{templateData}}}`,
});

const promptFromTemplateFlow = ai.defineFlow(
  {
    name: 'promptFromTemplateFlow',
    inputSchema: PromptFromTemplateInputSchema,
    outputSchema: PromptFromTemplateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
