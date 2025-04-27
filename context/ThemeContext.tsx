import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

// Define theme colors
type ThemeColors = {
  // Brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  
  // Background colors
  background: string;
  backgroundLight: string;
  backgroundGradient: string[];
  cardBackground: string;
  surfaceLight: string;
  surface: string;
  timerBackground: string;
  
  // Text colors
  onBackground: string;
  onBackgroundSecondary: string;
  onSurface: string;
  onSurfaceSecondary: string;
  
  // States
  error: string;
  success: string;
  warning: string;
  
  // Timer phases
  work: string;
  workGradient: string[];
  break: string;
  breakGradient: string[];
  longBreak: string;
  longBreakGradient: string[];
  
  // Misc
  divider: string;
  overlay: string;
  shadow: string;
  transparent: string;
  buttonText: string;
  inputBackground: string;
  
  // Timer ring colors
  timerRing: string;
  timerRingBackground: string;
};

// Define the shape of our theme context
type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  currentTheme: ThemeColors;
};

// Create the context with a default value
const defaultTheme: ThemeColors = {
  // Brand colors
  primary: Colors.primary,
  primaryLight: Colors.primaryLight,
  primaryDark: Colors.primaryDark,
  secondary: Colors.secondary,
  secondaryLight: Colors.secondaryLight,
  secondaryDark: Colors.secondaryDark,
  accent: Colors.accent,
  accentLight: Colors.accentLight,
  accentDark: Colors.accentDark,
  
  // Background colors
  background: Colors.background,
  backgroundLight: Colors.backgroundLight,
  backgroundGradient: Colors.backgroundGradient,
  cardBackground: Colors.cardBackground,
  surfaceLight: Colors.surfaceLight,
  surface: Colors.surface,
  timerBackground: Colors.timerBackground,
  
  // Text colors
  onBackground: Colors.onBackground,
  onBackgroundSecondary: Colors.onBackgroundSecondary,
  onSurface: Colors.onSurface,
  onSurfaceSecondary: Colors.onSurfaceSecondary,
  
  // States
  error: Colors.error,
  success: Colors.success,
  warning: Colors.warning,
  
  // Timer phases
  work: Colors.work,
  workGradient: Colors.workGradient,
  break: Colors.break,
  breakGradient: Colors.breakGradient,
  longBreak: Colors.longBreak,
  longBreakGradient: Colors.longBreakGradient,
  
  // Misc
  divider: Colors.divider,
  overlay: Colors.overlay,
  shadow: Colors.shadow,
  transparent: Colors.transparent,
  buttonText: Colors.buttonText,
  inputBackground: Colors.inputBackground,
  
  // Timer ring colors
  timerRing: Colors.timerRing,
  timerRingBackground: Colors.timerRingBackground,
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
  currentTheme: defaultTheme,
});

// Theme storage key
const THEME_STORAGE_KEY = 'pomo-theme-preference';

// Provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  // For now, always use dark theme as per the requirement
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on initial mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          // Force dark theme for now
          setIsDark(true);
        } else {
          // Force dark theme regardless of device settings
          setIsDark(true);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemePreference();
  }, []);

  // Save theme preference whenever it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light').catch((error) => {
        console.error('Error saving theme preference:', error);
      });
    }
  }, [isDark, isLoaded]);

  // Toggle between light and dark theme (always force dark for now)
  const toggleTheme = () => {
    // Force dark theme for this design
    setIsDark(true);
  };

  // Set theme explicitly (always force dark for now)
  const setTheme = () => {
    setIsDark(true);
  };

  // We're always using the dark theme for this design
  const currentTheme = defaultTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext); 