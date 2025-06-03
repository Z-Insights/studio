
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { LockboxEntry, LockboxFormData } from '@/types';
import { lockboxFormSchema, type LockboxFormValues } from './lockbox-form-schema';
import { useDebounce } from '@/hooks/use-debounce';
import { getUniquePropertyNames, getUniqueUnitNumbers, getLockboxEntryByPropertyAndUnit } from '@/services/lockbox-service';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LockboxFormProps {
  onSubmitSuccess: () => void;
  initialData?: LockboxEntry | null;
  onCancelEdit?: () => void;
}

export function LockboxForm({ onSubmitSuccess, initialData, onCancelEdit }: LockboxFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [propertySuggestions, setPropertySuggestions] = useState<string[]>([]);
  const [unitSuggestions, setUnitSuggestions] = useState<string[]>([]);
  
  const [allPropertyNames, setAllPropertyNames] = useState<string[]>([]);
  const [currentUnitNumbers, setCurrentUnitNumbers] = useState<string[]>([]);
  const [dataPersistenceMessage, setDataPersistenceMessage] = useState<string | null>(null);


  const form = useForm<LockboxFormValues>({
    resolver: zodResolver(lockboxFormSchema),
    defaultValues: {
      propertyName: '',
      unitNumber: '',
      lockboxLocation: '',
      lockboxCode: '',
      notes: '',
    },
  });

  const propertyNameValue = form.watch('propertyName');
  const unitNumberValue = form.watch('unitNumber');
  const debouncedPropertyName = useDebounce(propertyNameValue, 300); // Reduced debounce for faster local filtering
  const debouncedUnitNumber = useDebounce(unitNumberValue, 300); // Reduced debounce for faster local filtering

  useEffect(() => {
    if (user?.uid) {
      getUniquePropertyNames(user.uid).then(setAllPropertyNames);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        propertyName: initialData.propertyName,
        unitNumber: initialData.unitNumber,
        lockboxLocation: initialData.lockboxLocation,
        lockboxCode: initialData.lockboxCode,
        notes: initialData.notes || '',
      });
      // Pre-fill unit numbers for the initial property
      if (user?.uid && initialData.propertyName) {
        getUniqueUnitNumbers(user.uid, initialData.propertyName).then(setCurrentUnitNumbers);
      }
      setDataPersistenceMessage("Editing existing entry.");
    } else {
      form.reset({ propertyName: '', unitNumber: '', lockboxLocation: '', lockboxCode: '', notes: '' });
      setDataPersistenceMessage(null);
    }
  }, [initialData, form, user?.uid]);

  useEffect(() => {
    // Client-side property name suggestions
    if (debouncedPropertyName && debouncedPropertyName.length > 0 && user?.uid) {
      setPropertySuggestions(
        allPropertyNames.filter(name => 
          name.toLowerCase().includes(debouncedPropertyName.toLowerCase())
        )
      );
    } else {
      setPropertySuggestions([]);
    }
  }, [debouncedPropertyName, allPropertyNames, user?.uid]);

  useEffect(() => {
    // Client-side unit number suggestions
    const fetchUnitsAndSuggest = async () => {
      if (debouncedUnitNumber && debouncedUnitNumber.length > 0 && propertyNameValue && user?.uid) {
        let unitsToFilter = currentUnitNumbers;
        // Fetch current unit numbers if property changed or not yet fetched
        if (form.formState.dirtyFields.propertyName || currentUnitNumbers.length === 0 || (initialData && propertyNameValue !== initialData.propertyName)) {
           const fetchedUnits = await getUniqueUnitNumbers(user.uid, propertyNameValue);
           setCurrentUnitNumbers(fetchedUnits);
           unitsToFilter = fetchedUnits;
        }
        setUnitSuggestions(
          unitsToFilter.filter(unit => 
            unit.toLowerCase().includes(debouncedUnitNumber.toLowerCase())
          )
        );
      } else {
        setUnitSuggestions([]);
      }
    };
    fetchUnitsAndSuggest();
  }, [debouncedUnitNumber, propertyNameValue, user?.uid, currentUnitNumbers, form.formState.dirtyFields.propertyName, initialData]);

  // Effect to check for existing data when property and unit are filled
  useEffect(() => {
    const checkExistingData = async () => {
      if (propertyNameValue && unitNumberValue && user?.uid && !initialData) { // Only check for new entries
        const existingEntry = await getLockboxEntryByPropertyAndUnit(user.uid, propertyNameValue, unitNumberValue);
        if (existingEntry) {
          setDataPersistenceMessage(`Data for ${propertyNameValue} - Unit ${unitNumberValue} already exists. Editing will overwrite.`);
          form.setValue('lockboxLocation', existingEntry.lockboxLocation);
          form.setValue('lockboxCode', existingEntry.lockboxCode);
          form.setValue('notes', existingEntry.notes || '');
        } else {
           if (dataPersistenceMessage?.includes("already exists")) setDataPersistenceMessage(null); // Clear if previously set
        }
      }
    };

    if(!form.formState.dirtyFields.lockboxCode && !form.formState.dirtyFields.lockboxLocation) { // Avoid overwriting if user started typing details
        checkExistingData();
    }
  }, [propertyNameValue, unitNumberValue, user?.uid, initialData, form, dataPersistenceMessage]);


  const handleFormSubmit = async (values: LockboxFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    setDataPersistenceMessage(null); // Clear message on submit

    try {
      // This is a simplified way to check for existing entry to decide on add/update
      // For a new form (no initialData), if an entry is found via property/unit, it becomes an update
      let entryToUpdateId = initialData?.id;
      if (!entryToUpdateId) {
        const existingEntry = await getLockboxEntryByPropertyAndUnit(user.uid, values.propertyName, values.unitNumber);
        if (existingEntry) {
          entryToUpdateId = existingEntry.id;
        }
      }

      if (entryToUpdateId) {
        // Dynamically import update function from service
        const { updateLockboxEntry } = await import('@/services/lockbox-service');
        await updateLockboxEntry(entryToUpdateId, values, user.uid);
        toast({ title: "Success", description: "Lockbox entry updated." });
      } else {
        // Dynamically import add function from service
        const { addLockboxEntry } = await import('@/services/lockbox-service');
        await addLockboxEntry(values, user.uid);
        toast({ title: "Success", description: "Lockbox entry added." });
      }
      form.reset();
      setPropertySuggestions([]);
      setUnitSuggestions([]);
      setCurrentUnitNumbers([]); // Reset current unit numbers
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({ title: "Error", description: "Failed to save entry. " + (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderSuggestions = (suggestions: string[], field: keyof LockboxFormValues, currentSuggestionsSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (suggestions.length === 0) return null;
    return (
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" side="bottom" align="start">
        <ul className="max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {suggestions.map((suggestion, index) => (
            <li key={index} 
                className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                onMouseDown={() => { // Use onMouseDown to fire before onBlur
                  form.setValue(field, suggestion, { shouldValidate: true, shouldDirty: true });
                  currentSuggestionsSetter([]);
                  if (field === 'propertyName') {
                    form.setFocus('unitNumber');
                    if (user?.uid) getUniqueUnitNumbers(user.uid, suggestion).then(setCurrentUnitNumbers);
                  } else if (field === 'unitNumber') {
                    form.setFocus('lockboxLocation');
                  }
                }}>
              {suggestion}
            </li>
          ))}
        </ul>
      </PopoverContent>
    );
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Lockbox Entry' : 'Add New Lockbox Entry'}</CardTitle>
        {dataPersistenceMessage && (
             <CardDescription className={`flex items-center gap-1 ${dataPersistenceMessage.includes("already exists") ? 'text-orange-600' : 'text-blue-600'}`}>
                {dataPersistenceMessage.includes("already exists") ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {dataPersistenceMessage}
            </CardDescription>
        )}
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="propertyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <Popover open={propertySuggestions.length > 0 && field.value.length > 0 && form.formState.isDirty} onOpenChange={() => {}}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <div className="relative">
                          <Input placeholder="e.g., Main Street Complex" {...field} autoComplete="off" onBlur={() => setTimeout(() => setPropertySuggestions([]), 150)} />
                        </div>
                      </FormControl>
                    </PopoverTrigger>
                    {renderSuggestions(propertySuggestions, "propertyName", setPropertySuggestions)}
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Number</FormLabel>
                   <Popover open={unitSuggestions.length > 0 && field.value.length > 0 && form.formState.isDirty} onOpenChange={() => {}}>
                    <PopoverTrigger asChild>
                      <FormControl>
                         <div className="relative">
                            <Input placeholder="e.g., Apt 101, Unit B" {...field} autoComplete="off" onBlur={() => setTimeout(() => setUnitSuggestions([]), 150)} disabled={!propertyNameValue}/>
                         </div>
                      </FormControl>
                    </PopoverTrigger>
                    {renderSuggestions(unitSuggestions, "unitNumber", setUnitSuggestions)}
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lockboxLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lockbox Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Front door, Gas meter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lockboxCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lockbox Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1234, XYZ7" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Key is sticky, call before entry" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            {initialData && onCancelEdit && (
              <Button type="button" variant="outline" onClick={() => { onCancelEdit(); form.reset(); setDataPersistenceMessage(null); setPropertySuggestions([]); setUnitSuggestions([]); setCurrentUnitNumbers([]); }}>
                Cancel
              </Button>
            )}
            {!initialData && <div />} 
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initialData ? 'Update Entry' : 'Add Entry'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
