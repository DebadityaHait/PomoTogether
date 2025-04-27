/**
 * This file provides instructions for setting up a Firebase Cloud Function
 * to automatically clean up abandoned sessions.
 * 
 * To implement this in a production environment:
 * 
 * 1. Initialize Firebase Cloud Functions in your project:
 *    - Run: firebase init functions
 * 
 * 2. In your functions/index.js file, add the following code:
 */

/*
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Schedule function to run every 10 minutes
exports.cleanupAbandonedSessions = functions.pubsub
  .schedule('every 10 minutes')
  .onRun(async (context) => {
    try {
      // Get all sessions
      const sessionsSnapshot = await db.collection('sessions').get();
      
      const now = new Date();
      const inactiveThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
      const deletionPromises = [];
      
      // Check each session for activity
      for (const sessionDoc of sessionsSnapshot.docs) {
        const sessionId = sessionDoc.id;
        
        // Get all participants in this session
        const participantsSnapshot = await db
          .collection('sessions')
          .doc(sessionId)
          .collection('participants')
          .get();
        
        if (participantsSnapshot.empty) {
          // No participants, delete session
          deletionPromises.push(deleteSession(sessionId));
          continue;
        }
        
        // Check last activity of all participants
        let mostRecentActivity = new Date(0);
        
        for (const participantDoc of participantsSnapshot.docs) {
          const participant = participantDoc.data();
          if (participant.lastSeen) {
            const lastSeenDate = participant.lastSeen.toDate();
            
            if (lastSeenDate > mostRecentActivity) {
              mostRecentActivity = lastSeenDate;
            }
          }
        }
        
        // If most recent activity is older than threshold, delete session
        const timeSinceLastActivity = now.getTime() - mostRecentActivity.getTime();
        if (timeSinceLastActivity > inactiveThreshold) {
          console.log(`Deleting inactive session ${sessionId}, last activity: ${mostRecentActivity}`);
          deletionPromises.push(deleteSession(sessionId));
        }
      }
      
      // Wait for all deletion operations to complete
      await Promise.all(deletionPromises);
      
      console.log(`Session cleanup complete. Removed ${deletionPromises.length} inactive sessions.`);
      return null;
    } catch (error) {
      console.error('Error cleaning up inactive sessions:', error);
      return null;
    }
  });

// Helper function to delete a session and all its subcollections
async function deleteSession(sessionId) {
  try {
    // Delete all participants
    const participantsSnapshot = await db
      .collection('sessions')
      .doc(sessionId)
      .collection('participants')
      .get();
    
    const participantDeletions = participantsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(participantDeletions);
    
    // Delete any activity logs
    try {
      const activityLogsSnapshot = await db
        .collection('sessions')
        .doc(sessionId)
        .collection('activityLog')
        .get();
      
      const activityLogDeletions = activityLogsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(activityLogDeletions);
    } catch (error) {
      console.error(`Error deleting activity logs for session ${sessionId}:`, error);
      // Continue with session deletion
    }
    
    // Delete the session document itself
    await db.collection('sessions').doc(sessionId).delete();
    
    console.log(`Successfully deleted session ${sessionId} and all related documents.`);
    return true;
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    return false;
  }
}
*/

/**
 * 3. Deploy the function to Firebase:
 *    - Run: firebase deploy --only functions
 * 
 * 4. Verify that the function is running by checking the Firebase Functions dashboard
 *    and looking at the logs.
 * 
 * This function will run every 10 minutes and check for sessions where no participants
 * have been active in the last 10 minutes. If found, it will delete those sessions and
 * all related data.
 * 
 * Note: This is more reliable than client-side cleanup since it doesn't depend on users
 * being active in the app. The server will handle cleanup automatically.
 */ 