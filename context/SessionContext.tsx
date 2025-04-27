import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { doc, setDoc, onSnapshot, collection, query, where, getDocs, serverTimestamp, deleteDoc, addDoc, orderBy, limit, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateSessionCode } from '../utils/helpers';
import { cleanupInactiveSessions } from '../services/sessionCleanup';

interface Message {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

interface SessionContextType {
  username: string;
  setUsername: (name: string) => void;
  avatar: string;
  setAvatar: (avatar: string) => void;
  sessionCode: string;
  currentSession: Session | null;
  isInSession: boolean;
  createSession: (workMinutes?: number, breakMinutes?: number, rounds?: number, longBreakMinutes?: number) => Promise<string>;
  joinSession: (code: string) => Promise<boolean>;
  leaveSession: () => Promise<void>;
  participants: Participant[];
  currentTask: string;
  setCurrentTask: (task: string) => void;
  timerState: {
    isRunning: boolean;
    currentPhase: 'work' | 'break' | 'longBreak';
    timeRemaining: number;
    round: number;
  };
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  skipPhase: () => Promise<void>;
  isHost: boolean;
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  participantId: string;
  kickParticipant: (participantId: string) => Promise<void>;
}

interface Session {
  id: string;
  createdAt: Date;
  hostId: string;
  workMinutes: number;
  breakMinutes: number;
  rounds: number;
  longBreakMinutes: number;
  state: {
    isRunning: boolean;
    currentPhase: 'work' | 'break' | 'longBreak';
    timeRemaining: number;
    round: number;
    startedAt: Date | { toDate: () => Date } | string | number | null;
  };
}

interface Participant {
  id: string;
  username: string;
  currentTask: string;
  joinedAt: Date;
  lastSeen: Date;
  avatar?: string;
  removed?: boolean;
  removedAt?: Date;
}

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string>('');
  const [avatar, setAvatar] = useState<string>('cat.png'); // Default avatar
  const [sessionCode, setSessionCode] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentTask, setCurrentTask] = useState<string>('');
  const [timerState, setTimerState] = useState({
    isRunning: false,
    currentPhase: 'work' as 'work' | 'break' | 'longBreak',
    timeRemaining: 25 * 60, // Default 25 minutes in seconds
    round: 1,
  });
  const [participantId, setParticipantId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Timer interval ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Heartbeat interval ref for presence tracking
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Presence check interval ref (for host only)
  const presenceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Session cleanup interval ref (for all clients, but will only take effect on the first one that runs it)
  const sessionCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is in a session
  const isInSession = !!currentSession;
  
  // Check if current user is the host
  const isHost = currentSession?.hostId === participantId;

  // Timer countdown effect
  useEffect(() => {
    // Clear any existing timer interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Start the timer if running
    if (isInSession && timerState.isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerState(prev => {
          // If time is up, handle phase transition (this should be synced with Firestore)
          if (prev.timeRemaining <= 1) {
            return prev; // Let the server handle the phase change
          }
          
          // Otherwise, decrement the time
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1
          };
        });
      }, 1000);
    }

    // Clean up on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isInSession, timerState.isRunning]);

  // Phase change effect - check if timer reaches zero
  useEffect(() => {
    if (isInSession && timerState.isRunning && timerState.timeRemaining <= 0 && isHost) {
      handlePhaseComplete();
    }
  }, [timerState.timeRemaining, isInSession, timerState.isRunning]);

  // Handle automatic phase changes when timer reaches zero
  const handlePhaseComplete = async () => {
    if (!currentSession) return;
    
    let nextPhase: 'work' | 'break' | 'longBreak' = 'work';
    let nextRound = currentSession.state.round;
    let nextTimeRemaining = 0;

    // Determine next phase
    if (timerState.currentPhase === 'work') {
      if (timerState.round === currentSession.rounds) {
        nextPhase = 'longBreak';
        nextTimeRemaining = currentSession.longBreakMinutes * 60;
      } else {
        nextPhase = 'break';
        nextTimeRemaining = currentSession.breakMinutes * 60;
      }
    } else if (timerState.currentPhase === 'break') {
      nextPhase = 'work';
      nextRound = timerState.round + 1;
      nextTimeRemaining = currentSession.workMinutes * 60;
    } else {
      // After long break, go back to round 1
      nextPhase = 'work';
      nextRound = 1;
      nextTimeRemaining = currentSession.workMinutes * 60;
    }

    try {
      // Update session state in Firestore
      await setDoc(
        doc(db, 'sessions', sessionCode),
        {
          state: {
            isRunning: false, // Pause at phase transition
            currentPhase: nextPhase,
            timeRemaining: nextTimeRemaining,
            round: nextRound,
            startedAt: null,
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error changing phase:', error);
    }
  };

  // Helper function to safely convert various timestamp formats to Date
  const convertToDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    try {
      if (timestamp instanceof Date) {
        return timestamp;
      }
      
      // Firebase Timestamp with toDate method
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      
      // Timestamp as number or string
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) ? date : null;
    } catch (err) {
      console.error('Error converting timestamp:', err);
      return null;
    }
  };

  // Create a new Pomodoro session
  const createSession = async (
    workMinutes = 25,
    breakMinutes = 5,
    rounds = 4,
    longBreakMinutes = 15
  ) => {
    const newCode = generateSessionCode();
    const newParticipantId = Math.random().toString(36).substring(2, 9);
    setParticipantId(newParticipantId);
    
    const sessionData: Session = {
      id: newCode,
      createdAt: new Date(),
      hostId: newParticipantId, // Set current user as host
      workMinutes,
      breakMinutes,
      rounds,
      longBreakMinutes,
      state: {
        isRunning: false,
        currentPhase: 'work',
        timeRemaining: workMinutes * 60,
        round: 1,
        startedAt: null,
      },
    };
    
    try {
      await setDoc(doc(db, 'sessions', newCode), sessionData);
      setSessionCode(newCode);
      setCurrentSession(sessionData);
      
      // Add user as a participant with the same ID used for host
      const participantData: Participant = {
        id: newParticipantId,
        username,
        avatar, // Add avatar to participant
        currentTask: '',
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      await setDoc(
        doc(db, 'sessions', newCode, 'participants', newParticipantId),
        participantData
      );
      
      return newCode;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };

  // Join an existing session
  const joinSession = async (code: string) => {
    try {
      // Check if session exists
      const sessionDoc = await getDocs(query(collection(db, 'sessions'), where('id', '==', code)));
      
      if (sessionDoc.empty) {
        return false;
      }
      
      // Get the session data
      const sessionData = sessionDoc.docs[0].data() as Session;
      
      // Get existing participants
      const participantsQuery = await getDocs(collection(db, 'sessions', code, 'participants'));
      const existingParticipants = participantsQuery.docs.map(doc => doc.data() as Participant);
      
      // Check if a user with the same username and avatar already exists
      const existingParticipant = existingParticipants.find(
        p => p.username === username && p.avatar === avatar
      );
      
      let participantDocId: string;
      
      if (existingParticipant) {
        // Use the existing participant's ID
        participantDocId = existingParticipant.id;
        console.log(`User ${username} reconnecting with existing ID: ${participantDocId}`);
        setParticipantId(participantDocId);
        
        // Update the lastSeen timestamp and any other relevant fields
        await setDoc(
          doc(db, 'sessions', code, 'participants', participantDocId),
          {
            lastSeen: new Date(),
            removed: false, // In case they were previously marked as removed
            removedAt: null
          },
          { merge: true }
        );
      } else {
        // Generate a unique ID for this participant
        participantDocId = Math.random().toString(36).substring(2, 9);
        setParticipantId(participantDocId);

        // Add user to participants
        const participantData: Participant = {
          id: participantDocId,
          username,
          avatar,
          currentTask: '',
          joinedAt: new Date(),
          lastSeen: new Date(),
        };

        await setDoc(
          doc(db, 'sessions', code, 'participants', participantDocId),
          participantData
        );
      }
      
      // Set session code and current session data
      setSessionCode(code);
      setCurrentSession(sessionData);
      
      // Calculate actual time remaining (safer handling for timeRemaining and timestamps)
      let actualTimeRemaining = sessionData.state?.timeRemaining || sessionData.workMinutes * 60;
      
      if (sessionData.state?.isRunning && sessionData.state?.startedAt) {
        const startedAt = convertToDate(sessionData.state.startedAt);
        
        if (startedAt) {
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
          actualTimeRemaining = Math.max(0, actualTimeRemaining - elapsedSeconds);
        }
      }
      
      // Initialize timer state from session data with actual time remaining
      setTimerState({
        isRunning: sessionData.state?.isRunning || false,
        currentPhase: (sessionData.state?.currentPhase || 'work') as 'work' | 'break' | 'longBreak',
        timeRemaining: actualTimeRemaining,
        round: sessionData.state?.round || 1,
      });
      
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      return false;
    }
  };

  // Leave current session
  const leaveSession = async () => {
    if (!currentSession || !sessionCode) return;

    try {
      // Remove user from participants if we have their ID
      if (participantId) {
        // Properly delete the participant document when user leaves
        await deleteDoc(doc(db, 'sessions', sessionCode, 'participants', participantId));
        
        // Log the leave action if activity logging is enabled
        try {
          const activityLogRef = collection(db, 'sessions', sessionCode, 'activityLog');
          await setDoc(doc(activityLogRef), {
            type: 'participant_left',
            participantId,
            username,
            timestamp: new Date()
          });
        } catch (logError) {
          console.error('Error logging leave activity:', logError);
        }
      }

      // Reset local state
      setSessionCode('');
      setCurrentSession(null);
      setParticipants([]);
      setCurrentTask('');
      setParticipantId('');
      setTimerState({
        isRunning: false,
        currentPhase: 'work' as 'work' | 'break' | 'longBreak',
        timeRemaining: 25 * 60,
        round: 1,
      });
    } catch (error) {
      console.error('Error leaving session:', error);
      throw error;
    }
  };

  // Start timer for current session
  const startTimer = async () => {
    if (!currentSession || !isHost) return;
    
    try {
      // Get the next phase timing based on current phase
      let timeRemaining = currentSession.state.timeRemaining;
      
      if (timeRemaining <= 0) {
        // If timer was at 0, reset it to the correct duration for the current phase
        if (currentSession.state.currentPhase === 'work') {
          timeRemaining = currentSession.workMinutes * 60;
        } else if (currentSession.state.currentPhase === 'break') {
          timeRemaining = currentSession.breakMinutes * 60;
        } else {
          timeRemaining = currentSession.longBreakMinutes * 60;
        }
      }
      
      // Update session state in Firestore
      await setDoc(
        doc(db, 'sessions', sessionCode),
        {
          state: {
            isRunning: true,
            timeRemaining,
            startedAt: new Date(),
            currentPhase: currentSession.state.currentPhase,
            round: currentSession.state.round,
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  };

  // Pause timer for current session
  const pauseTimer = async () => {
    if (!currentSession || !isHost) return;
    
    try {
      // Update session state in Firestore
      await setDoc(
        doc(db, 'sessions', sessionCode),
        {
          state: {
            isRunning: false,
            timeRemaining: timerState.timeRemaining,
            startedAt: null,
            currentPhase: currentSession.state.currentPhase,
            round: currentSession.state.round,
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error pausing timer:', error);
      throw error;
    }
  };

  // Skip current phase
  const skipPhase = async () => {
    if (!currentSession || !isHost) return;
    
    try {
      // Determine the next phase
      let nextPhase: 'work' | 'break' | 'longBreak';
      let nextRound = timerState.round;
      let nextTimeRemaining = 0;
      
      // Similar logic to handlePhaseComplete
      if (timerState.currentPhase === 'work') {
        if (timerState.round === currentSession.rounds) {
          nextPhase = 'longBreak';
          nextTimeRemaining = currentSession.longBreakMinutes * 60;
        } else {
          nextPhase = 'break';
          nextTimeRemaining = currentSession.breakMinutes * 60;
        }
      } else if (timerState.currentPhase === 'break') {
        nextPhase = 'work';
        nextRound = timerState.round + 1;
        nextTimeRemaining = currentSession.workMinutes * 60;
      } else {
        // After long break, go back to round 1
        nextPhase = 'work';
        nextRound = 1;
        nextTimeRemaining = currentSession.workMinutes * 60;
      }
      
      // Update session state in Firestore
      await setDoc(
        doc(db, 'sessions', sessionCode),
        {
          state: {
            isRunning: false, // Pause after skip
            currentPhase: nextPhase,
            timeRemaining: nextTimeRemaining,
            round: nextRound,
            startedAt: null,
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error skipping phase:', error);
      throw error;
    }
  };

  // Update current task in Firestore
  useEffect(() => {
    if (participantId && sessionCode && currentTask) {
      try {
        setDoc(
          doc(db, 'sessions', sessionCode, 'participants', participantId),
          { currentTask },
          { merge: true }
        );
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }
  }, [currentTask, sessionCode, participantId]);

  // Listen for session changes
  useEffect(() => {
    if (!sessionCode) return;

    const unsubscribe = onSnapshot(doc(db, 'sessions', sessionCode), (doc) => {
      if (doc.exists()) {
        const sessionData = doc.data() as Session;
        setCurrentSession(sessionData);
        
        // Calculate actual time remaining if session is running (with safer handling)
        let actualTimeRemaining = sessionData.state?.timeRemaining || 25 * 60;
        
        if (sessionData.state?.isRunning && sessionData.state?.startedAt) {
          const startedAt = convertToDate(sessionData.state.startedAt);
          
          if (startedAt) {
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
            actualTimeRemaining = Math.max(0, actualTimeRemaining - elapsedSeconds);
          }
        }
        
        setTimerState({
          isRunning: sessionData.state?.isRunning || false,
          currentPhase: (sessionData.state?.currentPhase || 'work') as 'work' | 'break' | 'longBreak',
          timeRemaining: actualTimeRemaining,
          round: sessionData.state?.round || 1,
        });
      }
    });

    return () => unsubscribe();
  }, [sessionCode]);

  // Listen for participants
  useEffect(() => {
    if (!sessionCode) return;

    const unsubscribe = onSnapshot(collection(db, 'sessions', sessionCode, 'participants'), (snapshot) => {
      const participants: Participant[] = [];
      snapshot.forEach((doc) => {
        const participant = doc.data() as Participant;
        // Only include active participants (not removed)
        if (!participant.removed) {
          participants.push(participant);
        }
      });
      setParticipants(participants);
      
      // Check if current user has been kicked (no longer in participants list)
      if (participantId && !participants.some(p => p.id === participantId)) {
        // Current user is no longer in participants list - they've been kicked
        // Reset local state to send them back to join/create screen
        setSessionCode('');
        setCurrentSession(null);
        setParticipants([]);
        setCurrentTask('');
        setTimerState({
          isRunning: false,
          currentPhase: 'work',
          timeRemaining: 25 * 60,
          round: 1,
        });
        // Keep participantId so they can rejoin with a different session
      }
    });

    return () => unsubscribe();
  }, [sessionCode, participantId]);

  // Heartbeat effect - update lastSeen timestamp every 30 seconds
  useEffect(() => {
    // Clear any existing heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Start the heartbeat if in a session
    if (isInSession && participantId && sessionCode) {
      // Immediately update lastSeen timestamp
      updateHeartbeat();
      
      // Set interval to update lastSeen timestamp
      heartbeatIntervalRef.current = setInterval(() => {
        updateHeartbeat();
      }, 30000); // Every 30 seconds
    }
    
    // Clean up on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isInSession, participantId, sessionCode]);
  
  // Update user's heartbeat (lastSeen timestamp)
  const updateHeartbeat = async () => {
    if (!participantId || !sessionCode) return;
    
    try {
      await setDoc(
        doc(db, 'sessions', sessionCode, 'participants', participantId),
        { 
          lastSeen: new Date() 
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  };
  
  // Presence check effect - check and remove inactive participants (host only)
  useEffect(() => {
    // Clear any existing presence check interval
    if (presenceCheckIntervalRef.current) {
      clearInterval(presenceCheckIntervalRef.current);
      presenceCheckIntervalRef.current = null;
    }
    
    // Start the presence check if in a session and is host
    if (isInSession && isHost && sessionCode) {
      // Set interval to check inactive participants
      presenceCheckIntervalRef.current = setInterval(() => {
        checkInactiveParticipants();
      }, 60000); // Every 60 seconds (1 minute)
    }
    
    // Clean up on unmount
    return () => {
      if (presenceCheckIntervalRef.current) {
        clearInterval(presenceCheckIntervalRef.current);
      }
    };
  }, [isInSession, isHost, sessionCode]);
  
  // Check and remove inactive participants
  const checkInactiveParticipants = async () => {
    if (!isHost || !sessionCode) return;
    
    try {
      const now = new Date();
      const inactiveThreshold = 1 * 60 * 1000; // 1 minute in milliseconds
      
      // Get fresh participant data directly from the database
      const participantsSnapshot = await getDocs(collection(db, 'sessions', sessionCode, 'participants'));
      
      if (participantsSnapshot.empty) {
        console.log('No participants found in the session.');
        return;
      }
      
      const allParticipants = participantsSnapshot.docs.map(doc => {
        try {
          return { id: doc.id, ...doc.data() } as Participant;
        } catch (err) {
          console.warn(`Error processing participant data for ${doc.id}:`, err);
          // Return a minimal valid participant object to avoid crashes
          return { 
            id: doc.id, 
            username: 'Error reading username', 
            currentTask: '', 
            joinedAt: new Date(), 
            lastSeen: new Date(0) // Old date to mark as inactive
          } as Participant;
        }
      });
      
      if (!allParticipants.length) {
        console.log('No valid participants found after processing.');
        return;
      }
      
      const inactiveParticipants = allParticipants.filter(participant => {
        try {
          // Don't remove the host
          if (participant.id === currentSession?.hostId) return false;
          
          // Check if participant is inactive
          const lastSeen = participant.lastSeen;
          if (!lastSeen) return true; // No lastSeen timestamp, consider inactive
          
          // Safe conversion to date
          let lastSeenDate: Date;
          try {
            // Try to handle various formats safely
            if (lastSeen instanceof Date) {
              lastSeenDate = lastSeen;
            } else if (typeof lastSeen === 'object' && lastSeen !== null) {
              // Check if it's a Firebase Timestamp (has toDate method)
              const maybeTimestamp = lastSeen as any;
              if (typeof maybeTimestamp.toDate === 'function') {
                lastSeenDate = maybeTimestamp.toDate();
              } else {
                // Fall back to string conversion
                lastSeenDate = new Date(String(lastSeen));
              }
            } else if (typeof lastSeen === 'number') {
              lastSeenDate = new Date(lastSeen);
            } else if (typeof lastSeen === 'string') {
              lastSeenDate = new Date(lastSeen);
            } else {
              console.warn(`Unrecognized lastSeen format for ${participant.id}:`, lastSeen);
              return true; // Consider inactive if format is unrecognized
            }
          } catch (err) {
            console.warn(`Error parsing lastSeen date for ${participant.id}:`, err);
            return true; // Consider inactive if there's a parsing error
          }
          
          // Check for valid date
          if (isNaN(lastSeenDate.getTime())) {
            console.warn(`Invalid date for participant ${participant.id}`);
            return true; // Consider inactive if date is invalid
          }
          
          const timeSinceLastSeen = now.getTime() - lastSeenDate.getTime();
          return timeSinceLastSeen > inactiveThreshold;
        } catch (err) {
          console.warn(`Error checking if participant ${participant.id} is inactive:`, err);
          return true; // Consider inactive if there's any error in processing
        }
      });
      
      console.log(`Found ${inactiveParticipants.length} inactive participants out of ${allParticipants.length} total`);
      
      // Remove inactive participants
      for (const participant of inactiveParticipants) {
        try {
          await removeParticipant(participant.id, 'inactivity');
          const timeAgo = participant.lastSeen ? formatTimeAgo(participant.lastSeen) : 'unknown time';
          console.log(`Removed inactive participant: ${participant.username || 'Unknown'}, last seen ${timeAgo}`);
        } catch (err) {
          console.error(`Error removing participant ${participant.id}:`, err);
        }
      }
    } catch (error) {
      console.error('Error checking inactive participants:', error);
    }
  };
  
  // Helper to format time ago for logging
  const formatTimeAgo = (date: any): string => {
    try {
      // Check if date is missing or invalid
      if (!date) return 'unknown time';
      
      // Ensure we have a valid Date object
      let dateObj: Date;
      
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
        // Handle Firebase Timestamp objects
        dateObj = date.toDate();
      } else if (typeof date === 'number') {
        dateObj = new Date(date);
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else {
        return 'unknown format';
      }
      
      // Verify we have a valid Date
      if (isNaN(dateObj.getTime())) {
        return 'invalid date';
      }
      
      const now = new Date();
      const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
      
      if (seconds < 60) return `${seconds} seconds ago`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
      return `${Math.floor(seconds / 86400)} days ago`;
    } catch (error) {
      console.warn('Error formatting time:', error);
      return 'error calculating time';
    }
  };
  
  // Remove a participant from the session
  const removeParticipant = async (participantId: string, reason: 'inactivity' | 'kicked' = 'inactivity') => {
    if (!sessionCode) return;
    
    try {
      // Get participant data before removing for logging purposes
      const participantRef = doc(db, 'sessions', sessionCode, 'participants', participantId);
      const participantSnapshot = await getDoc(participantRef);
      
      if (participantSnapshot.exists()) {
        const participantData = participantSnapshot.data() as Participant;
        console.log(`Removing participant: ${participantData.username}, reason: ${reason}`);
        
        // Delete the participant document to fully remove them
        await deleteDoc(participantRef);
        
        // Add to session activity log if needed
        try {
          const activityLogRef = collection(db, 'sessions', sessionCode, 'activityLog');
          await addDoc(activityLogRef, {
            type: reason === 'kicked' ? 'participant_kicked' : 'participant_removed',
            participantId,
            username: participantData.username,
            reason,
            timestamp: new Date()
          });
        } catch (logError) {
          console.error('Error logging activity:', logError);
        }
      }
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  // Publicly exposed function to kick a participant (only host can use)
  const kickParticipant = async (participantId: string) => {
    if (!isHost || !sessionCode) return;
    await removeParticipant(participantId, 'kicked');
  };

  // Session cleanup effect - check for abandoned sessions every 5 minutes
  useEffect(() => {
    // Clear any existing cleanup interval
    if (sessionCleanupIntervalRef.current) {
      clearInterval(sessionCleanupIntervalRef.current);
      sessionCleanupIntervalRef.current = null;
    }
    
    // Set interval to check for abandoned sessions
    sessionCleanupIntervalRef.current = setInterval(() => {
      // Only run if we're in a session (ensures the app is actively being used)
      if (isInSession) {
        triggerSessionCleanup();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Clean up on unmount
    return () => {
      if (sessionCleanupIntervalRef.current) {
        clearInterval(sessionCleanupIntervalRef.current);
      }
    };
  }, [isInSession]);
  
  // Trigger cleanup of abandoned sessions
  const triggerSessionCleanup = async () => {
    try {
      await cleanupInactiveSessions();
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }
  };

  // Listen for chat messages
  useEffect(() => {
    if (!sessionCode) return;

    const messagesRef = collection(db, 'sessions', sessionCode, 'messages');
    const messagesQuery = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        newMessages.push({
          id: doc.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.text,
          timestamp: data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : new Date(data.timestamp),
        });
      });
      // Sort messages chronologically (oldest first)
      setMessages(newMessages.reverse());
    });

    return () => unsubscribe();
  }, [sessionCode]);

  // Send a new chat message
  const sendMessage = async (text: string) => {
    if (!sessionCode || !participantId || !username || !text.trim()) return;

    try {
      const messagesRef = collection(db, 'sessions', sessionCode, 'messages');
      await addDoc(messagesRef, {
        senderId: participantId,
        senderName: username,
        text: text.trim(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (presenceCheckIntervalRef.current) {
        clearInterval(presenceCheckIntervalRef.current);
      }
      if (sessionCleanupIntervalRef.current) {
        clearInterval(sessionCleanupIntervalRef.current);
      }
    };
  }, []);

  const value = {
    username,
    setUsername,
    avatar,
    setAvatar,
    sessionCode,
    currentSession,
    isInSession,
    createSession,
    joinSession,
    leaveSession,
    participants,
    currentTask,
    setCurrentTask,
    timerState,
    startTimer,
    pauseTimer,
    skipPhase,
    isHost,
    messages,
    sendMessage,
    participantId,
    kickParticipant,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}; 