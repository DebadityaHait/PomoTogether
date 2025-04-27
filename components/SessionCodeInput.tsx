import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface SessionCodeInputProps {
  onJoin: (code: string) => void;
  isLoading?: boolean;
  error?: string;
}

const SessionCodeInput: React.FC<SessionCodeInputProps> = ({ onJoin, isLoading, error }) => {
  const [code, setCode] = useState('');

  const handleChangeCode = (text: string) => {
    // Ensure code is max 3 characters and uppercase
    const formattedCode = text.toUpperCase().substring(0, 3);
    setCode(formattedCode);
  };

  const handleJoin = () => {
    if (code.length === 3) {
      // Ensure code is uppercase when joining
      onJoin(code.toUpperCase());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter Session Code</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={handleChangeCode}
          placeholder="ABC"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          maxLength={3}
          autoCorrect={false}
        />
        <Pressable
          style={[
            styles.joinButton,
            code.length !== 3 && styles.disabledButton,
            isLoading && styles.loadingButton,
          ]}
          onPress={handleJoin}
          disabled={code.length !== 3 || isLoading}
        >
          {isLoading ? (
            <Text style={styles.buttonText}>...</Text>
          ) : (
            <>
              <FontAwesome name="sign-in" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Join</Text>
            </>
          )}
        </Pressable>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.hint}>
        Session codes are 3 characters long (e.g., ABC)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: 'white',
    letterSpacing: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  joinButton: {
    marginLeft: 12,
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: '#6E44FF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loadingButton: {
    backgroundColor: '#6E44FF',
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  errorText: {
    color: '#FF5D73',
    marginTop: 8,
    fontWeight: '500',
  },
  hint: {
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
});

export default SessionCodeInput; 