import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UsernameInputProps {
  onUsernameSet: (username: string) => void;
  initialUsername?: string;
}

const UsernameInput: React.FC<UsernameInputProps> = ({ onUsernameSet, initialUsername = '' }) => {
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState('');

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      // Store username in AsyncStorage
      await AsyncStorage.setItem('username', username.trim());
      onUsernameSet(username.trim());
      setError('');
    } catch (e) {
      console.error('Error saving username:', e);
      setError('Could not save username');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What should we call you?</Text>
      <Text style={styles.subtitle}>
        Choose a display name that others will see during Pomodoro sessions.
      </Text>

      <TextInput
        style={styles.input}
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          if (error) setError('');
        }}
        placeholder="Enter your name"
        placeholderTextColor="#999"
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={20}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        style={[styles.button, !username.trim() && styles.disabledButton]}
        onPress={handleSaveUsername}
        disabled={!username.trim()}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>

      <Text style={styles.privacyText}>
        Your name is only used within sessions and is not permanently stored on our servers.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF5D73',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#6E44FF',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default UsernameInput; 