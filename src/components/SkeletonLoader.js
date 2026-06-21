// src/components/SkeletonLoader.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

const SKELETON_BG     = '#e5e7eb';
const SKELETON_SHINE  = '#f3f4f6';

export function SkeletonBox({ width = '100%', height = 14, borderRadius = 6, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [SKELETON_BG, SKELETON_SHINE] });

  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: bg }, style]} />;
}

export function SkeletonCard() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBox width={36} height={36} borderRadius={18} style={{ marginRight: 10 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="55%" height={13} />
          <SkeletonBox width="35%" height={10} />
        </View>
        <SkeletonBox width={60} height={22} borderRadius={11} />
      </View>
      <View style={{ gap: 5, marginTop: 12 }}>
        <SkeletonBox width="100%" height={11} />
        <SkeletonBox width="80%"  height={11} />
      </View>
      <View style={[styles.row, { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.surfaceAlt }]}>
        <SkeletonBox width="40%" height={10} />
        <SkeletonBox width="20%" height={10} />
      </View>
    </View>
  );
}

export function SkeletonStatCards() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.statCard}>
          <SkeletonBox width={40} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
          <SkeletonBox width="70%" height={10} />
        </View>
      ))}
    </View>
  );
}

export function SkeletonReportList({ count = 3 }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

export function SkeletonHome() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.homeContainer}>
      <SkeletonStatCards />
      <View style={styles.section}>
        <SkeletonBox width="45%" height={16} style={{ marginBottom: 14 }} />
        <SkeletonReportList count={2} />
      </View>
    </View>
  );
}

export function SkeletonMesSignalements() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={styles.card}>
        <SkeletonBox width="50%" height={14} style={{ marginBottom: 14 }} />
        <View style={styles.statsRow}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ alignItems: 'center', flex: 1, gap: 6 }}>
              <SkeletonBox width={36} height={24} borderRadius={6} />
              <SkeletonBox width="60%" height={10} />
            </View>
          ))}
        </View>
      </View>
      <SkeletonReportList count={3} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.textInverse,
    borderRadius:    16,
    padding:         16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    4,
    elevation:       2,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  statsRow: {
    flexDirection:     'row',
    gap:               10,
    paddingHorizontal: 16,
    paddingVertical:   8,
  },
  statCard: {
    flex:            1,
    backgroundColor: colors.textInverse,
    borderRadius:    16,
    padding:         16,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    4,
    elevation:       2,
  },
  section: {
    backgroundColor: colors.textInverse,
    margin:          16,
    padding:         18,
    borderRadius:    18,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.05,
    shadowRadius:    4,
    elevation:       2,
  },
  homeContainer: {
    flex: 1,
  },
});