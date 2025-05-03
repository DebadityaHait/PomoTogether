import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../utils/helpers';
import { useTheme } from '../context/ThemeContext';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface TimerCircleProps {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  phase: 'work' | 'break' | 'longBreak';
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onSkip: () => Promise<void>;
  isHost?: boolean;
}

const { width } = Dimensions.get('window');
const SIZE = width * 0.8;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TimerCircle: React.FC<TimerCircleProps> = ({
  timeRemaining,
  totalTime,
  isRunning,
  phase,
  onStart,
  onPause,
  onSkip,
  isHost = false
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { currentTheme } = useTheme();
  const progress = useSharedValue(1 - timeRemaining / totalTime);

  useEffect(() => {
    progress.value = withTiming(1 - timeRemaining / totalTime, {
      duration: 500,
      easing: Easing.bezierFn(0.25, 0.1, 0.25, 1),
    });
  }, [timeRemaining, totalTime]);

  // Animated circle props
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = CIRCUMFERENCE * progress.value;
    return {
      strokeDashoffset,
    };
  });

  // Handle timer start
  const handleStart = async () => {
    setIsLoading(true);
    try {
      await onStart();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle timer pause
  const handlePause = async () => {
    setIsLoading(true);
    try {
      await onPause();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle phase skip
  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await onSkip();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get phase display text
  const getPhaseText = () => {
    switch (phase) {
      case 'work':
        return 'WORK';
      case 'break':
        return 'BREAK';
      case 'longBreak':
        return 'LONG BREAK';
      default:
        return 'WORK';
    }
  };

  // Get gradients based on phase
  const getGradientColors = () => {
    switch (phase) {
      case 'work':
        return currentTheme.workGradient;
      case 'break':
        return currentTheme.breakGradient;
      case 'longBreak':
        return currentTheme.longBreakGradient;
      default:
        return currentTheme.workGradient;
    }
  };

  // Get status text
  const getStatusText = () => {
    return isRunning ? 'ACTIVE' : 'PAUSED';
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        {/* SVG Timer Circle */}
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Defs>
            <LinearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={getGradientColors()[0]} />
              <Stop offset="100%" stopColor={getGradientColors()[1]} />
            </LinearGradient>
          </Defs>
          
          {/* Background circle */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE_WIDTH}
            stroke={currentTheme.timerRingBackground}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeWidth={STROKE_WIDTH}
            stroke="url(#timerGradient)"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            transform={`rotate(-90, ${SIZE/2}, ${SIZE/2})`}
          />
        </Svg>
        
        {/* Timer content */}
        <View style={styles.timerContent}>
          <Text style={[styles.phase, { color: currentTheme.onBackgroundSecondary }]}>
            {getPhaseText()}
          </Text>
          <Text style={[styles.time, { color: currentTheme.onBackground }]}>
          {formatTime(timeRemaining)}
        </Text>
          <Text style={[styles.status, { 
            color: isRunning ? currentTheme.success : currentTheme.warning 
          }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {/* Controls */}
      {isHost ? (
        <View style={styles.controlsContainer}>
          {!isRunning ? (
            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: getGradientColors()[0] }]} 
              onPress={handleStart}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="play" size={28} color={currentTheme.buttonText} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.mainButton, { backgroundColor: getGradientColors()[0] }]} 
              onPress={handlePause}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="pause" size={28} color={currentTheme.buttonText} />
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.skipButton]} 
            onPress={handleSkip}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={currentTheme.onBackgroundSecondary} size="small" />
            ) : (
              <Ionicons name="play-skip-forward" size={28} color={currentTheme.onBackgroundSecondary} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.nonHostMessage}>
          <Text style={[styles.nonHostText, { color: currentTheme.onBackgroundSecondary }]}>
            {isRunning 
              ? 'Timer is active' 
              : 'Waiting for host...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  timerContainer: {
    position: 'relative',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    fontSize: 60,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  phase: {
    fontSize: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    width: 130,
    justifyContent: 'space-between',
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nonHostMessage: {
    marginTop: 30,
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  nonHostText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default TimerCircle; 