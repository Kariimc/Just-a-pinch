import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Linking,
  ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { Colors, Radius, Fonts } from '../../theme';
import Icon from '../../components/Icon';
import AnimatedCheck from '../../components/AnimatedCheck';
import EmptyState from '../../components/EmptyState';
import { showToast } from '../../components/Toast';
import { getShoppingItems, saveShoppingItems, toggleShoppingItem } from '../../store/storage';
import { createInstacartLink } from '../../services/api';
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

function instacartSearchUrl(item: ShoppingItem) {
  return `https://www.instacart.com/store/s?k=${encodeURIComponent(item.name.trim())}`;
}

function InstacartButton({ items }: { items: ShoppingItem[] }) {
  const [building, setBuilding] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const unchecked = items.filter(i => !i.checked);

  async function openInstacart() {
    if (!unchecked.length) {
      showToast('Add items to your list first', 'info');
      return;
    }
    if (building) return;
    setBuilding(true);
    try {
      // One-tap cart via the Instacart partner API. Their developer program is
      // currently closed to new apps, so until a key exists this 503s fast and
      // we fall through to the item-by-item sheet below.
      const url = await createInstacartLink(
        unchecked.map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit })),
        'Just a Pinch shopping list',
      );
      openExternal(url);
    } catch {
      setVisited(new Set());
      setSheetOpen(true);
    } finally {
      setBuilding(false);
    }
  }

  function shopItem(item: ShoppingItem) {
    setVisited(prev => new Set(prev).add(item.id));
    openExternal(instacartSearchUrl(item));
  }

  return (
    <>
      <TouchableOpacity style={styles.instacartBtn} onPress={openInstacart} activeOpacity={0.85} disabled={building}>
        <View style={styles.instacartCircle}>
          {building ? <ActivityIndicator size="small" color={Colors.instacart} /> : <InstacartMark size={24} />}
        </View>
        <Text style={styles.instacartText}>{building ? 'Opening Instacart…' : 'Get it on Instacart'}</Text>
      </TouchableOpacity>

      {/* Item-by-item shopper — each row opens an accurate single-item search */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <TouchableOpacity style={styles.icBackdrop} activeOpacity={1} onPress={() => setSheetOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.icSheet}>
            <View style={styles.icHeader}>
              <View style={styles.icHeaderMark}><InstacartMark size={22} /></View>
              <Text style={styles.icTitle}>Shop on Instacart</Text>
            </View>
            <Text style={styles.icNote}>
              Tap an item to find it on Instacart and add it to your cart, then come back for the next one.
            </Text>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingBottom: 4 }}>
              {unchecked.map(item => {
                const done = visited.has(item.id);
                return (
                  <TouchableOpacity key={item.id} style={[styles.icRow, done && styles.icRowDone]} onPress={() => shopItem(item)}>
                    <Text style={[styles.icRowTxt, done && styles.icRowTxtDone]} numberOfLines={1}>
                      <Text style={styles.icRowQty}>{[item.quantity, item.unit].filter(Boolean).join(' ')}</Text>
                      {'  '}{item.name}
                    </Text>
                    <Icon name={done ? 'check' : 'fwd'} size={17} color={done ? Colors.instacart : Colors.ink3} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.icDoneBtn} onPress={() => setSheetOpen(false)}>
              <Text style={styles.icDoneTxt}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function ShoppingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');

  useFocusEffect(useCallback(() => {
    getShoppingItems().then(setItems);
  }, []));

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

  async function clearChecked() {
    const checkedCount = items.filter(i => i.checked).length;
    if (!checkedCount) { showToast('Nothing checked off yet', 'info'); return; }
    const doClear = async () => {
      const updated = items.filter(i => !i.checked);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await saveShoppingItems(updated);
      setItems(updated);
      hapticSuccess();
      showToast('Checked items cleared', 'trash');
    };
    if (Platform.OS === 'web') {
      // Alert.alert is a no-op on react-native-web
      if ((window as any).confirm(`Remove ${checkedCount} checked item${checkedCount === 1 ? '' : 's'}?`)) doClear();
      return;
    }
    Alert.alert('Clear checked', `Remove ${checkedCount} checked item${checkedCount === 1 ? '' : 's'}?`, [
      { text: 'Cancel' },
      { text: 'Clear', style: 'destructive', onPress: doClear },
    ]);
  }

  const total = items.length;
  const checked = items.filter(i => i.checked).length;

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const uncategorised = items.filter(i => !CATEGORIES.includes(i.category));
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
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(checked / total) * 100}%` }]} />
            </View>
            <Text style={styles.progressTxt}>{checked} of {total}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content}>
          {Object.keys(byCategory).length === 0 ? (
            <EmptyState
              icon="cart"
              title="List is empty"
              message="Add items below, send a recipe's ingredients here, or generate a list from your meal plan."
              ctaLabel="Open meal plan"
              onPress={() => (navigation as any).navigate('Plan')}
            />
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
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
              <InstacartButton items={items} />
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
  content: { paddingBottom: 120 },
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

  // Item-by-item Instacart sheet
  icBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  icSheet: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 26,
  },
  icHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icHeaderMark: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  icTitle: { fontFamily: Fonts.uiBold, fontSize: 18, color: Colors.ink },
  icNote: {
    fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink2,
    lineHeight: 18.5, marginTop: 8, marginBottom: 10,
  },
  icRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  icRowDone: { opacity: 0.55 },
  icRowTxt: { flex: 1, fontFamily: Fonts.uiRegular, fontSize: 15, color: Colors.ink },
  icRowTxtDone: { color: Colors.ink3 },
  icRowQty: { fontFamily: Fonts.uiBold },
  icDoneBtn: {
    marginTop: 14, height: 50, borderRadius: Radius.pill,
    backgroundColor: Colors.instacart, alignItems: 'center', justifyContent: 'center',
  },
  icDoneTxt: { fontFamily: Fonts.uiBold, fontSize: 15.5, color: Colors.white },
});
