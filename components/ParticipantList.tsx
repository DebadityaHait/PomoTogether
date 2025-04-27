import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface Participant {
  id: string;
  username: string;
  currentTask: string;
  joinedAt: Date;
  avatar?: string;
}

interface ParticipantListProps {
  participants: Participant[];
  currentUserId?: string;
  isHost?: boolean;
  onKickParticipant?: (participantId: string) => Promise<void>;
}

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

const ParticipantList: React.FC<ParticipantListProps> = ({ 
  participants, 
  currentUserId,
  isHost = false,
  onKickParticipant
}) => {
  const { currentTheme } = useTheme();
  
  const handleKickParticipant = (participant: Participant) => {
    if (!isHost || !onKickParticipant) return;
    
    // Don't allow kicking yourself
    if (participant.id === currentUserId) return;
    
    Alert.alert(
      'Kick Participant',
      `Are you sure you want to remove ${participant.username} from the session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Kick', 
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await onKickParticipant(participant.id);
          } 
        }
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: currentTheme.onBackground }]}>
        Session Participants ({participants.length})
      </Text>
      <FlatList
        data={participants}
        keyExtractor={(item) => item.id}
        windowSize={2}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        renderItem={({ item }) => (
          <View style={[
            styles.participantContainer, 
            { borderBottomColor: currentTheme.divider }
          ]}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: currentTheme.primary + '33' }]}>
                {item.avatar ? (
                  <Image 
                    source={getAvatarSource(item.avatar)} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={16} color={currentTheme.primary} />
                )}
              </View>
              {item.id === currentUserId && (
                <View style={[styles.youIndicator, { backgroundColor: currentTheme.primary }]}>
                  <Text style={styles.youText}>YOU</Text>
                </View>
              )}
            </View>
            <View style={styles.participantInfo}>
              <Text style={[styles.username, { color: currentTheme.onBackground }]}>
                {item.username || 'Unknown User'}
              </Text>
              {item.currentTask ? (
                <Text style={[styles.task, { color: currentTheme.onBackgroundSecondary }]} numberOfLines={1}>
                  {item.currentTask}
                </Text>
              ) : (
                <Text style={[styles.noTask, { color: currentTheme.onBackgroundSecondary + '80' }]}>
                  No task set
                </Text>
              )}
            </View>
            
            {/* Kick button (only visible to host and not for self) */}
            {isHost && item.id !== currentUserId && (
              <TouchableOpacity 
                style={styles.kickButton}
                onPress={() => handleKickParticipant(item)}
              >
                <Ionicons name="close-circle" size={24} color={currentTheme.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.onBackgroundSecondary }]}>
              No one has joined this session yet.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginHorizontal: 16,
    paddingTop: 16,
  },
  participantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  youIndicator: {
    position: 'absolute',
    bottom: -3,
    right: -6,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  youText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  task: {
    fontSize: 14,
    marginTop: 2,
  },
  noTask: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 2,
  },
  kickButton: {
    padding: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ParticipantList; 