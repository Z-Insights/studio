'use server';

/**
 * @fileOverview Implements unit number autocomplete functionality.
 *
 * - unitNumberAutocomplete - A function that suggests existing unit numbers based on user input.
 * - UnitNumberAutocompleteInput - The input type for the unitNumberAutocomplete function.
 * - UnitNumberAutocompleteOutput - The return type for the unitNumberAutocomplete function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const UnitNumberAutocompleteInputSchema = z.object({
  propertyName: z.string().describe('The name of the property.'),
  userInput: z.string().describe('The user input for the unit number.'),
  existingUnitNumbers: z.array(z.string()).describe('A list of existing unit numbers for the property.'),
});
export type UnitNumberAutocompleteInput = z.infer<typeof UnitNumberAutocompleteInputSchema>;

const UnitNumberAutocompleteOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested unit numbers based on the user input.'),
});
export type UnitNumberAutocompleteOutput = z.infer<typeof UnitNumberAutocompleteOutputSchema>;

export async function unitNumberAutocomplete(input: UnitNumberAutocompleteInput): Promise<UnitNumberAutocompleteOutput> {
  return unitNumberAutocompleteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'unitNumberAutocompletePrompt',
  input: {schema: UnitNumberAutocompleteInputSchema},
  output: {schema: UnitNumberAutocompleteOutputSchema},
  prompt: `Given the property name "{{propertyName}}" and the following list of existing unit numbers: {{existingUnitNumbers}},
  suggest unit numbers that the user might be trying to type, given their input of "{{userInput}}".
  Only suggest unit numbers from the existing list.  If there are no good suggestions, return an empty array.
  Return the suggestions as a JSON array of strings.`,
});

const unitNumberAutocompleteFlow = ai.defineFlow(
  {
    name: 'unitNumberAutocompleteFlow',
    inputSchema: UnitNumberAutocompleteInputSchema,
    outputSchema: UnitNumberAutocompleteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
