
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { LockboxForm } from '@/components/lockbox/lockbox-form';
import { LockboxTable } from '@/components/lockbox/lockbox-table';
import { CsvImporter } from '@/components/lockbox/csv-importer';
import type { LockboxEntry } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { deleteLockboxEntry, getLockboxEntries, getTotalLockboxEntries } from '@/services/lockbox-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building2, KeyRound } from 'lucide-react';

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50];

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [lockboxEntries, setLockboxEntries] = useState<LockboxEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<LockboxEntry | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_OPTIONS[0]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [lastVisibleEntry, setLastVisibleEntry] = useState<LockboxEntry | undefined>(undefined);
  const [hasMoreEntries, setHasMoreEntries] = useState(true);
  const [pageHistory, setPageHistory] = useState<(LockboxEntry | undefined)[]>([undefined]); // Stores first entry of each page


  const fetchEntries = useCallback(async (pageNumber: number, limit: number, lastDoc?: LockboxEntry) => {
    if (!user?.uid) return;
    setIsLoading(true);
    try {
      const { entries, hasMore } = await getLockboxEntries(user.uid, limit, lastDoc);
      setLockboxEntries(entries);
      setHasMoreEntries(hasMore);
      if (entries.length > 0) {
        if (pageNumber > currentPage) { // Moving forward
          setLastVisibleEntry(entries[entries.length - 1]);
          // Store the first document of the new page for potential "previous" navigation
          // This simple history only works well for next page, previous needs more complex cursor management
          setPageHistory(prev => {
            const newHistory = [...prev];
            newHistory[pageNumber] = entries[0]; // Store first item of current page
            return newHistory;
          });

        } else if (pageNumber < currentPage) { // Moving backward
           // For "previous", ideally we'd use endBefore() with the first item of current page (lastVisibleEntry)
           // Firestore's JS SDK doesn't have endBefore directly. Pagination backwards is harder with startAfter.
           // A common workaround is to query in reverse order or re-fetch from the start up to that page.
           // For simplicity, this example's "previous" will be less efficient if implemented with startAfter only.
           // The current fetchEntries is designed for "next" page.
           // Resetting lastVisibleEntry to the one before the current page's first item.
           setLastVisibleEntry(pageHistory[pageNumber -1]);
        }
      } else if (pageNumber > 1){ // No entries on a page > 1, means we went too far
        setHasMoreEntries(false);
      }
      setCurrentPage(pageNumber);

      const total = await getTotalLockboxEntries(user.uid);
      setTotalEntries(total);

    } catch (error) {
      console.error("Error fetching lockbox entries:", error);
      toast({ title: "Error", description: "Failed to load entries.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, toast, currentPage]); // currentPage dependency is for context if page changes outside next/prev buttons

  useEffect(() => {
    if (user?.uid && !authLoading) {
      fetchEntries(1, itemsPerPage, undefined); // Initial fetch for page 1
      setPageHistory([undefined]); // Reset page history on user change or itemsPerPage change
      setCurrentPage(1);
    }
  }, [user?.uid, authLoading, itemsPerPage]); // Re-fetch if itemsPerPage changes

  const handleFormSubmitSuccess = () => {
    setEditingEntry(null);
    // Refetch the current page to see updated data or new entry
    // Fetch from the start of the current page: pageHistory[currentPage -1] for pages > 1, else undefined.
    fetchEntries(currentPage, itemsPerPage, currentPage > 1 ? pageHistory[currentPage-1] : undefined);
  };

  const handleEditEntry = (entry: LockboxEntry) => {
    setEditingEntry(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteLockboxEntry(id, user.uid);
      toast({ title: "Success", description: "Lockbox entry deleted." });
      // Refetch current page
      fetchEntries(currentPage, itemsPerPage, currentPage > 1 ? pageHistory[currentPage-1] : undefined);
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast({ title: "Error", description: "Failed to delete entry.", variant: "destructive" });
    }
  };

  const handleImportSuccess = () => {
     fetchEntries(1, itemsPerPage, undefined); // Reset to page 1 after import
     setPageHistory([undefined]);
     setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (hasMoreEntries) {
      fetchEntries(currentPage + 1, itemsPerPage, lastVisibleEntry);
    }
  };

  // handlePreviousPage is complex with startAfter. For a robust solution,
  // one might need to store cursors for both start and end of each fetched page,
  // or re-query with different orderBy direction and limit.
  // This is a simplified version assuming we can get the "start" of the previous page.
  const handlePreviousPage = () => {
    if (currentPage > 1) {
        const previousPageStartCursor = pageHistory[currentPage - 2]; // pageHistory is 0-indexed, currentPage is 1-indexed
        fetchEntries(currentPage - 1, itemsPerPage, previousPageStartCursor);
    }
  };
  
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading authentication...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <header className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-3">
          <KeyRound className="h-10 w-10 text-primary" />
          <Building2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline">HomeWorks Lockbox Ledger</h1>
        <p className="text-muted-foreground">
          Securely manage and track your property lockbox information.
        </p>
      </header>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <LockboxForm 
            onSubmitSuccess={handleFormSubmitSuccess} 
            initialData={editingEntry}
            onCancelEdit={() => setEditingEntry(null)}
          />
          <CsvImporter onImportSuccess={handleImportSuccess} />
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Lockbox Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <LockboxTable
                entries={lockboxEntries}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
                isLoading={isLoading}
                fetchNextPage={handleNextPage}
                // fetchPreviousPage={handlePreviousPage} // Previous page logic is more complex with Firestore cursors
                hasMore={hasMoreEntries}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={(value) => {
                    setItemsPerPage(value);
                    // When itemsPerPage changes, reset to page 1
                    fetchEntries(1, value, undefined);
                    setPageHistory([undefined]);
                    setCurrentPage(1);
                }}
                totalEntries={totalEntries}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
