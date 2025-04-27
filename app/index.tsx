import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
  Image,
  FlatList,
  SafeAreaView,
  StatusBar as RNStatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import SessionSetup from '../components/SessionSetup';

const { width, height } = Dimensions.get('window');

// Rainbow gradient text component
interface GradientTextProps {
  text: string;
  style?: any;
}

const GradientText: React.FC<GradientTextProps> = ({ text, style }) => {
  return (
    <View style={{ position: 'relative' }}>
      <LinearGradient
        colors={['#6A3DE8', '#E47AE8', '#FF9D80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ padding: 5, borderRadius: 5 }}
      >
        <Text style={[{ fontWeight: 'bold', color: '#fff' }, style]}>
          {text}
        </Text>
      </LinearGradient>
    </View>
  );
};

interface AvatarItem {
  id: string;
  source: any;
}

// All avatar options with proper requires
const AVATARS: AvatarItem[] = [
  { id: 'cat.png', source: require('../usericons/cat.png') },
  { id: 'chicken.png', source: require('../usericons/chicken.png') },
  { id: 'hippo.png', source: require('../usericons/hippo.png') },
  { id: 'lion.png', source: require('../usericons/lion.png') },
  { id: 'panda.png', source: require('../usericons/panda.png') },
  { id: 'penguin.png', source: require('../usericons/penguin.png') },
  { id: 'polar-bear.png', source: require('../usericons/polar-bear.png') },
  { id: 'poo.png', source: require('../usericons/poo.png') },
  { id: 'sea-lion.png', source: require('../usericons/sea-lion.png') },
  { id: 'snake.png', source: require('../usericons/snake.png') },
  { id: 'tiger.png', source: require('../usericons/tiger.png') },
  { id: 'turtle.png', source: require('../usericons/turtle.png') }
];

// Helper function to get avatar source from ID
const getAvatarSource = (avatarId: string) => {
  const avatar = AVATARS.find(a => a.id === avatarId);
  return avatar ? avatar.source : AVATARS[0].source;
};

export default function Home() {
  const router = useRouter();
  const { setUsername, avatar, setAvatar, joinSession, createSession } = useSession();
  const { currentTheme, isDark } = useTheme();
  const [storedUsername, setStoredUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsernameInput] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [showCreateUI, setShowCreateUI] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatar || 'cat.png');
  
  // Animated values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Check for stored username and avatar on component mount
  useEffect(() => {
    const checkUserData = async () => {
      try {
        const [username, avatarValue] = await Promise.all([
          AsyncStorage.getItem('username'),
          AsyncStorage.getItem('avatar')
        ]);

        if (username) {
          setStoredUsername(username);
          setUsername(username);
          setEditUsername(username);
        }

        if (avatarValue) {
          // Make sure to set the avatar in state AND in context
          setSelectedAvatar(avatarValue);
          setAvatar(avatarValue);
        } else if (selectedAvatar) {
          // If no avatar in storage but we have a selected one, set it in context
          setAvatar(selectedAvatar);
        }
      } catch (error) {
        console.error('Error retrieving user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserData();
  }, []);

  const saveUsername = async () => {
    if (!username.trim()) return;
    
    try {
      await Promise.all([
        AsyncStorage.setItem('username', username),
        AsyncStorage.setItem('avatar', selectedAvatar)
      ]);
      
      setStoredUsername(username);
      setUsername(username);
      setAvatar(selectedAvatar);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const saveProfile = async () => {
    if (!editUsername.trim()) return;
    
    try {
      await Promise.all([
        AsyncStorage.setItem('username', editUsername),
        AsyncStorage.setItem('avatar', selectedAvatar)
      ]);
      
      setStoredUsername(editUsername);
      setUsername(editUsername);
      setAvatar(selectedAvatar);
      setShowProfileModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!storedUsername || !sessionCode.trim()) return;
    
    setIsJoining(true);
    setJoinError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Ensure avatar is set in the context before joining
      setAvatar(selectedAvatar);
      
      // Convert session code to uppercase before joining
      const uppercaseCode = sessionCode.trim().toUpperCase();
      const success = await joinSession(uppercaseCode);
      if (success) {
        router.push('/session');
      } else {
        setJoinError('Session not found. Please check the code.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setJoinError('Failed to join session. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateSession = async (
    workMinutes: number,
    breakMinutes: number,
    rounds: number,
    longBreakMinutes: number
  ) => {
    if (!storedUsername) return;
    
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Ensure avatar is set in the context before creating
      setAvatar(selectedAvatar);
      
      await createSession(workMinutes, breakMinutes, rounds, longBreakMinutes);
      router.push('/session');
    } catch (error) {
      console.error('Error creating session:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCreateUI = () => {
    setShowCreateUI(!showCreateUI);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderAvatarItem = ({ item }: { item: AvatarItem }) => (
    <TouchableOpacity
      style={[
        styles.avatarOption,
        selectedAvatar === item.id && styles.selectedAvatarOption
      ]}
      onPress={() => {
        setSelectedAvatar(item.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <Image 
        source={item.source} 
        style={styles.avatarImage} 
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
      </View>
    );
  }

  // Username input view
  if (!storedUsername) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090B10' : '#F7F9FC' }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        
        <LinearGradient
          colors={['#12111A', '#1E1B30']}
          style={styles.background}
        />
        
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../appicon.png')} 
              style={styles.logoImage}
            />
            <Text style={[styles.appTitle, { color: currentTheme.primary }]}>
              PomoTogether
            </Text>
          </View>
        </View>
        
        <Animated.View 
          style={[
            styles.contentContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={[
            styles.card, 
            { 
              backgroundColor: isDark ? '#161A30' : '#FFFFFF',
              shadowColor: isDark ? '#000000' : '#888888',
            }
          ]}>
            <Text style={[styles.cardTitle, { color: currentTheme.primary }]}>
              Welcome!
            </Text>
            
            <Text style={[styles.subtitle, { color: currentTheme.onBackgroundSecondary }]}>
              Enter your name to get started
            </Text>
            
            <View style={styles.inputWrapper}>
              <View style={[
                styles.inputContainer, 
                { 
                  backgroundColor: isDark ? '#0D0F18' : '#F0F2F5',
                  borderColor: currentTheme.divider
                }
              ]}>
                <Ionicons name="person-outline" size={20} color={currentTheme.onBackgroundSecondary} />
                <TextInput
                  style={[styles.input, { color: currentTheme.onBackground }]}
                  placeholder="Your Name"
                  placeholderTextColor={currentTheme.onBackgroundSecondary + '80'}
                  value={username}
                  onChangeText={setUsernameInput}
                  maxLength={20}
                  autoCapitalize="words"
                  autoCorrect={false}
                  selectionColor={currentTheme.primary}
                />
              </View>
            </View>
            
            <Text style={[styles.subtitle, { color: currentTheme.onBackgroundSecondary, marginTop: 24 }]}>
              Choose your avatar
            </Text>
            
            <View style={styles.avatarContainer}>
              <FlatList
                data={AVATARS}
                renderItem={renderAvatarItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.avatarList}
              />
            </View>
            
            <TouchableOpacity
              style={[
                styles.button, 
                { backgroundColor: currentTheme.primary },
                !username.trim() && styles.buttonDisabled
              ]}
              onPress={saveUsername}
              disabled={!username.trim()}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Main view - Join or Create session
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090B10' : '#F7F9FC' }]}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#12111A', '#1E1B30']}
        style={styles.background}
      />
      
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../appicon.png')} 
            style={styles.logoImage}
          />
          <Text style={[styles.appTitle, { color: currentTheme.primary }]}>
            PomoTogether
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => {
            setShowProfileModal(true);
            setEditUsername(storedUsername);
          }}
        >
          <Image 
            source={getAvatarSource(avatar)} 
            style={styles.headerAvatar} 
          />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.contentContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {!showCreateUI ? (
          <View style={[
            styles.card, 
            { 
              backgroundColor: isDark ? '#161A30' : '#FFFFFF',
              shadowColor: isDark ? '#000000' : '#888888',
            }
          ]}>
            <Text style={[styles.cardTitle, { color: currentTheme.primary }]}>
              Welcome, {storedUsername}!
            </Text>
            
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: currentTheme.onBackgroundSecondary }]}>
                Enter a session code to join
              </Text>
              <View style={[
                styles.inputContainer, 
                { 
                  backgroundColor: isDark ? '#0D0F18' : '#F0F2F5',
                  borderColor: currentTheme.divider
                }
              ]}>
                <Ionicons name="enter-outline" size={20} color={currentTheme.onBackgroundSecondary} />
                <TextInput
                  style={[styles.input, { color: currentTheme.onBackground }]}
                  placeholder="Session Code"
                  placeholderTextColor={currentTheme.onBackgroundSecondary + '80'}
                  value={sessionCode}
                  onChangeText={(text) => setSessionCode(text.toUpperCase())}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  selectionColor={currentTheme.primary}
                />
              </View>
            </View>
            
            {joinError ? (
              <Text style={styles.errorText}>{joinError}</Text>
            ) : null}
            
            <TouchableOpacity
              style={[
                styles.button, 
                { backgroundColor: currentTheme.primary },
                (!sessionCode.trim() || isJoining) && styles.buttonDisabled
              ]}
              onPress={handleJoinSession}
              disabled={!sessionCode.trim() || isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Join Session</Text>
                  <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: currentTheme.divider }]} />
              <Text style={[styles.dividerText, { color: currentTheme.onBackgroundSecondary }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: currentTheme.divider }]} />
            </View>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={toggleCreateUI}
            >
              <Text style={[styles.secondaryButtonText, { color: currentTheme.primary }]}>
                Create New Session
              </Text>
              <Ionicons name="add-circle-outline" size={20} color={currentTheme.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[
            styles.card, 
            { 
              backgroundColor: isDark ? '#161A30' : '#FFFFFF',
              shadowColor: isDark ? '#000000' : '#888888',
            }
          ]}>
            <View style={styles.cardHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={toggleCreateUI}
              >
                <Ionicons name="arrow-back" size={22} color={currentTheme.onBackgroundSecondary} />
                <Text style={[styles.backText, { color: currentTheme.onBackgroundSecondary }]}>
                  Back
                </Text>
              </TouchableOpacity>
              
              <Text style={[styles.cardTitle, { color: currentTheme.primary }]}>
                Create Session
              </Text>
            </View>
            
            <SessionSetup
              onCreateSession={handleCreateSession}
              isLoading={isCreating}
            />
          </View>
        )}
      </Animated.View>
      
      {/* Profile Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showProfileModal}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: isDark ? '#161A30' : '#FFFFFF',
            }
          ]}>
            <View style={[styles.modalHeader, { borderBottomColor: currentTheme.divider }]}>
              <Text style={[styles.modalTitle, { color: currentTheme.onBackground }]}>
                Edit Profile
              </Text>
              <TouchableOpacity 
                onPress={() => setShowProfileModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={currentTheme.onBackgroundSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileEditContainer}>
              <Text style={[styles.fieldLabel, { color: currentTheme.onBackgroundSecondary }]}>
                Username
              </Text>
              <View style={[
                styles.profileInputContainer, 
                { 
                  backgroundColor: isDark ? '#0D0F18' : '#F0F2F5',
                  borderColor: currentTheme.divider
                }
              ]}>
                <Ionicons name="person-outline" size={20} color={currentTheme.onBackgroundSecondary} />
                <TextInput
                  style={[styles.profileInput, { color: currentTheme.onBackground }]}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  maxLength={20}
                  autoCapitalize="words"
                />
              </View>
              
              <Text style={[styles.fieldLabel, { color: currentTheme.onBackgroundSecondary, marginTop: 20 }]}>
                Avatar
              </Text>
              
              <View style={styles.avatarEditContainer}>
                <FlatList
                  data={AVATARS}
                  renderItem={renderAvatarItem}
                  keyExtractor={(item) => item.id}
                  numColumns={4}
                  contentContainerStyle={styles.avatarGrid}
                />
              </View>
              
              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { backgroundColor: currentTheme.primary },
                  !editUsername.trim() && styles.buttonDisabled
                ]}
                onPress={saveProfile}
                disabled={!editUsername.trim()}
              >
                <Text style={styles.buttonText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginRight: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileButton: {
    padding: 2,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6A3DE8',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: '#FF5A5A',
    marginVertical: 8,
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontWeight: '500',
    fontSize: 14,
  },
  secondaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
  },
  backText: {
    fontSize: 14,
    marginLeft: 4,
  },
  avatarContainer: {
    width: '100%',
    marginBottom: 24,
  },
  avatarList: {
    paddingVertical: 8,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 6,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedAvatarOption: {
    borderColor: '#6A3DE8',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  profileEditContainer: {
    padding: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  profileInputContainer: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    marginLeft: 8,
  },
  avatarEditContainer: {
    marginVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  avatarGrid: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
}); 