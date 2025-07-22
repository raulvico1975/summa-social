'use server';

/**
 * @fileOverview AI flow to suggest potentially missing documents for uncategorized transactions.
 *
 * - suggestMissingDocuments - Function to suggest missing documents based on transaction details.
 * - SuggestMissingDocumentsInput - Input type for the suggestMissingDocuments function.
 * - SuggestMissingDocumentsOutput - Output type for the suggestMissingDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMissingDocumentsInputSchema = z.object({
  transactionDetails: z
    .string()
    .describe('Details of the uncategorized transaction, including date, amount, and description.'),
});
export type SuggestMissingDocumentsInput = z.infer<
  typeof SuggestMissingDocumentsInputSchema
>;

const SuggestMissingDocumentsOutputSchema = z.object({
  suggestedDocuments: z
    .array(z.string())
    .describe(
      'An array of document types that are likely missing for the transaction (e.g., receipt, invoice, contract).'      
    ),
  reasoning: z
    .string()
    .describe(
      'The AI’s reasoning for suggesting the listed documents, based on the transaction details.'
    ),
});
export type SuggestMissingDocumentsOutput = z.infer<
  typeof SuggestMissingDocumentsOutputSchema
>;

export async function suggestMissingDocuments(
  input: SuggestMissingDocumentsInput
): Promise<SuggestMissingDocumentsOutput> {
  return suggestMissingDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMissingDocumentsPrompt',
  input: {schema: SuggestMissingDocumentsInputSchema},
  output: {schema: SuggestMissingDocumentsOutputSchema},
  prompt: `Given the following transaction details, suggest what documents might be missing and explain your reasoning.

Transaction Details: {{{transactionDetails}}}

Consider common financial documents such as receipts, invoices, contracts, and statements.

Format your response as a JSON object with "suggestedDocuments" (an array of document types) and "reasoning" (an explanation).
`,
});

const suggestMissingDocumentsFlow = ai.defineFlow(
  {
    name: 'suggestMissingDocumentsFlow',
    inputSchema: SuggestMissingDocumentsInputSchema,
    outputSchema: SuggestMissingDocumentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
