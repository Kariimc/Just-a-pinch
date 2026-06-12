import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Alert, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, G } from 'react-native-svg';
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

const CATEGORY_EMOJI: Record<string, string> = {
  'Produce': '🥬',
  'Dairy & eggs': '🥚',
  'Meat & fish': '🥩',
  'Pantry': '🫙',
  'Bakery': '🥖',
  'Other': '🛒',
};

const ITEM_EMOJI: Record<string, string> = {
  'Produce': '🥦',
  'Dairy & eggs': '🧀',
  'Meat & fish': '🍗',
  'Pantry': '🧂',
  'Bakery': '🍞',
  'Other': '🛒',
};

function CarrotIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        {/* Carrot body */}
        <Path
          d="M12 2C10.5 2 9 3 8 5L5 20C5 21 6 22 7 22L17 22C18 22 19 21 19 20L16 5C15 3 13.5 2 12 2Z"
          fill="#FF6B00"
        />
        {/* Carrot highlight */}
        <Path
          d="M10 4C9.5 5 9 7 9 9L10 9C10 7.5 10.5 5.5 11 4.5Z"
          fill="#FF9940"
          opacity="0.7"
        />
        {/* Carrot top greens */}
        <Path
          d="M12 2C11 1 9 0.5 8 1C9 2 10 3 10.5 4.5C11 3.5 11.5 2.5 12 2Z"
          fill="#2E9E57"
        />
        <Path
          d="M12 2C13 1 15 0.5 16 1C15 2 14 3 13.5 4.5C13 3.5 12.5 2.5 12 2Z"
          fill="#2E9E57"
        />
        <Path
          d="M12 2C12 1 11.5 0 11 0C10.5 0.5 10.5 2 10.5 3C11 2.5 11.5 2.2 12 2Z"
          fill="#40B86A"
        />
      </G>
    </Svg>
  );
}

function InstacartButton({ items }: { items: ShoppingItem[] }) {
  const unchecked = items.filter(i => !i.checked);

  async function openInstacart() {
    if (!unchecked.length) {
      showToast('Check off items to exclude, or add items first', 'info');
      return;
    }
    const query = unchecked
      .slice(0, 10)
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
    <TouchableOpacity style={styles.instacartBtn} onPress={openInstacart} activeOpacity={0.82}>
      <View style={styles.instacartLeft}>
        <CarrotIcon size={26} />
        <View>
          <Text style={styles.instacartBrand}>instacart</Text>
          <Text style={styles.instacartSub}>
            {unchecked.length
              ? `Send ${unchecked.length} item${unchecked.length === 1 ? '' : 's'} to cart`
              : 'Add items to your list first'}
          </Text>
        </View>
      </View>
      <View style={styles.instacartCta}>
        <Text style={styles.instacartCtaTxt}>Shop</Text>
      </View>
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

        {/* Progress */}
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
                  <View style={styles.catRow}>
                    <Text style={styles.catEmoji}>{CATEGORY_EMOJI[cat] ?? '🛒'}</Text>
                    <Text style={styles.catLabel}>{cat}</Text>
                  </View>
                  {catItems.map(item => (
                    <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggle(item.id)}>
                      <Text style={styles.itemEmoji}>{ITEM_EMOJI[item.category] ?? '🛒'}</Text>
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

              {/* Instacart button */}
              <InstacartButton items={items} />
            </>
          )}
        </ScrollView>

        {/* Add item bar */}
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
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 4 },
  catEmoji: { fontSize: 18 },
  catLabel: { fontFamily: Fonts.uiBold, fontSize: 16, color: Colors.ink },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.line },
  itemEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  itemTxt: { fontFamily: Fonts.uiRegular, fontSize: 15.5, color: Colors.ink, lineHeight: 21 },
  itemQty: { fontFamily: Fonts.uiBold },
  itemDone: { color: Colors.ink3, textDecorationLine: 'line-through' },
  haveBadge: { backgroundColor: Colors.accentSoft, paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.pill },
  haveTxt: { fontFamily: Fonts.uiBold, fontSize: 10.5, color: Colors.accentInk },
  addBar: { borderTopWidth: 1, borderTopColor: Colors.line, paddingVertical: 11, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: Colors.paper },
  addInput: { flex: 1, height: 46, backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: 16, fontFamily: Fonts.uiRegular, fontSize: 15, color: Colors.ink },
  micBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  // Instacart button
  instacartBtn: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F0E8',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#E8E0CC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  instacartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  instacartBrand: { fontFamily: Fonts.uiBold, fontSize: 17, color: '#1A1A1A', letterSpacing: -0.3 },
  instacartSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: '#5A5248', marginTop: 1 },
  instacartCta: {
    backgroundColor: '#0AAD0A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  instacartCtaTxt: { fontFamily: Fonts.uiBold, fontSize: 13.5, color: '#fff' },
});
