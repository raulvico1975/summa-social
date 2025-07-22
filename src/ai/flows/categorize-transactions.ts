'use server';

/**
 * @fileOverview Automatically categorizes transactions using AI based on descriptions, amounts, and keywords.
 *
 * - categorizeTransaction - A function that categorizes a transaction.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  amount: z.number().describe('The amount of the transaction. Positive for income, negative for expenses.'),
  expenseCategories: z.array(z.string()).describe('List of available expense categories.'),
  incomeCategories: z.array(z.string()).describe('List of available income categories.'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  category: z.string().describe('The predicted category of the transaction. If unsure, return "Revisar".'),
  confidence: z.number().describe('The confidence level of the categorization (0-1).'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  return categorizeTransactionFlow(input);
}


const prompt = ai.definePrompt({
  name: 'categorizeTransactionPrompt',
  input: {schema: CategorizeTransactionInputSchema},
  output: {schema: CategorizeTransactionOutputSchema},
  prompt: `You are an expert financial categorizer for a social organization.
  Given the transaction description and amount, determine the most appropriate accounting item (partida comptable) for the transaction from the provided lists.
  Your response must be in Spanish.

  Transaction Details:
  Description: {{{description}}}
  Amount: {{{amount}}}
  
  If the amount is negative, it's an expense. You MUST choose one of the following expense categories: {{#each expenseCategories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
  If the amount is positive, it's an income. You MUST choose one of the following income categories: {{#each incomeCategories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.

  If you cannot confidently determine the category from the provided lists, you MUST return "Revisar".

  Please provide the category and a confidence level (0-1) for your categorization.
  `,
});

const categorizeTransactionFlow = ai.defineFlow(
  {
    name: 'categorizeTransactionFlow',
    inputSchema: CategorizeTransactionInputSchema,
    outputSchema: CategorizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
