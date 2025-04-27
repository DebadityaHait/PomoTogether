import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface TaskInputProps {
  currentTask: string;
  onSaveTask: (task: string) => void;
}

const TaskInput: React.FC<TaskInputProps> = ({ currentTask, onSaveTask }) => {
  const { currentTheme } = useTheme();
  const [task, setTask] = useState(currentTask);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSaveTask(task);
    setIsEditing(false);
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.surface }]}>
      <Text style={[styles.label, { color: currentTheme.onBackground }]}>Current Task</Text>
      
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: currentTheme.inputBackground,
                borderColor: currentTheme.divider,
                color: currentTheme.onBackground
              }
            ]}
            value={task}
            onChangeText={setTask}
            placeholder="What are you working on?"
            placeholderTextColor={currentTheme.onBackgroundSecondary + '80'}
            autoFocus
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setTask(currentTask);
                setIsEditing(false);
              }}
            >
              <Text style={[styles.cancelButtonText, { color: currentTheme.onBackgroundSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: currentTheme.primary }]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.displayContainer, { borderColor: currentTheme.divider }]} 
          onPress={startEditing}
        >
          {currentTask ? (
            <Text style={[styles.taskText, { color: currentTheme.onBackground }]}>{currentTask}</Text>
          ) : (
            <Text style={[styles.placeholderText, { color: currentTheme.onBackgroundSecondary }]}>
              Tap to add your current task
            </Text>
          )}
          <Ionicons name="pencil" size={16} color={currentTheme.onBackgroundSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  displayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskText: {
    flex: 1,
    fontSize: 16,
    marginRight: 8,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    fontStyle: 'italic',
    marginRight: 8,
  },
  editContainer: {
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  cancelButtonText: {
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default TaskInput; 