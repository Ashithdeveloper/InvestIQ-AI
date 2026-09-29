import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined' | 'accent';
}


export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  return <View style={[styles.base, styles[variant], style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
  },
  default: {
    backgroundColor: '#1E222D',
    borderWidth: 1,
    borderColor: '#2A2E39',
  },
  elevated: {
    backgroundColor: '#1E222D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#2A2E39',
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#363C4E',
  },
  accent: {
    backgroundColor: '#172234',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
});
