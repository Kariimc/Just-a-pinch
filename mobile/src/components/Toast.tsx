import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Shadow } from '../theme';
import Icon, { IconName } from './Icon';

interface ToastPayload {
  message: string;
  icon?: IconName;
}

let emit: ((payload: ToastPayload) => void) | null = null;

export function showToast(message: string, icon: IconName = 'check') {
  emit?.({ message, icon });
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    emit = payload => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast(payload);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          Animated.timing(translate, { toValue: 12, duration: 220, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 2200);
    };
    return () => {
      emit = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity, translate]);

  if (!toast) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 92 }]}>
      <Animated.View style={[styles.toast, Shadow.cardSoft, { opacity, transform: [{ translateY: translate }] }]}>
        {toast.icon && (
          <View style={styles.iconWrap}>
            <Icon name={toast.icon} size={14} color="#fff" />
          </View>
        )}
        <Text style={styles.txt} numberOfLines={2}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    maxWidth: '86%', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.ink, borderRadius: Radius.pill,
  },
  iconWrap: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  txt: { fontFamily: Fonts.uiSemiBold, fontSize: 14, color: '#fff', flexShrink: 1 },
});
