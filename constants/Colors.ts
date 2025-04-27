/**
 * Modern color scheme for the app with support for gradients and dark theme
 */

// Primary brand colors
const primaryColor = '#8A6FFF'; // Main purple
const secondaryColor = '#53CFFF'; // Bright blue
const accentColor = '#FF5A8C'; // Vibrant pink

// Dark theme specific colors
export default {
  // Brand colors
  primary: primaryColor,
  primaryLight: '#A18AFF',
  primaryDark: '#6F54D9',
  secondary: secondaryColor,
  secondaryLight: '#7DDBFF',
  secondaryDark: '#41A1CC',
  accent: accentColor,
  accentLight: '#FF7DA5',
  accentDark: '#D9366A',
  
  // Background colors
  background: '#12111A', // Very dark purple-black
  backgroundLight: '#1C1B27', // Slightly lighter dark
  backgroundGradient: ['#12111A', '#1E1B30'],
  cardBackground: '#201F2C',
  surfaceLight: '#2D2C3E',
  surface: '#252436',
  timerBackground: '#191824',
  
  // Text colors
  onBackground: '#FFFFFF',
  onBackgroundSecondary: '#B9B8C3',
  onSurface: '#FFFFFF',
  onSurfaceSecondary: '#B9B8C3',
  
  // States
  error: '#FF5A5A',
  success: '#5EFFB8',
  warning: '#FFCC42',
  
  // Timer phases
  work: accentColor, // Pink
  workGradient: ['#FF5A8C', '#FF3C76'],
  break: secondaryColor, // Blue
  breakGradient: ['#53CFFF', '#49B3FF'],
  longBreak: primaryColor, // Purple
  longBreakGradient: ['#8A6FFF', '#6C50FF'],
  
  // Misc
  divider: '#2D2C3E',
  overlay: 'rgba(10, 9, 17, 0.75)',
  shadow: '#000000',
  transparent: 'rgba(0, 0, 0, 0)',
  buttonText: '#FFFFFF',
  inputBackground: 'rgba(45, 44, 62, 0.5)',
  
  // Timer ring colors
  timerRing: '#8A6FFF',
  timerRingBackground: 'rgba(255, 255, 255, 0.1)',
};
