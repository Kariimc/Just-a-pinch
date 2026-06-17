import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Linking,
} from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { Colors, Radius, Fonts } from '../../theme';
import { Curves } from '../../theme/motion';
import Icon from '../../components/Icon';
import AnimatedCheck from '../../components/AnimatedCheck';
import EmptyState from '../../components/EmptyState';
import { showToast } from '../../components/Toast';
import { getShoppingItems, saveShoppingItems, toggleShoppingItem } from '../../store/storage';
import { bumpBadgeStat } from '../../store/badges';
import { RootStackParamList, ShoppingItem } from '../../types';
import { uid } from '../../utils/id';
import { categorizeIngredient } from '../../utils/units';
import { hapticLight, hapticSuccess } from '../../lib/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CATEGORIES = ['Produce', 'Dairy & eggs', 'Meat & fish', 'Pantry', 'Bakery', 'Other'];

// Instacart carrot mark traced from carrot.png:
// green down-arrow top (vertical stem + two flared leaves) over a plump
// rounded orange carrot body tapering to a soft point at the bottom.
function InstacartMark({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Stem */}
      <Path d="M50,7 L50,24" stroke="#3DB41F" strokeWidth={11} strokeLinecap="round" />
      {/* Left leaf */}
      <Path d="M33,13 L47,26" stroke="#3DB41F" strokeWidth={11} strokeLinecap="round" />
      {/* Right leaf */}
      <Path d="M67,13 L53,26" stroke="#3DB41F" strokeWidth={11} strokeLinecap="round" />
      {/* Carrot body */}
      <Path
        d="M50,97 C37,91 21,73 21,52 C21,39 33,32 50,32 C67,32 79,39 79,52 C79,73 63,91 50,97 Z"
        fill="#F4690F"
      />
    </Svg>
  );
}

function openExternal(url: string) {
  if (Platform.OS === 'web') {
    // window.open from a direct tap is allowed; post-await it can return null
    // (popup blocked) — fall back to same-tab navigation.
    const w = (window as any).open(url, '_blank');
    if (!w) (window as any).location.href = url;
  } else {
    Linking.openURL(url).catch(() => showToast('Could not open Instacart', 'info'));
  }
}

function InstacartButtons({ onOpen, onCopy }: { onOpen: () => void; onCopy: () => void }) {
  return (
    <>
      <TouchableOpacity style={styles.instacartBtn} onPress={onOpen} activeOpacity={0.85}>
        <View style={styles.instacartCircle}>
          <InstacartMark size={24} />
        </View>
        <Text style={styles.instacartText}>
          {Platform.OS === 'web' ? 'Get it on Instacart' : 'Send list to Instacart'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.copyBtn} onPress={onCopy} activeOpacity={0.7}>
        <Icon name="note" size={16} color={Colors.ink2} />
        <Text style={styles.copyTxt}>Copy list to clipboard</Text>
      </TouchableOpacity>
    </>
  );
}

export default function ShoppingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const trackWidthRef = useRef(0);
  const fillWidth = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));
  const listCaptureRef = useRef<View>(null);

  useFocusEffect(useCallback(() => {
    getShoppingItems().then(i => { setItems(i); setLoading(false); });
  }, []));

  // Animate the progress bar whenever items change.
  useEffect(() => {
    if (trackWidthRef.current > 0) {
      const t = items.length;
      const c = items.filter(i => i.checked).length;
      fillWidth.value = withTiming(
        t > 0 ? (c / t) * trackWidthRef.current : 0,
        { duration: 400, easing: Curves.enter },
      );
    }
  }, [items]);

  async function toggle(id: string) {
    hapticLight();
    await toggleShoppingItem(id);
    const updated = items.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    setItems(updated);
    if (updated.find(i => i.id === id)?.checked) bumpBadgeStat('itemsChecked');
  }

  async function addManual() {
    if (!newItem.trim()) return;
    const name = newItem.trim();
    const item: ShoppingItem = {
      id: uid(), name, quantity: '1', unit: '',
      category: categorizeIngredient(name), checked: false, isManual: true,
    };
    const updated = [...items, item];
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await saveShoppingItems(updated);
    setItems(updated);
    setNewItem('');
    hapticLight();
  }

  // No confirmation dialog — clearing checked items is low-stakes and the
  // toast confirms what happened.
  async function clearChecked() {
    const checkedCount = items.filter(i => i.checked).length;
    if (!checkedCount) { showToast('Nothing checked off yet', 'info'); return; }
    const updated = items.filter(i => !i.checked);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await saveShoppingItems(updated);
    setItems(updated);
    hapticSuccess();
    showToast(`${checkedCount} item${checkedCount === 1 ? '' : 's'} cleared`, 'trash');
  }

  // Remove a single item outright — no need to check it off first.
  async function removeItem(id: string) {
    hapticLight();
    const updated = items.filter(i => i.id !== id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await saveShoppingItems(updated);
    setItems(updated);
  }

  function resolvedList() {
    const pending = newItem.trim();
    if (!pending) return { list: items, didAddPending: false };
    return {
      list: [...items, {
        id: uid(), name: pending, quantity: '1', unit: '',
        category: categorizeIngredient(pending), checked: false, isManual: true,
      }],
      didAddPending: true,
    };
  }

  function commitPending(list: ShoppingItem[]) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems(list);
    setNewItem('');
    saveShoppingItems(list);
  }

  async function copyList(openAfter: boolean) {
    const { list, didAddPending } = resolvedList();
    const unchecked = list.filter(i => !i.checked);
    if (!unchecked.length) {
      showToast('Type an item below or add a recipe\'s ingredients first', 'info');
      return;
    }
    const text = unchecked
      .map(i => [i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim())
      .join('\n');

    // Clipboard write before any await so the browser honors the tap's permission window.
    let copied = true;
    try { await Clipboard.setStringAsync(text); } catch { copied = false; }

    if (didAddPending) commitPending(list);
    hapticSuccess();
    showToast(
      copied
        ? `${unchecked.length} item${unchecked.length === 1 ? '' : 's'} copied — paste anywhere`
        : 'Could not copy automatically — try again',
      copied ? 'check' : 'info',
    );

    if (!openAfter) return;
    if (Platform.OS === 'web') {
      openExternal('https://www.instacart.com/store/');
    } else {
      try { await Linking.openURL('instacart://'); } catch { openExternal('https://www.instacart.com/store/'); }
    }
  }

  async function openInstacartWithImage() {
    if (Platform.OS === 'web') { await copyList(true); return; }

    // Native-only modules, required lazily: expo-media-library's Next module
    // calls requireNativeModule at import time and throws on web, so a static
    // top-level import would white-screen the entire web bundle.
    const MediaLibrary = require('expo-media-library') as typeof import('expo-media-library');
    const { captureRef } = require('react-native-view-shot') as typeof import('react-native-view-shot');

    const { list, didAddPending } = resolvedList();
    const unchecked = list.filter(i => !i.checked);
    if (!unchecked.length) {
      showToast('No items on your list yet', 'info');
      return;
    }
    if (didAddPending) commitPending(list);

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showToast('Allow photo access to save your list image', 'info');
      return;
    }

    try {
      const uri = await captureRef(listCaptureRef, { format: 'jpg', quality: 0.92 });
      await MediaLibrary.saveToLibraryAsync(uri);
      hapticSuccess();
      showToast('List saved to your photos — open Instacart\'s camera to import', 'check');
      try { await Linking.openURL('instacart://'); } catch { openExternal('https://www.instacart.com/store/'); }
    } catch {
      showToast('Could not save image — try copying the list instead', 'info');
    }
  }

  const total = items.length;
  const checked = items.filter(i => i.checked).length;

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catItems = items
      .filter(i => i.category === cat)
      .sort((a, b) => Number(a.checked) - Number(b.checked)); // unchecked first
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const uncategorised = items
    .filter(i => !CATEGORIES.includes(i.category))
    .sort((a, b) => Number(a.checked) - Number(b.checked));
  if (uncategorised.length) byCategory['Other'] = [...(byCategory['Other'] ?? []), ...uncategorised];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Shopping</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={clearChecked}>
            <Text style={styles.clearTxt}>Clear done</Text>
          </TouchableOpacity>
        </View>

        {total > 0 && (
          <View style={styles.progressRow}>
            <View
              style={styles.progressTrack}
              onLayout={(e) => {
                trackWidthRef.current = e.nativeEvent.layout.width;
                const c = items.filter(i => i.checked).length;
                fillWidth.value = total > 0 ? (c / total) * e.nativeEvent.layout.width : 0;
              }}
            >
              <Animated.View style={[styles.progressFill, fillStyle]} />
            </View>
            <Text style={styles.progressTxt}>{checked} of {total}</Text>
          </View>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {Object.keys(byCategory).length === 0 ? (
            // Only after loading — otherwise the CTA flashes during the fetch.
            !loading && (
            <EmptyState
              icon="cart"
              title="List is empty"
              message="Add items below, send a recipe's ingredients here, or generate a list from your meal plan."
              ctaLabel="Open meal plan"
              onPress={() => (navigation as any).navigate('Plan')}
            />
            )
          ) : (
            <>
              {Object.entries(byCategory).map(([cat, catItems]) => (
                <View key={cat}>
                  <Text style={styles.catLabel}>{cat}</Text>
                  {catItems.map(item => (
                    <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggle(item.id)}>
                      <AnimatedCheck checked={item.checked} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTxt, item.checked && styles.itemDone]}>
                          <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>{'  '}{item.name}
                        </Text>
                      </View>
                      {item.checked && (
                        <View style={styles.haveBadge}><Text style={styles.haveTxt}>In cart</Text></View>
                      )}
                      <TouchableOpacity
                        onPress={() => removeItem(item.id)}
                        hitSlop={10}
                        style={styles.removeBtn}
                        accessibilityLabel={`Remove ${item.name}`}
                      >
                        <Icon name="x" size={15} color={Colors.ink3} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <InstacartButtons onOpen={openInstacartWithImage} onCopy={() => copyList(false)} />
            </>
          )}
        </ScrollView>

        <View style={styles.addBar}>
          <TextInput
            style={styles.addInput}
            placeholder="Add an item…"
            value={newItem}
            onChangeText={setNewItem}
            returnKeyType="done"
            onSubmitEditing={addManual}
          />
          <TouchableOpacity style={styles.micBtn} onPress={addManual}>
            <Icon name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Off-screen view captured as image for Instacart import */}
        <View ref={listCaptureRef} style={styles.captureView} collapsable={false}>
          <Text style={styles.captureHeading}>Shopping List</Text>
          {items.filter(i => !i.checked).map(item => (
            <View key={item.id} style={styles.captureRow}>
              <Text style={styles.captureCheck}>□</Text>
              <Text style={styles.captureItemTxt}>
                {[item.quantity, item.unit, item.name].filter(Boolean).join(' ')}
              </Text>
            </View>
          ))}
          <Text style={styles.captureFooter}>Just a Pinch</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, paddingHorizontal: 22, paddingTop: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  title: { fontFamily: Fonts.displayMedium, fontSize: 30, letterSpacing: -0.3, color: Colors.ink },
  iconBtn: { paddingHorizontal: 14, height: 36, borderRadius: Radius.pill, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  clearTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.ink2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  progressTrack: { flex: 1, height: 6, borderRadius: 99, backgroundColor: Colors.surface2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 99 },
  progressTxt: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.ink2 },
  scroll: { flex: 1 },
  content: { paddingBottom: 24, flexGrow: 1 },
  catLabel: { fontFamily: Fonts.uiBold, fontSize: 16, color: Colors.ink, marginTop: 18, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.line },
  itemTxt: { fontFamily: Fonts.uiRegular, fontSize: 15.5, color: Colors.ink, lineHeight: 21 },
  itemQty: { fontFamily: Fonts.uiBold },
  itemDone: { color: Colors.ink3, textDecorationLine: 'line-through' },
  haveBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill },
  haveTxt: { fontFamily: Fonts.uiBold, fontSize: 10.5, color: Colors.accentInk },
  addBar: { borderTopWidth: 1, borderTopColor: Colors.line, paddingVertical: 11, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: Colors.paper },
  addInput: { flex: 1, height: 46, backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: 16, fontFamily: Fonts.uiRegular, fontSize: 15, color: Colors.ink },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  // Instacart CTA — green pill, carrot mark on a white circle, app font
  instacartBtn: {
    marginTop: 32,
    height: 56,
    backgroundColor: Colors.instacart,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },
  instacartCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  instacartText: {
    fontFamily: Fonts.uiBold,
    fontSize: 16.5,
    color: Colors.white,
  },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14, marginLeft: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface2,
  },
  copyBtn: {
    marginTop: 10, height: 44, borderRadius: Radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line2,
  },
  copyTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 14, color: Colors.ink2 },

  captureView: {
    position: 'absolute',
    left: 9999,
    top: 0,
    width: 360,
    backgroundColor: '#FFFDF8',
    padding: 28,
    paddingBottom: 36,
  },
  captureHeading: {
    fontFamily: Fonts.displayMedium,
    fontSize: 22,
    color: '#14542C',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0D4',
  },
  captureCheck: { fontSize: 16, color: '#2E9E57', lineHeight: 22 },
  captureItemTxt: { fontFamily: Fonts.uiRegular, fontSize: 16, color: '#211C16', flex: 1, lineHeight: 22 },
  captureFooter: {
    fontFamily: Fonts.uiBold,
    fontSize: 11,
    color: '#9C9387',
    marginTop: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
