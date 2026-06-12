import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Fonts, Radius } from '../theme';
import Button from './Button';
import Icon, { IconName } from './Icon';

interface Props {
  icon: IconName;
  title: string;
  message: string;
  ctaLabel?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({ icon, title, message, ctaLabel, onPress, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={30} color={Colors.accentDeep} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{message}</Text>
      {ctaLabel && onPress && (
        <Button label={ctaLabel} small onPress={onPress} style={styles.cta} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: 30 },
  iconWrap: {
    width: 72, height: 72, borderRadius: Radius.pill,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink, marginTop: 18 },
  sub: {
    fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2,
    marginTop: 8, textAlign: 'center', lineHeight: 20, maxWidth: 280,
  },
  cta: { marginTop: 18 },
});
