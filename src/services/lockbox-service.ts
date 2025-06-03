
import { db } from '@/lib/firebase';
import type { LockboxEntry, LockboxFormData } from '@/types';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  orderBy,
  limit,
  startAfter,
  getCountFromServer
} from 'firebase/firestore';

const LOCKBOX_COLLECTION = 'lockboxEntries';

export async function addLockboxEntry(entryData: LockboxFormData, userId: string): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, LOCKBOX_COLLECTION), {
    ...entryData,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function getLockboxEntries(userId: string, pageLimit: number = 10, lastVisible?: LockboxEntry): Promise<{entries: LockboxEntry[], hasMore: boolean}> {
  const entriesRef = collection(db, LOCKBOX_COLLECTION);
  let q = query(
    entriesRef, 
    where('userId', '==', userId), 
    orderBy('propertyName'), 
    orderBy('unitNumber'),
    limit(pageLimit + 1) // Fetch one more to check if there's a next page
  );

  if (lastVisible) {
    q = query(
      entriesRef,
      where('userId', '==', userId),
      orderBy('propertyName'),
      orderBy('unitNumber'),
      startAfter(lastVisible.propertyName, lastVisible.unitNumber), // Use fields for pagination cursor
      limit(pageLimit + 1)
    );
  }
  
  const querySnapshot = await getDocs(q);
  const entries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LockboxEntry));
  
  const hasMore = entries.length > pageLimit;
  if (hasMore) {
    entries.pop(); // Remove the extra item used for hasMore check
  }

  return { entries, hasMore };
}

export async function getTotalLockboxEntries(userId: string): Promise<number> {
  const entriesRef = collection(db, LOCKBOX_COLLECTION);
  const q = query(entriesRef, where('userId', '==', userId));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}


export async function updateLockboxEntry(id: string, updates: Partial<LockboxFormData>, userId: string): Promise<void> {
  const entryDocRef = doc(db, LOCKBOX_COLLECTION, id);
  // Ensure the user owns this document before updating - typically done via Firestore rules,
  // but a client-side check or more complex query could be added if necessary.
  await updateDoc(entryDocRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteLockboxEntry(id: string, userId: string): Promise<void> {
  const entryDocRef = doc(db, LOCKBOX_COLLECTION, id);
  // Ensure user ownership before deleting - typically via Firestore rules.
  await deleteDoc(entryDocRef);
}

export async function getUniquePropertyNames(userId: string): Promise<string[]> {
  const entriesRef = collection(db, LOCKBOX_COLLECTION);
  const q = query(entriesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const propertyNames = new Set<string>();
  querySnapshot.forEach(doc => {
    const data = doc.data() as LockboxEntry;
    if (data.propertyName) {
      propertyNames.add(data.propertyName);
    }
  });
  return Array.from(propertyNames).sort();
}

export async function getUniqueUnitNumbers(userId: string, propertyName: string): Promise<string[]> {
  if (!propertyName) return [];
  const entriesRef = collection(db, LOCKBOX_COLLECTION);
  const q = query(
    entriesRef, 
    where('userId', '==', userId), 
    where('propertyName', '==', propertyName)
  );
  const querySnapshot = await getDocs(q);
  const unitNumbers = new Set<string>();
  querySnapshot.forEach(doc => {
    const data = doc.data() as LockboxEntry;
    if (data.unitNumber) {
      unitNumbers.add(data.unitNumber);
    }
  });
  return Array.from(unitNumbers).sort();
}

export async function getLockboxEntryByPropertyAndUnit(userId: string, propertyName: string, unitNumber: string): Promise<LockboxEntry | null> {
  if (!propertyName || !unitNumber) return null;
  const entriesRef = collection(db, LOCKBOX_COLLECTION);
  const q = query(
    entriesRef,
    where('userId', '==', userId),
    where('propertyName', '==', propertyName),
    where('unitNumber', '==', unitNumber),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as LockboxEntry;
  }
  return null;
}
