// 'use server'
'use server';
/**
 * @fileOverview Property name autocomplete flow.
 *
 * This flow suggests existing property names as the user types in the property name field.
 * It exports:
 * - `propertyNameAutocomplete`: The main function to trigger the flow.
 * - `PropertyNameAutocompleteInput`: The input type for the `propertyNameAutocomplete` function.
 * - `PropertyNameAutocompleteOutput`: The output type for the `propertyNameAutocomplete` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PropertyNameAutocompleteInputSchema = z.object({
  propertyNamePrefix: z
    .string()
    .describe('The prefix of the property name being typed by the user.'),
  existingPropertyNames: z
    .array(z.string())
    .describe('A list of existing property names.'),
});
export type PropertyNameAutocompleteInput = z.infer<
  typeof PropertyNameAutocompleteInputSchema
>;

const PropertyNameAutocompleteOutputSchema = z.object({
  suggestedPropertyName: z
    .string()
    .describe(
      'The suggested property name based on the prefix and existing names.'
    ),
  confidenceScore: z
    .number()
    .describe(
      'A score (0-1) indicating the confidence level of the suggestion.'
    ),
});
export type PropertyNameAutocompleteOutput = z.infer<
  typeof PropertyNameAutocompleteOutputSchema
>;

export async function propertyNameAutocomplete(
  input: PropertyNameAutocompleteInput
): Promise<PropertyNameAutocompleteOutput> {
  return propertyNameAutocompleteFlow(input);
}

const propertyNameAutocompletePrompt = ai.definePrompt({
  name: 'propertyNameAutocompletePrompt',
  input: {schema: PropertyNameAutocompleteInputSchema},
  output: {schema: PropertyNameAutocompleteOutputSchema},
  prompt: `Given the following prefix for a property name: {{{propertyNamePrefix}}}, and a list of existing property names: {{#each existingPropertyNames}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}, suggest the most likely existing property name the user is trying to type. If no property name matches the prefix well enough, return an empty string for suggestedPropertyName and a confidenceScore of 0.

Consider the following when determining if a name matches well enough:
- The prefix should be a clear starting sequence of the suggested name.
- Typos and small variations should be taken into account.
- More weight should be given to property names that have a longer matching sequence.

Output in JSON format.
`,
});

const propertyNameAutocompleteFlow = ai.defineFlow(
  {
    name: 'propertyNameAutocompleteFlow',
    inputSchema: PropertyNameAutocompleteInputSchema,
    outputSchema: PropertyNameAutocompleteOutputSchema,
  },
  async input => {
    const {output} = await propertyNameAutocompletePrompt(input);
    return output!;
  }
);
