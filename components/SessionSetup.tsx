import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface SessionSetupProps {
  onCreateSession: (workMinutes: number, breakMinutes: number, rounds: number, longBreakMinutes: number) => void;
  isLoading?: boolean;
}

interface PresetTimerProps {
  label: string;
  description: string;
  values: [number, number, number, number]; // [work, break, rounds, longBreak]
  onPress: () => void;
  isSelected: boolean;
}

const PresetTimer: React.FC<PresetTimerProps> = ({ label, description, values, onPress, isSelected }) => {
  const { currentTheme } = useTheme();
  
  return (
    <TouchableOpacity
      style={[
        styles.presetButton, 
        { backgroundColor: isSelected ? currentTheme.primary + '33' : currentTheme.surface }
      ]}
      onPress={() => {
        onPress();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <Text style={[styles.presetButtonText, { color: isSelected ? currentTheme.primary : currentTheme.onBackground }]}>
        {label}
      </Text>
      <Text style={[styles.presetSubtext, { color: currentTheme.onBackgroundSecondary }]}>
        {description}
      </Text>
    </TouchableOpacity>
  );
};

const SessionSetup: React.FC<SessionSetupProps> = ({ onCreateSession, isLoading }) => {
  const { currentTheme } = useTheme();
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [rounds, setRounds] = useState(4);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('classic');
  
  // Text input state for manual entry
  const [workInput, setWorkInput] = useState(workMinutes.toString());
  const [breakInput, setBreakInput] = useState(breakMinutes.toString());
  const [roundsInput, setRoundsInput] = useState(rounds.toString());
  const [longBreakInput, setLongBreakInput] = useState(longBreakMinutes.toString());

  const handleCreateSession = () => {
    // Parse values from manual input
    let finalWorkMinutes = parseInt(workInput) || 25;
    let finalBreakMinutes = parseInt(breakInput) || 5;
    let finalRounds = parseInt(roundsInput) || 4;
    let finalLongBreakMinutes = parseInt(longBreakInput) || 15;
    
    // Enforce limits
    finalWorkMinutes = Math.min(Math.max(finalWorkMinutes, 10), 60);
    finalBreakMinutes = Math.min(Math.max(finalBreakMinutes, 1), 15);
    finalRounds = Math.min(Math.max(finalRounds, 1), 10);
    finalLongBreakMinutes = Math.min(Math.max(finalLongBreakMinutes, 5), 30);
    
    onCreateSession(finalWorkMinutes, finalBreakMinutes, finalRounds, finalLongBreakMinutes);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const adjustValue = (
    currentValue: number, 
    setter: React.Dispatch<React.SetStateAction<number>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>,
    increment: number,
    min: number,
    max: number
  ) => {
    const newValue = Math.min(Math.max(currentValue + increment, min), max);
    setter(newValue);
    inputSetter(newValue.toString());
    Haptics.selectionAsync();
    setSelectedPreset(null);
  };
  
  const handleInputChange = (
    text: string, 
    setter: React.Dispatch<React.SetStateAction<number>>,
    inputSetter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    inputSetter(text);
    
    const numValue = parseInt(text);
    if (!isNaN(numValue)) {
      setter(numValue);
      setSelectedPreset(null);
    }
  };
  
  const applyPreset = (preset: string, values: [number, number, number, number]) => {
    setWorkMinutes(values[0]);
    setBreakMinutes(values[1]);
    setRounds(values[2]);
    setLongBreakMinutes(values[3]);
    
    // Update inputs for manual entry
    setWorkInput(values[0].toString());
    setBreakInput(values[1].toString());
    setRoundsInput(values[2].toString());
    setLongBreakInput(values[3].toString());
    
    setSelectedPreset(preset);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: currentTheme.onBackground }]}>Timer Setup</Text>

        <View style={styles.presetContainer}>
          <Text style={[styles.sectionTitle, { color: currentTheme.onBackgroundSecondary }]}>Choose a Preset</Text>
          <View style={styles.presetList}>
            <PresetTimer
              label="Classic"
              description="25min work, 5min break, 4 rounds"
              values={[25, 5, 4, 15]}
              isSelected={selectedPreset === 'classic'}
              onPress={() => applyPreset('classic', [25, 5, 4, 15])}
            />
            <PresetTimer
              label="Long Focus"
              description="50min work, 10min break, 2 rounds"
              values={[50, 10, 2, 30]}
              isSelected={selectedPreset === 'longFocus'}
              onPress={() => applyPreset('longFocus', [50, 10, 2, 30])}
            />
            <PresetTimer
              label="Short Burst"
              description="15min work, 3min break, 8 rounds"
              values={[15, 3, 8, 15]}
              isSelected={selectedPreset === 'shortBurst'}
              onPress={() => applyPreset('shortBurst', [15, 3, 8, 15])}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: currentTheme.onBackgroundSecondary, marginTop: 20 }]}>
          Customize Timer
        </Text>

        {/* Work Session Input */}
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: currentTheme.onBackground }]}>
            Work Session
          </Text>
          <View style={styles.valueControlContainer}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(workMinutes, setWorkMinutes, setWorkInput, -5, 10, 60)}
            >
              <Ionicons name="remove" size={20} color={currentTheme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.valueDisplay, { backgroundColor: currentTheme.inputBackground }]}
              activeOpacity={0.7}
            >
              <TextInput
                style={[styles.valueInput, { color: currentTheme.onBackground }]}
                value={workInput}
                onChangeText={(text) => handleInputChange(text, setWorkMinutes, setWorkInput)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={[styles.valueUnit, { color: currentTheme.onBackgroundSecondary }]}>min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(workMinutes, setWorkMinutes, setWorkInput, 5, 10, 60)}
            >
              <Ionicons name="add" size={20} color={currentTheme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Break Session Input */}
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: currentTheme.onBackground }]}>
            Short Break
          </Text>
          <View style={styles.valueControlContainer}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(breakMinutes, setBreakMinutes, setBreakInput, -5, 1, 15)}
            >
              <Ionicons name="remove" size={20} color={currentTheme.secondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.valueDisplay, { backgroundColor: currentTheme.inputBackground }]}
              activeOpacity={0.7}
            >
              <TextInput
                style={[styles.valueInput, { color: currentTheme.onBackground }]}
                value={breakInput}
                onChangeText={(text) => handleInputChange(text, setBreakMinutes, setBreakInput)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={[styles.valueUnit, { color: currentTheme.onBackgroundSecondary }]}>min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(breakMinutes, setBreakMinutes, setBreakInput, 5, 1, 15)}
            >
              <Ionicons name="add" size={20} color={currentTheme.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rounds Input */}
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: currentTheme.onBackground }]}>
            Number of Rounds
          </Text>
          <View style={styles.valueControlContainer}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(rounds, setRounds, setRoundsInput, -1, 1, 10)}
            >
              <Ionicons name="remove" size={20} color={currentTheme.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.valueDisplay, { backgroundColor: currentTheme.inputBackground }]}
              activeOpacity={0.7}
            >
              <TextInput
                style={[styles.valueInput, { color: currentTheme.onBackground }]}
                value={roundsInput}
                onChangeText={(text) => handleInputChange(text, setRounds, setRoundsInput)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(rounds, setRounds, setRoundsInput, 1, 1, 10)}
            >
              <Ionicons name="add" size={20} color={currentTheme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Long Break Input */}
        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: currentTheme.onBackground }]}>
            Long Break
          </Text>
          <View style={styles.valueControlContainer}>
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(longBreakMinutes, setLongBreakMinutes, setLongBreakInput, -5, 5, 30)}
            >
              <Ionicons name="remove" size={20} color={currentTheme.primaryLight} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.valueDisplay, { backgroundColor: currentTheme.inputBackground }]}
              activeOpacity={0.7}
            >
              <TextInput
                style={[styles.valueInput, { color: currentTheme.onBackground }]}
                value={longBreakInput}
                onChangeText={(text) => handleInputChange(text, setLongBreakMinutes, setLongBreakInput)}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={[styles.valueUnit, { color: currentTheme.onBackgroundSecondary }]}>min</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: currentTheme.surface }]}
              onPress={() => adjustValue(longBreakMinutes, setLongBreakMinutes, setLongBreakInput, 5, 5, 30)}
            >
              <Ionicons name="add" size={20} color={currentTheme.primaryLight} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: currentTheme.primary }]}
          onPress={handleCreateSession}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="play-circle" size={20} color="white" style={styles.buttonIcon} />
              <Text style={styles.createButtonText}>Create Session</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContainer: {
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  presetContainer: {
    marginBottom: 12,
  },
  presetList: {
    gap: 10,
  },
  presetButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  presetButtonText: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 16,
  },
  presetSubtext: {
    fontSize: 14,
  },
  inputRow: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  valueControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueDisplay: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    marginHorizontal: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
    minWidth: 40,
  },
  valueUnit: {
    fontSize: 16,
    marginLeft: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SessionSetup; 