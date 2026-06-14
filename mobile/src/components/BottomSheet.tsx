import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  TouchableWithoutFeedback, ScrollView,
} from 'react-native';
import { Colors, Radius, Fonts } from '../theme';
import Icon from './Icon';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Optional decorative layer drawn over the dim scrim (e.g. a kitchen
  // watermark) so the empty space above the sheet isn't a flat void.
  backdrop?: React.ReactNode;
  // When set, shows a tappable "tap to close" hint pill near the top so the
  // way out of the overlay is unmistakable.
  dismissHint?: string;
}

export default function BottomSheet({ visible, onClose, children, backdrop, dismissHint }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Tap-anywhere-to-close scrim (captures the tap) */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>

        {/* Decorative backdrop sits above the scrim tint but passes taps through */}
        {backdrop}

        {/* Explicit dismissal affordance */}
        {dismissHint ? (
          <View style={styles.hintWrap} pointerEvents="box-none">
            <TouchableOpacity style={styles.hintChip} onPress={onClose} activeOpacity={0.85}>
              <Icon name="x" size={14} color={Colors.white} />
              <Text style={styles.hintTxt}>{dismissHint}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(33,28,22,0.55)',
  },
  hintWrap: {
    position: 'absolute', top: 0, left: 0, right: 0,
    alignItems: 'center', paddingTop: 64,
  },
  hintChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hintTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.white },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 99,
    backgroundColor: Colors.line2,
    alignSelf: 'center',
    marginBottom: 14,
  },
});
