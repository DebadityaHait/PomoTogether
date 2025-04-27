import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { formatDistanceToNow } from '../utils/helpers';

interface Message {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

interface GroupedMessage {
  senderId: string;
  senderName: string;
  messages: Message[];
  timestamp: Date;
  isCurrentUser: boolean;
}

const SessionChat: React.FC = () => {
  const { messages, sendMessage, participantId } = useSession();
  const { currentTheme } = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Subscribe to keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        scrollToBottom();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim().length === 0) return;
    
    sendMessage(newMessage);
    setNewMessage('');
  };

  // Group messages by sender
  const groupedMessages: GroupedMessage[] = messages.reduce((groups: GroupedMessage[], message) => {
    const isCurrentUser = message.senderId === participantId;
    const lastGroup = groups.length > 0 ? groups[groups.length - 1] : null;
    
    // If last message was from the same sender and within 5 minutes, add to that group
    if (lastGroup && 
        lastGroup.senderId === message.senderId &&
        message.timestamp.getTime() - lastGroup.timestamp.getTime() < 5 * 60 * 1000) {
      lastGroup.messages.push(message);
      lastGroup.timestamp = message.timestamp; // Update timestamp to latest
      return groups;
    } 
    
    // Otherwise create a new group
    groups.push({
      senderId: message.senderId,
      senderName: message.senderName,
      messages: [message],
      timestamp: message.timestamp,
      isCurrentUser
    });
    
    return groups;
  }, []);

  const renderMessageGroup = ({ item }: { item: GroupedMessage }) => {
    return (
      <View style={[
        styles.messageContainer,
        item.isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        {!item.isCurrentUser && (
          <Text style={[styles.senderName, { color: currentTheme.onBackgroundSecondary }]}>
            {item.senderName}
          </Text>
        )}
        
        <View style={styles.bubbleContainer}>
          {item.messages.map((message, index) => (
            <View 
              key={message.id || `${message.timestamp.getTime()}-${message.senderId}-${index}`}
              style={[
                styles.messageBubble,
                item.isCurrentUser ? 
                  [styles.currentUserBubble, { backgroundColor: currentTheme.primary }] : 
                  [styles.otherUserBubble, { backgroundColor: currentTheme.surfaceLight }],
                index === 0 && (item.isCurrentUser ? styles.firstCurrentUserBubble : styles.firstOtherUserBubble),
                index === item.messages.length - 1 && (item.isCurrentUser ? styles.lastCurrentUserBubble : styles.lastOtherUserBubble),
                index !== 0 && (item.isCurrentUser ? styles.subsequentCurrentUserBubble : styles.subsequentOtherUserBubble)
              ]}
            >
              <Text 
                style={[
                  styles.messageText, 
                  { color: item.isCurrentUser ? currentTheme.buttonText : currentTheme.onBackground }
                ]}
              >
                {message.text}
              </Text>
            </View>
          ))}
        </View>
        
        <Text style={[styles.timestamp, { color: currentTheme.onBackgroundSecondary + '99' }]}>
          {formatDistanceToNow(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        keyExtractor={item => `${item.senderId}-${item.timestamp.getTime()}`}
        renderItem={renderMessageGroup}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={scrollToBottom}
        windowSize={2}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.onBackgroundSecondary }]}>
              No messages yet. Say hello!
            </Text>
          </View>
        }
      />
      
      <View style={[
        styles.inputContainer, 
        { 
          borderTopColor: currentTheme.divider,
          backgroundColor: currentTheme.surface 
        }
      ]}>
        <TextInput
          style={[
            styles.input, 
            { 
              backgroundColor: currentTheme.inputBackground,
              color: currentTheme.onBackground 
            }
          ]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={currentTheme.onBackgroundSecondary + '80'}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: newMessage.trim() ? currentTheme.primary : 'rgba(255, 255, 255, 0.1)' }
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <Ionicons 
            name="send" 
            size={18} 
            color={!newMessage.trim() ? currentTheme.onBackgroundSecondary : "#FFFFFF"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  bubbleContainer: {
    flexDirection: 'column',
  },
  messageBubble: {
    padding: 12,
    maxWidth: '100%',
    marginBottom: 2,
  },
  firstCurrentUserBubble: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
  },
  lastCurrentUserBubble: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  firstOtherUserBubble: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  lastOtherUserBubble: {
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  subsequentCurrentUserBubble: {
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  subsequentOtherUserBubble: {
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  currentUserBubble: {
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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

export default SessionChat; 