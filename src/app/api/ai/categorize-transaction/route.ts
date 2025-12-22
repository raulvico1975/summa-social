import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// =============================================================================
// SCHEMAS
// =============================================================================

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The description of the transaction.'),
  amount: z.number().describe('The amount of the transaction. Positive for income, negative for expenses.'),
  expenseCategories: z.array(z.string()).describe('List of available expense categories.'),
  incomeCategories: z.array(z.string()).describe('List of available income categories.'),
});

const CategorizeTransactionOutputSchema = z.object({
  category: z.string().describe('The predicted category of the transaction. If unsure, return "Revisar".'),
  confidence: z.number().describe('The confidence level of the categorization (0-1).'),
});

// =============================================================================
// PROMPT & FLOW (Route Handler scope - no SSR)
// =============================================================================

const prompt = ai.definePrompt({
  name: 'categorizeTransactionPromptAPI',
  input: { schema: CategorizeTransactionInputSchema },
  output: { schema: CategorizeTransactionOutputSchema },
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

// =============================================================================
// RESPONSE TYPES
// =============================================================================

type SuccessResponse = {
  ok: true;
  category: string;
  confidence: number;
};

type ErrorResponse = {
  ok: false;
  code: 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'TRANSIENT' | 'INVALID_INPUT' | 'AI_ERROR';
  message: string;
};

type ApiResponse = SuccessResponse | ErrorResponse;

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = CategorizeTransactionInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        ok: false,
        code: 'INVALID_INPUT',
        message: parseResult.error.message,
      });
    }

    const input = parseResult.data;

    // Call AI
    const { output } = await prompt(input);

    if (!output) {
      return NextResponse.json({
        ok: false,
        code: 'AI_ERROR',
        message: 'No output from AI model',
      });
    }

    return NextResponse.json({
      ok: true,
      category: output.category,
      confidence: output.confidence,
    });
  } catch (error: any) {
    console.error('[API] categorize-transaction error:', error);

    const errorMsg = error?.message || error?.toString() || '';
    const errorMsgLower = errorMsg.toLowerCase();

    // Detect quota/rate limit errors
    if (
      errorMsg.includes('429') ||
      errorMsgLower.includes('quota') ||
      errorMsgLower.includes('resource_exhausted')
    ) {
      return NextResponse.json({
        ok: false,
        code: 'QUOTA_EXCEEDED',
        message: 'AI quota exceeded. Please wait and retry.',
      });
    }

    if (errorMsgLower.includes('rate limit') || errorMsgLower.includes('rate_limit')) {
      return NextResponse.json({
        ok: false,
        code: 'RATE_LIMITED',
        message: 'Rate limited. Please slow down requests.',
      });
    }

    // Detect transient errors (503, 504, timeout)
    if (
      errorMsg.includes('503') ||
      errorMsg.includes('504') ||
      errorMsgLower.includes('timeout') ||
      errorMsgLower.includes('unavailable') ||
      errorMsgLower.includes('econnreset')
    ) {
      return NextResponse.json({
        ok: false,
        code: 'TRANSIENT',
        message: 'Temporary error. Will retry.',
      });
    }

    // Generic AI error
    return NextResponse.json({
      ok: false,
      code: 'AI_ERROR',
      message: errorMsg.substring(0, 200),
    });
  }
}
