import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  DocumentData,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
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

interface TimerState {
  isRunning: boolean;
  currentPhase: 'work' | 'break' | 'longBreak';
  timeRemaining: number;
  round: number;
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
  timerState: TimerState;
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
  createdAt: Date | Timestamp | null;
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
    startedAt: Date | Timestamp | null;
  };
}

interface Participant {
  id: string;
  username: string;
  currentTask: string;
  joinedAt: Date | Timestamp | null;
  lastSeen: Date | Timestamp | null;
  avatar?: string;
}

const DEFAULT_TIMER_STATE: TimerState = {
  isRunning: false,
  currentPhase: 'work',
  timeRemaining: 25 * 60,
  round: 1,
};

const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const PRESENCE_CHECK_INTERVAL_MS = 60 * 1000;
const PARTICIPANT_INACTIVE_MS = 2 * 60 * 1000;
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAX_SESSION_CODE_ATTEMPTS = 10;

export const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

const newParticipantId = () => Math.random().toString(36).substring(2, 11);

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

const normalizeSession = (data: DocumentData): Session => ({
  id: String(data.id || ''),
  createdAt: data.createdAt || null,
  hostId: String(data.hostId || ''),
  workMinutes: Number(data.workMinutes || 25),
  breakMinutes: Number(data.breakMinutes || 5),
  rounds: Number(data.rounds || 4),
  longBreakMinutes: Number(data.longBreakMinutes || 15),
  state: {
    isRunning: Boolean(data.state?.isRunning),
    currentPhase: (data.state?.currentPhase || 'work') as TimerState['currentPhase'],
    timeRemaining: Number(data.state?.timeRemaining || 25 * 60),
    round: Number(data.state?.round || 1),
    startedAt: data.state?.startedAt || null,
  },
});

const normalizeParticipant = (id: string, data: DocumentData): Participant => ({
  id,
  username: String(data.username || 'Unknown User'),
  avatar: data.avatar,
  currentTask: String(data.currentTask || ''),
  joinedAt: data.joinedAt || null,
  lastSeen: data.lastSeen || null,
});

const getCurrentTimerState = (session: Session): TimerState => {
  let timeRemaining = session.state.timeRemaining;

  if (session.state.isRunning && session.state.startedAt) {
    const startedAt = toDate(session.state.startedAt);
    if (startedAt) {
      const elapsedSeconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      timeRemaining = Math.max(0, timeRemaining - elapsedSeconds);
    }
  }

  return {
    isRunning: session.state.isRunning,
    currentPhase: session.state.currentPhase,
    timeRemaining,
    round: session.state.round,
  };
};

const getPhaseDuration = (session: Session, phase: TimerState['currentPhase']) => {
  if (phase === 'break') return session.breakMinutes * 60;
  if (phase === 'longBreak') return session.longBreakMinutes * 60;
  return session.workMinutes * 60;
};

const getNextTimerState = (session: Session, timerState: TimerState): TimerState => {
  if (timerState.currentPhase === 'work') {
    const currentPhase = timerState.round >= session.rounds ? 'longBreak' : 'break';
    return {
      isRunning: false,
      currentPhase,
      timeRemaining: getPhaseDuration(session, currentPhase),
      round: timerState.round,
    };
  }

  if (timerState.currentPhase === 'break') {
    return {
      isRunning: false,
      currentPhase: 'work',
      timeRemaining: getPhaseDuration(session, 'work'),
      round: Math.min(timerState.round + 1, session.rounds),
    };
  }

  return {
    isRunning: false,
    currentPhase: 'work',
    timeRemaining: getPhaseDuration(session, 'work'),
    round: 1,
  };
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('cat.png');
  const [sessionCode, setSessionCode] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentTask, setCurrentTask] = useState('');
  const [timerState, setTimerState] = useState<TimerState>(DEFAULT_TIMER_STATE);
  const [participantId, setParticipantId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionCleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseCompletionRef = useRef<string | null>(null);
  const participantIdRef = useRef('');
  const sessionCodeRef = useRef('');
  const isHostRef = useRef(false);

  const isInSession = !!currentSession && !!sessionCode;
  const isHost = !!currentSession && currentSession.hostId === participantId;

  useEffect(() => {
    participantIdRef.current = participantId;
  }, [participantId]);

  useEffect(() => {
    sessionCodeRef.current = sessionCode;
  }, [sessionCode]);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const resetLocalSession = () => {
    setSessionCode('');
    setCurrentSession(null);
    setParticipants([]);
    setCurrentTask('');
    setTimerState(DEFAULT_TIMER_STATE);
    setParticipantId('');
    setMessages([]);
    phaseCompletionRef.current = null;
  };

  const writeActivity = async (code: string, activity: Record<string, unknown>) => {
    try {
      await addDoc(collection(db, 'sessions', code, 'activityLog'), {
        ...activity,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error writing activity log:', error);
    }
  };

  const updateHeartbeat = async () => {
    const code = sessionCodeRef.current;
    const id = participantIdRef.current;
    if (!code || !id) return;

    try {
      const participantRef = doc(db, 'sessions', code, 'participants', id);
      const participantSnapshot = await getDoc(participantRef);
      if (!participantSnapshot.exists()) {
        resetLocalSession();
        return;
      }

      await setDoc(participantRef, { lastSeen: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error('Error updating heartbeat:', error);
    }
  };

  const removeParticipant = async (code: string, id: string, reason: 'inactivity' | 'kicked' | 'left') => {
    const participantRef = doc(db, 'sessions', code, 'participants', id);
    const participantSnapshot = await getDoc(participantRef);
    if (!participantSnapshot.exists()) return;

    const participant = normalizeParticipant(participantSnapshot.id, participantSnapshot.data());
    await deleteDoc(participantRef);
    await writeActivity(code, {
      type: reason === 'kicked' ? 'participant_kicked' : reason === 'left' ? 'participant_left' : 'participant_removed',
      participantId: id,
      username: participant.username,
      reason,
    });
  };

  const deleteSessionTree = async (code: string) => {
    const subcollections = ['participants', 'activityLog', 'messages'];
    for (const subcollection of subcollections) {
      const snapshot = await getDocs(collection(db, 'sessions', code, subcollection));
      await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
    }
    await deleteDoc(doc(db, 'sessions', code));
  };

  const createSession = async (
    workMinutes = 25,
    breakMinutes = 5,
    rounds = 4,
    longBreakMinutes = 15
  ) => {
    const id = newParticipantId();

    for (let attempt = 0; attempt < MAX_SESSION_CODE_ATTEMPTS; attempt += 1) {
      const code = generateSessionCode();
      const sessionRef = doc(db, 'sessions', code);
      const participantRef = doc(db, 'sessions', code, 'participants', id);
      const sessionData = {
        id: code,
        createdAt: serverTimestamp(),
        hostId: id,
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
        await runTransaction(db, async (transaction) => {
          const existingSession = await transaction.get(sessionRef);
          if (existingSession.exists()) {
            throw new Error('SESSION_CODE_COLLISION');
          }

          transaction.set(sessionRef, sessionData);
          transaction.set(participantRef, {
            id,
            username,
            avatar,
            currentTask: '',
            joinedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
          });
        });

        setParticipantId(id);
        setSessionCode(code);
        setCurrentSession(normalizeSession({ ...sessionData, createdAt: new Date() }));
        setTimerState({
          isRunning: false,
          currentPhase: 'work',
          timeRemaining: workMinutes * 60,
          round: 1,
        });
        return code;
      } catch (error: any) {
        if (error?.message === 'SESSION_CODE_COLLISION' && attempt < MAX_SESSION_CODE_ATTEMPTS - 1) {
          continue;
        }
        console.error('Error creating session:', error);
        throw error;
      }
    }

    throw new Error('Unable to generate a unique session code.');
  };

  const joinSession = async (code: string): Promise<boolean> => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode || !username.trim()) return false;

    try {
      const sessionRef = doc(db, 'sessions', normalizedCode);
      const sessionSnapshot = await getDoc(sessionRef);
      if (!sessionSnapshot.exists()) return false;

      const session = normalizeSession(sessionSnapshot.data());
      const participantsSnapshot = await getDocs(collection(db, 'sessions', normalizedCode, 'participants'));
      const existingParticipant = participantsSnapshot.docs
        .map((item) => normalizeParticipant(item.id, item.data()))
        .find((participant) => participant.username === username && participant.avatar === avatar);

      const id = existingParticipant?.id || newParticipantId();
      await setDoc(
        doc(db, 'sessions', normalizedCode, 'participants', id),
        {
          id,
          username,
          avatar,
          currentTask: existingParticipant?.currentTask || '',
          joinedAt: existingParticipant?.joinedAt || serverTimestamp(),
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );

      setParticipantId(id);
      setSessionCode(normalizedCode);
      setCurrentSession(session);
      setCurrentTask(existingParticipant?.currentTask || '');
      setTimerState(getCurrentTimerState(session));
      return true;
    } catch (error) {
      console.error('Error joining session:', error);
      resetLocalSession();
      return false;
    }
  };

  const leaveSession = async () => {
    const code = sessionCodeRef.current;
    const id = participantIdRef.current;
    if (!code || !id) {
      resetLocalSession();
      return;
    }

    try {
      const sessionRef = doc(db, 'sessions', code);
      const participantsSnapshot = await getDocs(collection(db, 'sessions', code, 'participants'));
      const otherParticipants = participantsSnapshot.docs
        .map((item) => normalizeParticipant(item.id, item.data()))
        .filter((participant) => participant.id !== id);

      await removeParticipant(code, id, 'left');

      if (currentSession?.hostId === id) {
        if (otherParticipants.length > 0) {
          await setDoc(sessionRef, { hostId: otherParticipants[0].id }, { merge: true });
        } else {
          await deleteSessionTree(code);
        }
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      throw error;
    } finally {
      resetLocalSession();
    }
  };

  const startTimer = async () => {
    if (!currentSession || !isHost || !sessionCode) return;

    const duration = getPhaseDuration(currentSession, timerState.currentPhase);
    const timeRemaining = timerState.timeRemaining > 0 ? timerState.timeRemaining : duration;

    await setDoc(
      doc(db, 'sessions', sessionCode),
      {
        state: {
          isRunning: true,
          currentPhase: timerState.currentPhase,
          timeRemaining,
          round: timerState.round,
          startedAt: serverTimestamp(),
        },
      },
      { merge: true }
    );
  };

  const pauseTimer = async () => {
    if (!currentSession || !isHost || !sessionCode) return;

    await setDoc(
      doc(db, 'sessions', sessionCode),
      {
        state: {
          isRunning: false,
          currentPhase: timerState.currentPhase,
          timeRemaining: Math.max(0, timerState.timeRemaining),
          round: timerState.round,
          startedAt: null,
        },
      },
      { merge: true }
    );
  };

  const applyNextPhase = async (source: 'complete' | 'skip') => {
    if (!currentSession || !isHost || !sessionCode) return;

    const nextTimerState = getNextTimerState(currentSession, timerState);
    await setDoc(
      doc(db, 'sessions', sessionCode),
      {
        state: {
          ...nextTimerState,
          startedAt: null,
        },
      },
      { merge: true }
    );

    await writeActivity(sessionCode, {
      type: source === 'complete' ? 'phase_completed' : 'phase_skipped',
      phase: timerState.currentPhase,
      nextPhase: nextTimerState.currentPhase,
      round: timerState.round,
    });
  };

  const skipPhase = async () => applyNextPhase('skip');

  const kickParticipant = async (id: string) => {
    if (!isHost || !sessionCode || id === participantId) return;
    await removeParticipant(sessionCode, id, 'kicked');
  };

  const sendMessage = async (text: string) => {
    if (!sessionCode || !participantId || !username || !text.trim()) return;

    await addDoc(collection(db, 'sessions', sessionCode, 'messages'), {
      senderId: participantId,
      senderName: username,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
  };

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (isInSession && timerState.isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerState((previous) => ({
          ...previous,
          timeRemaining: Math.max(0, previous.timeRemaining - 1),
        }));
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isInSession, timerState.isRunning]);

  useEffect(() => {
    if (!currentSession || !isHost || !timerState.isRunning || timerState.timeRemaining > 0) return;

    const completionKey = `${sessionCode}:${timerState.currentPhase}:${timerState.round}`;
    if (phaseCompletionRef.current === completionKey) return;

    phaseCompletionRef.current = completionKey;
    applyNextPhase('complete').catch((error) => {
      phaseCompletionRef.current = null;
      console.error('Error completing timer phase:', error);
    });
    // applyNextPhase intentionally reads the current render's session/timer state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, isHost, sessionCode, timerState.currentPhase, timerState.isRunning, timerState.round, timerState.timeRemaining]);

  useEffect(() => {
    if (!participantId || !sessionCode) return;

    setDoc(
      doc(db, 'sessions', sessionCode, 'participants', participantId),
      { currentTask: currentTask.trim() },
      { merge: true }
    ).catch((error) => {
      console.error('Error updating task:', error);
    });
  }, [currentTask, participantId, sessionCode]);

  useEffect(() => {
    if (!sessionCode) return;

    const unsubscribe = onSnapshot(
      doc(db, 'sessions', sessionCode),
      (snapshot) => {
        if (!snapshot.exists()) {
          resetLocalSession();
          return;
        }

        const session = normalizeSession(snapshot.data());
        setCurrentSession(session);
        setTimerState(getCurrentTimerState(session));

        if (!session.state.isRunning) {
          phaseCompletionRef.current = null;
        }
      },
      (error) => {
        console.error('Error listening for session changes:', error);
      }
    );

    return () => unsubscribe();
  }, [sessionCode]);

  useEffect(() => {
    if (!sessionCode) return;

    const unsubscribe = onSnapshot(
      collection(db, 'sessions', sessionCode, 'participants'),
      (snapshot) => {
        const activeParticipants = snapshot.docs.map((item) => normalizeParticipant(item.id, item.data()));
        setParticipants(activeParticipants);

        const currentId = participantIdRef.current;
        if (currentId && !activeParticipants.some((participant) => participant.id === currentId)) {
          resetLocalSession();
        }
      },
      (error) => {
        console.error('Error listening for participants:', error);
      }
    );

    return () => unsubscribe();
  }, [sessionCode]);

  useEffect(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (isInSession && participantId && sessionCode) {
      updateHeartbeat();
      heartbeatIntervalRef.current = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
    // updateHeartbeat reads latest ids from refs, so it should not restart the interval on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInSession, participantId, sessionCode]);

  useEffect(() => {
    if (presenceCheckIntervalRef.current) {
      clearInterval(presenceCheckIntervalRef.current);
      presenceCheckIntervalRef.current = null;
    }

    if (isInSession && isHost && sessionCode) {
      presenceCheckIntervalRef.current = setInterval(async () => {
        try {
          const snapshot = await getDocs(collection(db, 'sessions', sessionCode, 'participants'));
          const now = Date.now();
          const inactiveParticipants = snapshot.docs
            .map((item) => normalizeParticipant(item.id, item.data()))
            .filter((participant) => {
              if (participant.id === currentSession?.hostId) return false;
              const lastSeen = toDate(participant.lastSeen);
              return !lastSeen || now - lastSeen.getTime() > PARTICIPANT_INACTIVE_MS;
            });

          await Promise.all(inactiveParticipants.map((participant) => removeParticipant(sessionCode, participant.id, 'inactivity')));
        } catch (error) {
          console.error('Error checking inactive participants:', error);
        }
      }, PRESENCE_CHECK_INTERVAL_MS);
    }

    return () => {
      if (presenceCheckIntervalRef.current) {
        clearInterval(presenceCheckIntervalRef.current);
      }
    };
    // removeParticipant is intentionally omitted to keep the presence interval stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.hostId, isHost, isInSession, sessionCode]);

  useEffect(() => {
    if (sessionCleanupIntervalRef.current) {
      clearInterval(sessionCleanupIntervalRef.current);
      sessionCleanupIntervalRef.current = null;
    }

    if (isInSession) {
      sessionCleanupIntervalRef.current = setInterval(() => {
        cleanupInactiveSessions().catch((error) => {
          console.error('Error during session cleanup:', error);
        });
      }, SESSION_CLEANUP_INTERVAL_MS);
    }

    return () => {
      if (sessionCleanupIntervalRef.current) {
        clearInterval(sessionCleanupIntervalRef.current);
      }
    };
  }, [isInSession]);

  useEffect(() => {
    if (!sessionCode) return;

    const messagesQuery = query(
      collection(db, 'sessions', sessionCode, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newMessages = snapshot.docs
          .map((item) => {
            const data = item.data();
            return {
              id: item.id,
              senderId: String(data.senderId || ''),
              senderName: String(data.senderName || 'Unknown User'),
              text: String(data.text || ''),
              timestamp: toDate(data.timestamp) || new Date(),
            };
          })
          .reverse();

        setMessages(newMessages);
      },
      (error) => {
        console.error('Error listening for chat messages:', error);
      }
    );

    return () => unsubscribe();
  }, [sessionCode]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (presenceCheckIntervalRef.current) clearInterval(presenceCheckIntervalRef.current);
      if (sessionCleanupIntervalRef.current) clearInterval(sessionCleanupIntervalRef.current);
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
