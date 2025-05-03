import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Alert, 
  Dimensions,
  StatusBar as RNStatusBar,
  Platform,
  TextInput,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import TimerCircle from '../components/TimerCircle';
import ParticipantList from '../components/ParticipantList';
import SessionChat from '../components/SessionChat';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Helper function to get avatar source
const getAvatarSource = (avatarId: string | undefined) => {
  if (!avatarId) return null;
  
  // Map the avatar ID to its require statement
  const avatarMap: {[key: string]: any} = {
    'cat.png': require('../usericons/cat.png'),
    'chicken.png': require('../usericons/chicken.png'),
    'lion.png': require('../usericons/lion.png'),
    'panda.png': require('../usericons/panda.png'),
    'penguin.png': require('../usericons/penguin.png'),
    'polar-bear.png': require('../usericons/polar-bear.png'),
    'poo.png': require('../usericons/poo.png'),
    'sea-lion.png': require('../usericons/sea-lion.png'),
    'tiger.png': require('../usericons/tiger.png')
  };
  
  return avatarMap[avatarId] || avatarMap['cat.png'];
};

export default function SessionScreen() {
  const router = useRouter();
  const {
    username,
    sessionCode,
    currentSession,
    isInSession,
    leaveSession,
    participants,
    currentTask,
    setCurrentTask,
    timerState,
    startTimer,
    pauseTimer,
    skipPhase,
    isHost,
    kickParticipant,
  } = useSession();
  const { currentTheme } = useTheme();

  const [isLeaving, setIsLeaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'members' | 'chat'>('timer');
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskInputValue, setTaskInputValue] = useState(currentTask);
  
  // Sync task value when currentTask changes
  useEffect(() => {
    setTaskInputValue(currentTask);
  }, [currentTask]);

  // Redirect to home if not in a session
  useEffect(() => {
    console.log(`[SessionScreen Redirect Check] Running effect. isInSession: ${isInSession}, isLeaving: ${isLeaving}`);
    if (!isInSession && !isLeaving) {
      console.log('[SessionScreen Redirect Check] Conditions met! Redirecting to /...');
      router.replace('/');
    }
  }, [isInSession, isLeaving]);

  const handleLeaveSession = async () => {
    Alert.alert(
      'Leave Session',
      'Are you sure you want to leave this Pomodoro session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setIsLeaving(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await leaveSession();
              router.replace('/');
            } catch (error) {
              console.error('Error leaving session:', error);
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  // Calculate total time for the timer component
  const getTotalTime = () => {
    if (!currentSession) return 25 * 60; // Default 25 minutes

    switch (timerState.currentPhase) {
      case 'work':
        return currentSession.workMinutes * 60;
      case 'break':
        return currentSession.breakMinutes * 60;
      case 'longBreak':
        return currentSession.longBreakMinutes * 60;
      default:
        return 25 * 60;
    }
  };

  // Handle task saving
  const handleSaveTask = () => {
    setCurrentTask(taskInputValue?.trim() || '');
    setIsEditingTask(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (!currentSession) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#12111A', '#1E1B30']}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleLeaveSession}
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.onBackgroundSecondary} />
          </TouchableOpacity>
          
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionCode}>SESSION: {sessionCode}</Text>
            <View style={styles.sessionStatus}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: timerState.isRunning ? currentTheme.success : currentTheme.warning }
              ]} />
              <Text style={[styles.statusText, { color: currentTheme.onBackgroundSecondary }]}>
                {timerState.isRunning ? 'ACTIVE' : 'PAUSED'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.participantsPreview}>
          {participants.slice(0, 3).map((participant, index) => (
            <View 
              key={participant.id} 
              style={[
                styles.participantAvatar, 
                { 
                  backgroundColor: currentTheme.primary + '33',
                  marginLeft: index > 0 ? -10 : 0,
                  zIndex: 3 - index
                }
              ]}
            >
              {participant.avatar ? (
                <Image 
                  source={getAvatarSource(participant.avatar)} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {participant.username && participant.username.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          ))}
          {participants.length > 3 && (
            <View 
              key="additional-participants-count"
              style={[styles.participantAvatar, { 
        backgroundColor: currentTheme.surface,
                marginLeft: -10,
                zIndex: 0
              }]}
            >
              <Text style={styles.avatarText}>+{participants.length - 3}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContentContainer}>
        {/* Timer Tab */}
        {activeTab === 'timer' && (
          <View style={styles.timerTab}>
        <View style={styles.timerContainer}>
          <TimerCircle
            timeRemaining={timerState.timeRemaining}
            totalTime={getTotalTime()}
            isRunning={timerState.isRunning}
            phase={timerState.currentPhase}
            onStart={startTimer}
            onPause={pauseTimer}
            onSkip={skipPhase}
            isHost={isHost}
          />

          <View style={styles.roundInfo}>
                <Text style={[styles.roundText, { color: currentTheme.onBackgroundSecondary }]}>
                  ROUND {timerState.round} OF {currentSession.rounds}
            </Text>
        </View>

              {/* Task Input Direct in Timer View */}
              {isEditingTask ? (
                <View style={[styles.taskInputContainer, { backgroundColor: currentTheme.inputBackground }]}>
                  <TextInput
                    style={[styles.taskInput, { color: currentTheme.onBackground }]}
                    value={taskInputValue}
                    onChangeText={setTaskInputValue}
                    placeholder="What are you working on?"
                    placeholderTextColor={currentTheme.onBackgroundSecondary + '80'}
                    autoFocus
                  />
          <TouchableOpacity
                    style={[styles.saveTaskButton, { backgroundColor: currentTheme.primary }]}
                    onPress={handleSaveTask}
          >
                    <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
                </View>
              ) : (
          <TouchableOpacity
                  style={styles.currentTaskButton}
                  onPress={() => setIsEditingTask(true)}
          >
                  {currentTask ? (
                    <Text style={[styles.currentTaskText, { color: currentTheme.onBackground }]}>
                      {currentTask}
                    </Text>
                  ) : (
                    <Text style={[styles.addTaskText, { color: currentTheme.onBackgroundSecondary }]}>
                      Tap to add your current task
            </Text>
                  )}
          </TouchableOpacity>
              )}
            </View>
        </View>
        )}
        
        {/* Members Tab */}
        {activeTab === 'members' && (
          <View style={styles.membersTab}>
              <ParticipantList
                participants={participants}
                currentUserId={participants.find(p => p.username === username)?.id}
              isHost={isHost}
              onKickParticipant={isHost ? kickParticipant : undefined}
              />
            </View>
        )}
        
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <View style={styles.chatTab}>
            <SessionChat />
          </View>
        )}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={[styles.tabBar, { backgroundColor: currentTheme.surface }]}>
        <TouchableOpacity 
          key="tab-timer"
          style={[
            styles.tabButton, 
            activeTab === 'timer' && [styles.activeTab, { borderTopColor: currentTheme.primary }]
          ]}
          onPress={() => {
            setActiveTab('timer');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons 
            name={activeTab === 'timer' ? "timer" : "timer-outline"} 
            size={24} 
            color={activeTab === 'timer' ? currentTheme.primary : currentTheme.onBackgroundSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === 'timer' ? currentTheme.primary : currentTheme.onBackgroundSecondary }
          ]}>
            Timer
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          key="tab-members"
          style={[
            styles.tabButton, 
            activeTab === 'members' && [styles.activeTab, { borderTopColor: currentTheme.primary }]
          ]}
          onPress={() => {
            setActiveTab('members');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons 
            name={activeTab === 'members' ? "people" : "people-outline"} 
            size={24} 
            color={activeTab === 'members' ? currentTheme.primary : currentTheme.onBackgroundSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === 'members' ? currentTheme.primary : currentTheme.onBackgroundSecondary }
          ]}>
            Members
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          key="tab-chat"
          style={[
            styles.tabButton, 
            activeTab === 'chat' && [styles.activeTab, { borderTopColor: currentTheme.primary }]
          ]}
          onPress={() => {
            setActiveTab('chat');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons 
            name={activeTab === 'chat' ? "chatbubbles" : "chatbubbles-outline"} 
            size={24} 
            color={activeTab === 'chat' ? currentTheme.primary : currentTheme.onBackgroundSecondary} 
          />
          <Text style={[
            styles.tabLabel,
            { color: activeTab === 'chat' ? currentTheme.primary : currentTheme.onBackgroundSecondary }
          ]}>
            Chat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: RNStatusBar.currentHeight,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    marginLeft: 4,
  },
  sessionCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  participantsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E1B30',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  mainContentContainer: {
    flex: 1,
  },
  timerTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  roundInfo: {
    marginTop: 12,
    marginBottom: 20,
  },
  roundText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  },
  currentTaskButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    maxWidth: '80%',
    alignItems: 'center',
    marginVertical: 16,
    minWidth: '80%',
  },
  currentTaskText: {
    fontSize: 14,
    textAlign: 'center',
  },
  addTaskText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    maxWidth: '80%',
    minWidth: '80%',
    marginVertical: 16,
    overflow: 'hidden',
  },
  taskInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },
  saveTaskButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  membersTab: {
    flex: 1,
    padding: 16,
    height: '100%',
  },
  chatTab: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Safe area for iOS
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderTopWidth: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  }
}); 