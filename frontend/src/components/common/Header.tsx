import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, 16);

  return (
    <View style={[styles.container, { paddingTop: safeTopPadding + 4 }]}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightAction ? <View style={styles.right}>{rightAction}</View> : null}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#0F1318',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },

  backArrow: {
    color: '#3B82F6',
    fontSize: 24,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
