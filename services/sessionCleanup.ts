import { db } from './firebase';
import { collection, getDocs, doc, deleteDoc, Timestamp } from 'firebase/firestore';

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate();
  }

  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Checks for and removes inactive sessions where no participants have been active for more than 10 minutes.
 * This function should be run on a schedule using a cloud function or similar.
 */
export const cleanupInactiveSessions = async () => {
  try {
    // Get all sessions
    const sessionsRef = collection(db, 'sessions');
    const sessionsSnapshot = await getDocs(sessionsRef);
    
    const now = new Date();
    const inactiveThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
    const sessionCleanupPromises: Promise<void>[] = [];
    
    // Check each session for activity
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionId = sessionDoc.id;
      
      // Get all participants in this session
      const participantsRef = collection(db, 'sessions', sessionId, 'participants');
      const participantsSnapshot = await getDocs(participantsRef);
      
      if (participantsSnapshot.empty) {
        // No participants, mark session for deletion
        sessionCleanupPromises.push(deleteSession(sessionId));
        continue;
      }
      
      // Check last activity of all participants
      let mostRecentActivity = new Date(0); // Initialize with oldest possible date
      
      for (const participantDoc of participantsSnapshot.docs) {
        const participant = participantDoc.data();
        const lastSeenDate = toDate(participant.lastSeen);
        if (lastSeenDate) {
          if (lastSeenDate > mostRecentActivity) {
            mostRecentActivity = lastSeenDate;
          }
        }
      }
      
      // If the most recent activity is older than the threshold, delete the session
      const timeSinceLastActivity = now.getTime() - mostRecentActivity.getTime();
      if (timeSinceLastActivity > inactiveThreshold) {
        console.log(`Deleting inactive session ${sessionId}, last activity: ${mostRecentActivity}, time since: ${timeSinceLastActivity/60000} minutes`);
        sessionCleanupPromises.push(deleteSession(sessionId));
      }
    }
    
    // Wait for all deletion operations to complete
    await Promise.all(sessionCleanupPromises);
    
    console.log(`Session cleanup complete. Removed ${sessionCleanupPromises.length} inactive sessions.`);
    return sessionCleanupPromises.length;
  } catch (error) {
    console.error('Error cleaning up inactive sessions:', error);
    throw error;
  }
};

/**
 * Deletes a session and all its related documents
 */
const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    // Delete known subcollections before deleting the session document.
    for (const subcollection of ['participants', 'activityLog', 'messages']) {
      try {
        const snapshot = await getDocs(collection(db, 'sessions', sessionId, subcollection));
        await Promise.all(snapshot.docs.map(item => deleteDoc(doc(db, 'sessions', sessionId, subcollection, item.id))));
      } catch (error) {
        console.error(`Error deleting ${subcollection} for session ${sessionId}:`, error);
      }
    }

    // Finally delete the session document itself
    await deleteDoc(doc(db, 'sessions', sessionId));
    
    console.log(`Successfully deleted session ${sessionId} and all related documents.`);
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    throw error;
  }
}; 
