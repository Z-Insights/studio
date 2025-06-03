
"use client";
import React, { useState, useMemo } from 'react';
import type { LockboxEntry } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilePenLine, Trash2, ArrowUpDown, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface LockboxTableProps {
  entries: LockboxEntry[];
  onEdit: (entry: LockboxEntry) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
  fetchNextPage?: () => void;
  fetchPreviousPage?: () => void; // Placeholder if bi-directional pagination is needed
  hasMore?: boolean;
  currentPage: number;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  totalEntries: number;
}

type SortKey = keyof Pick<LockboxEntry, 'propertyName' | 'unitNumber' | 'lockboxLocation'>;
type SortDirection = 'asc' | 'desc';

export function LockboxTable({ 
    entries, 
    onEdit, 
    onDelete, 
    isLoading,
    fetchNextPage,
    hasMore,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalEntries
}: LockboxTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('propertyName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [entryToDelete, setEntryToDelete] = useState<LockboxEntry | null>(null);

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = entries;
    if (searchTerm) {
      filtered = entries.filter(entry =>
        Object.values(entry).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Sorting is now primarily handled by Firestore query, client-side sort is a fallback or for non-paginated views
    return [...filtered].sort((a, b) => {
      const valA = String(a[sortKey] || '').toLowerCase();
      const valB = String(b[sortKey] || '').toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [entries, searchTerm, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    // Note: If using server-side sorting, this would trigger a refetch with new sort params
  };
  
  const SortableHeader = ({ columnKey, label }: { columnKey: SortKey; label: string }) => (
    <TableHead onClick={() => handleSort(columnKey)} className="cursor-pointer">
      <div className="flex items-center">
        {label}
        {sortKey === columnKey && (sortDirection === 'asc' ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />)}
        {sortKey !== columnKey && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
      </div>
    </TableHead>
  );

  const totalPages = Math.ceil(totalEntries / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalEntries);


  return (
    <div className="w-full space-y-4">
      <Input
        placeholder="Search entries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />
      {isLoading && entries.length === 0 ? (
        <div className="text-center p-4">Loading entries...</div>
      ) : (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader columnKey="propertyName" label="Property Name" />
                  <SortableHeader columnKey="unitNumber" label="Unit No." />
                  <SortableHeader columnKey="lockboxLocation" label="Location" />
                  <TableHead>Code</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedEntries.length > 0 ? (
                  filteredAndSortedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.propertyName}</TableCell>
                      <TableCell>{entry.unitNumber}</TableCell>
                      <TableCell>{entry.lockboxLocation}</TableCell>
                      <TableCell>{entry.lockboxCode}</TableCell>
                      <TableCell className="max-w-xs truncate">{entry.notes || '-'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(entry)} aria-label="Edit">
                            <FilePenLine className="h-4 w-4" />
                          </Button>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => setEntryToDelete(entry)} aria-label="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No entries found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           <div className="flex items-center justify-between px-2">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing {totalEntries > 0 ? startIndex : 0} to {endIndex} of {totalEntries} entries.
            </div>
            <div className="flex items-center space-x-2">
                 <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                    }}
                    >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={`${itemsPerPage}`} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <span className="text-sm text-muted-foreground">Rows per page</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => { /* This would require going to page 1 */ }}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => { /* This needs more logic for previous page if not using simple increment/decrement */ }}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={fetchNextPage}
                disabled={!hasMore}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => { /* This would require jumping to last page */ }}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the lockbox entry for 
                    Property: {entryToDelete.propertyName}, Unit: {entryToDelete.unitNumber}.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={() => {
                        onDelete(entryToDelete.id);
                        setEntryToDelete(null);
                    }}
                    className={buttonVariants({variant: "destructive"})}
                >
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Helper for shadcn buttonVariants in AlertDialogAction
const buttonVariants = ({ variant }: { variant: "destructive" | "default" | "outline" | "secondary" | "ghost" | "link" | null | undefined }) => {
  if (variant === "destructive") return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
  // Add other variants if needed
  return "";
};
