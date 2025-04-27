import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface NotificationProps {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onDismiss: () => void;
}

const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  duration = 5000, 
  onDismiss 
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, []);
  
  const getIconAndColor = () => {
    switch (type) {
      case 'info':
        return { icon: 'infocirlce', color: '#3498db' };
      case 'success':
        return { icon: 'checkcircle', color: '#2ecc71' };
      case 'warning':
        return { icon: 'exclamationcircle', color: '#f39c12' };
      case 'error':
        return { icon: 'closecircle', color: '#e74c3c' };
      default:
        return { icon: 'infocirlce', color: '#3498db' };
    }
  };
  
  const { icon, color } = getIconAndColor();
  
  return (
    <Animated.View style={[
      styles.container,
      { 
        opacity: fadeAnim,
        backgroundColor: color + '10',
        borderLeftColor: color 
      }
    ]}>
      <View style={styles.content}>
        <AntDesign name={icon} size={20} color={color} style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
      </View>
      <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
        <AntDesign name="close" size={16} color="#999" />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface NotificationSystemProps {
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  onDismiss: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  notifications, 
  onDismiss 
}) => {
  return (
    <View style={styles.systemContainer}>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  systemContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
});

export default NotificationSystem; 