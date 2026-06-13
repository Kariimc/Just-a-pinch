import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius } from '../theme';

// In-app replacement for every system dialog (Alert.alert, window.confirm,
// ActionSheetIOS): a themed bottom sheet with action rows. Imperative API in
// the style of showToast — call it from anywhere, the host renders at the app
// root. System dialogs are deliberately not used anywhere in the app: they
// look foreign to the design and Alert.alert is a silent no-op on web.

export interface SheetAction {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

export interface SheetOptions {
  title?: string;
  message?: string;
  actions: SheetAction[];
  // null hides the cancel row (backdrop tap still dismisses); defaults to "Cancel".
  cancelLabel?: string | null;
  onCancel?: () => void;
}

let emit: ((opts: SheetOptions) => void) | null = null;

export function showActionSheet(opts: SheetOptions) {
  emit?.(opts);
}

// Two-button confirm in sheet form.
export function confirmSheet(opts: {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  cancelLabel?: string;
}) {
  showActionSheet({
    title: opts.title,
    message: opts.message,
    actions: [{ label: opts.confirmLabel, destructive: opts.destructive ?? true, onPress: opts.onConfirm }],
    cancelLabel: opts.cancelLabel ?? 'Cancel',
  });
}

export function ActionSheetHost() {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<SheetOptions | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    emit = opts => {
      setSheet(opts);
      fade.setValue(0);
      slide.setValue(40);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 5 }),
      ]).start();
    };
    return () => { emit = null; };
  }, [fade, slide]);

  function close(after?: () => void) {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 40, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setSheet(null);
      after?.();
    });
  }

  if (!sheet) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(sheet.onCancel)} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 14) + 8, opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        <View style={styles.handle} />
        {sheet.title ? <Text style={styles.title}>{sheet.title}</Text> : null}
        {sheet.message ? <Text style={styles.message}>{sheet.message}</Text> : null}
        <View style={styles.actions}>
          {sheet.actions.map((a, i) => (
            <TouchableOpacity
              key={a.label}
              style={[styles.row, i > 0 && styles.rowDivider]}
              onPress={() => close(a.onPress)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rowTxt, a.destructive && styles.rowDestructive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {sheet.cancelLabel !== null && (
          <TouchableOpacity style={styles.cancelRow} onPress={() => close(sheet.onCancel)} activeOpacity={0.7}>
            <Text style={styles.cancelTxt}>{sheet.cancelLabel ?? 'Cancel'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(20,14,6,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    paddingHorizontal: 18, paddingTop: 10,
  },
  handle: {
    width: 40, height: 4.5, borderRadius: Radius.pill, alignSelf: 'center',
    backgroundColor: Colors.line2, marginBottom: 12,
  },
  title: { fontFamily: Fonts.uiBold, fontSize: 17, color: Colors.ink, textAlign: 'center' },
  message: {
    fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2, lineHeight: 19,
    textAlign: 'center', marginTop: 5, paddingHorizontal: 10,
  },
  actions: {
    marginTop: 14, backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden',
  },
  row: { height: 52, alignItems: 'center', justifyContent: 'center' },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.line },
  rowTxt: { fontFamily: Fonts.uiBold, fontSize: 15.5, color: Colors.ink },
  rowDestructive: { color: '#E53535' },
  cancelRow: {
    height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8,
    backgroundColor: Colors.surface2, borderRadius: Radius.md,
  },
  cancelTxt: { fontFamily: Fonts.uiBold, fontSize: 15.5, color: Colors.ink2 },
});
