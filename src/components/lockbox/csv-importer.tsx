
"use client";
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { LockboxFormData } from '@/types';
import { lockboxFormSchema } from './lockbox-form-schema';
import { Loader2, UploadCloud } from 'lucide-react';

interface CsvImporterProps {
  onImportSuccess: () => void;
}

export function CsvImporter({ onImportSuccess }: CsvImporterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsImporting(true);

    if (!user) {
      toast({ title: "Error", description: "You must be logged in to import data.", variant: "destructive" });
      setIsImporting(false);
      return;
    }

    try {
      const fileContent = await file.text();
      const lines = fileContent.split(/\r\n|\n/).filter(line => line.trim() !== ''); // Split lines and remove empty ones
      
      if (lines.length <= 1) {
        throw new Error("CSV file is empty or contains only headers.");
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredHeaders = ['propertyname', 'unitnumber', 'lockboxlocation', 'lockboxcode'];
      const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

      if (missingHeaders.length > 0) {
        throw new Error(`CSV missing required headers: ${missingHeaders.join(', ')}. Headers must be: PropertyName, UnitNumber, LockboxLocation, LockboxCode, Notes (optional)`);
      }
      
      const propertyNameIndex = headers.indexOf('propertyname');
      const unitNumberIndex = headers.indexOf('unitnumber');
      const lockboxLocationIndex = headers.indexOf('lockboxlocation');
      const lockboxCodeIndex = headers.indexOf('lockboxcode');
      const notesIndex = headers.indexOf('notes');


      const entries: LockboxFormData[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const entryData: any = {
            propertyName: values[propertyNameIndex]?.trim(),
            unitNumber: values[unitNumberIndex]?.trim(),
            lockboxLocation: values[lockboxLocationIndex]?.trim(),
            lockboxCode: values[lockboxCodeIndex]?.trim(),
        };
        if (notesIndex !== -1 && values[notesIndex]) {
            entryData.notes = values[notesIndex]?.trim();
        }

        const validation = lockboxFormSchema.safeParse(entryData);
        if (validation.success) {
          entries.push(validation.data);
        } else {
          errors.push(`Row ${i + 1}: ${validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
      }

      if (errors.length > 0) {
        toast({
          title: "Validation Errors",
          description: (
            <div className="max-h-40 overflow-y-auto">
              <p>Some rows in the CSV could not be validated:</p>
              <ul className="list-disc list-inside">
                {errors.slice(0,5).map((e, i) => <li key={i}>{e}</li>)}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors.</li>}
              </ul>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        setFileName(null);
        return;
      }

      if (entries.length === 0) {
        toast({ title: "Info", description: "No valid entries found in CSV to import.", variant: "default" });
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
        setFileName(null);
        return;
      }
      
      // Batch import logic
      // Firestore batch writes are limited (e.g., 500 operations).
      // For simplicity, importing one by one here. For large CSVs, batching is crucial.
      const { addLockboxEntry, getLockboxEntryByPropertyAndUnit, updateLockboxEntry } = await import('@/services/lockbox-service');
      let importedCount = 0;
      let updatedCount = 0;

      for (const entry of entries) {
        const existingEntry = await getLockboxEntryByPropertyAndUnit(user.uid, entry.propertyName, entry.unitNumber);
        if (existingEntry) {
          await updateLockboxEntry(existingEntry.id, entry, user.uid);
          updatedCount++;
        } else {
          await addLockboxEntry(entry, user.uid);
          importedCount++;
        }
      }

      toast({ title: "Import Successful", description: `${importedCount} new entries added, ${updatedCount} entries updated.` });
      onImportSuccess();

    } catch (error) {
      console.error("Error importing CSV:", error);
      toast({ title: "Import Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      setFileName(null);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Import Lockbox Data</CardTitle>
        <CardDescription>Upload a CSV file to populate lockbox entries. Required columns: PropertyName, UnitNumber, LockboxLocation, LockboxCode. Optional: Notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="csv-file">CSV File</Label>
          <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} disabled={isImporting} />
        </div>
        {fileName && <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>}
        <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full">
          {isImporting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
          ) : (
            <><UploadCloud className="mr-2 h-4 w-4" /> Select CSV and Import</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
