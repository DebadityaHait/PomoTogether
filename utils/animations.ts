import { Animated, Easing } from 'react-native';

/**
 * Creates a pulsing animation for an element
 * @param animatedValue Animated.Value to control the animation
 * @param duration Duration of a pulse animation cycle in ms
 * @returns Animation object that can be started
 */
export const createPulseAnimation = (
  animatedValue: Animated.Value, 
  duration: number = 1500
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: duration / 2,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ])
  );
};

/**
 * Creates a fade in animation
 * @param animatedValue Animated.Value to control the animation
 * @param duration Duration of the animation in ms
 * @returns Animation object that can be started
 */
export const fadeIn = (
  animatedValue: Animated.Value,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    useNativeDriver: true,
  });
};

/**
 * Creates a fade out animation
 * @param animatedValue Animated.Value to control the animation
 * @param duration Duration of the animation in ms
 * @returns Animation object that can be started
 */
export const fadeOut = (
  animatedValue: Animated.Value,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
    useNativeDriver: true,
  });
};

/**
 * Creates a timer progress animation for a circular timer
 * @param animatedValue Animated.Value to control the animation
 * @param duration Duration of the animation in ms
 * @param toValue End value of the animation (0 to 1)
 * @returns Animation object that can be started
 */
export const createTimerAnimation = (
  animatedValue: Animated.Value,
  duration: number,
  toValue: number
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: Easing.linear,
    useNativeDriver: false, // Can't use native driver with interpolate colors
  });
};

/**
 * Creates a slide up animation
 * @param animatedValue Animated.Value to control the animation
 * @param duration Duration of the animation in ms
 * @returns Animation object that can be started
 */
export const slideUp = (
  animatedValue: Animated.Value,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: Easing.bezier(0.0, 0.0, 0.2, 1),
    useNativeDriver: true,
  });
};

/**
 * Creates a slide down animation
 * @param animatedValue Animated.Value to control the animation
 * @param duration Duration of the animation in ms
 * @returns Animation object that can be started
 */
export const slideDown = (
  animatedValue: Animated.Value,
  from: number,
  duration: number = 300
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue: from,
    duration,
    easing: Easing.bezier(0.4, 0.0, 1, 1),
    useNativeDriver: true,
  });
}; 