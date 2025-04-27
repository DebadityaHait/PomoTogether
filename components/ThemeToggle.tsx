import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme, currentTheme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: currentTheme.onBackground }]}>
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </Text>
      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        trackColor={{ false: '#767577', true: currentTheme.primary }}
        thumbColor={'#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    marginRight: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ThemeToggle; 