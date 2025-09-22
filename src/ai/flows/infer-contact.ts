'use server';

/**
 * @fileOverview Infers a contact from a transaction description.
 *
 * - inferContact - A function that infers a contact.
 * - InferContactInput - The input type for the inferContact function.
 * - InferContactOutput - The return type for the inferContact function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InferContactInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  contacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).describe('List of available contacts (suppliers, donors, etc.).'),
});
export type InferContactInput = z.infer<typeof InferContactInputSchema>;

const InferContactOutputSchema = z.object({
  contactId: z.string().nullable().describe('The ID of the most likely contact, or null if no clear match is found.'),
});
export type InferContactOutput = z.infer<typeof InferContactOutputSchema>;

export async function inferContact(input: InferContactInput): Promise<InferContactOutput> {
  // If there are no contacts, we can't infer anything.
  if (input.contacts.length === 0) {
    return { contactId: null };
  }
  return inferContactFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inferContactPrompt',
  input: {schema: InferContactInputSchema},
  output: {schema: InferContactOutputSchema},
  prompt: `You are an expert data extraction agent. Your task is to find the most likely contact (supplier, company, person) from a list that matches a given bank transaction description.

Transaction Description:
"{{{description}}}"

Available Contacts:
{{#each contacts}}
- ID: {{this.id}}, Name: {{this.name}}
{{/each}}

Analyze the transaction description and determine if any of the contact names are present or clearly referenced in the text. The name might not be an exact match, but it should be very similar (e.g., "Masmovil" in the description should match a contact named "Grupo Masmovil").

If you find a clear match, return the corresponding contact ID. If there is no clear match, or if you are unsure, you MUST return null. Only return the ID of one contact.
`,
});

const inferContactFlow = ai.defineFlow(
  {
    name: 'inferContactFlow',
    inputSchema: InferContactInputSchema,
    outputSchema: InferContactOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
