import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Radius, Fonts } from '../../theme';
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

// Exact Instacart carrot mark:
//   white dot → green vertical stem → two diagonal branches spreading down → orange dome
function InstacartMark({ size = 30 }: { size?: number }) {
  const h = Math.round(size * 68 / 56);
  return (
    <Svg width={size} height={h} viewBox="0 0 56 68">
      {/* White dot */}
      <Circle cx={28} cy={8} r={5.5} fill="white" />
      {/* Green vertical stem */}
      <Path d="M28,13.5 L28,30" stroke="#178244" strokeWidth={6} strokeLinecap="round" />
      {/* Green left diagonal branch */}
      <Path d="M28,30 Q20,40 11,52" stroke="#178244" strokeWidth={6} strokeLinecap="round" />
      {/* Green right diagonal branch */}
      <Path d="M28,30 Q36,40 45,52" stroke="#178244" strokeWidth={6} strokeLinecap="round" />
      {/* Orange carrot dome */}
      <Path d="M9,54 Q9,68 28,68 Q47,68 47,54 Z" fill="#F07830" />
    </Svg>
  );
}

function InstacartButton({ items }: { items: ShoppingItem[] }) {
  const unchecked = items.filter(i => !i.checked);

  async function openInstacart() {
    if (!unchecked.length) {
      showToast('Add items to your list first', 'info');
      return;
    }
    const query = unchecked
      .slice(0, 12)
      .map(i => [i.quantity, i.unit, i.name].filter(Boolean).join(' ').trim())
      .join(', ');
    const url = `https://www.instacart.com/store/s?k=${encodeURIComponent(query)}`;
    try {
      await Linking.openURL(url);
    } catch {
      showToast('Could not open Instacart', 'info');
    }
  }

  return (
    <TouchableOpacity style={styles.instacartBtn} onPress={openInstacart} activeOpacity={0.8}>
      <InstacartMark size={30} />
      <Text style={styles.instacartText}>instacart</Text>
    </TouchableOpacity>
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
    Alert.alert('Clear checked', `Remove ${checkedCount} checked item${checkedCount === 1 ? '' : 's'}?`, [
      { text: 'Cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const updated = items.filter(i => !i.checked);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        await saveShoppingItems(updated);
        setItems(updated);
        hapticSuccess();
        showToast('Checked items cleared', 'trash');
      }},
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
  // Instacart button — exact logo reproduction: carrot mark + "instacart" on cream
  instacartBtn: {
    marginTop: 32,
    backgroundColor: '#F5F0E0',
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8DFC8',
  },
  instacartText: {
    fontFamily: Fonts.uiBold,
    fontSize: 26,
    color: '#1A1A1A',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
});
