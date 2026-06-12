import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts, Shadow } from '../../theme';
import { getRecipe, getShoppingItems, saveShoppingItems } from '../../store/storage';
import { formatTime, scaleQuantity, uid } from '../../utils/id';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Button from '../../components/Button';
import Icon from '../../components/Icon';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;
type Tab = 'ingredients' | 'method' | 'nutrition';
type Unit = 'us' | 'metric';

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState(4);
  const [unit, setUnit] = useState<Unit>('us');
  const [checkedIngr, setCheckedIngr] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRecipe(recipeId).then(r => {
      if (r) { setRecipe(r); setServings(r.servings); }
    });
  }, [recipeId]);

  async function addToShoppingList() {
    if (!recipe) return;
    const existing = await getShoppingItems();
    const newItems = recipe.ingredients.map(ing => ({
      id: uid(),
      name: ing.name,
      quantity: scaleQuantity(ing.quantity, recipe.servings, servings),
      unit: ing.unit,
      category: 'Uncategorised',
      checked: false,
      recipeIds: [recipe.id],
    }));
    await saveShoppingItems([...existing, ...newItems]);
    Alert.alert('Added!', `${newItems.length} ingredients added to your shopping list.`);
  }

  function toggleIngr(id: string) {
    setCheckedIngr(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (!recipe) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontFamily: Fonts.uiRegular, color: Colors.ink2 }}>Loading…</Text>
      </View>
    );
  }

  const totalMin = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero photo */}
        <View style={{ height: 248 }}>
          {recipe.imageUri
            ? <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            : <FoodPlaceholder variant={recipe.imageColor as any} style={StyleSheet.absoluteFillObject} />}
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Icon name="back" size={20} color={Colors.ink} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <TouchableOpacity style={styles.iconBtn}>
                <Icon name="bookmark" size={20} color={Colors.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}>
                <Icon name="more" size={20} color={Colors.ink} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Eyebrow / collection name */}
          <Text style={styles.eyebrow}>{recipe.collections[0] ?? 'My recipes'}</Text>
          <Text style={styles.title}>{recipe.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {recipe.rating ? (
              <Text style={styles.rating}>★ {recipe.rating}</Text>
            ) : null}
            {recipe.cookedCount ? (
              <Text style={styles.meta}>· {recipe.cookedCount} cooks</Text>
            ) : null}
            {recipe.sourceUrl ? (
              <Text style={styles.meta}>· from web</Text>
            ) : null}
          </View>

          {/* Stats cluster */}
          <View style={[styles.statsCard, Shadow.card]}>
            <StatItem label="Prep" value={formatTime(recipe.prepMinutes)} />
            <StatItem label="Cook" value={formatTime(recipe.cookMinutes)} />
            <StatItem label="Total" value={formatTime(totalMin)} />
            <StatItem label="Cal" value={recipe.nutrition ? String(recipe.nutrition.calories) : '—'} />
          </View>

          {/* Servings stepper + unit toggle */}
          <View style={styles.controls}>
            <View style={styles.stepperRow}>
              <Text style={styles.controlLabel}>Servings</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setServings(s => Math.max(1, s - 1))}>
                  <Icon name="minus" size={18} color={Colors.ink} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{servings}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setServings(s => s + 1)}>
                  <Icon name="plus" size={18} color={Colors.ink} />
                </TouchableOpacity>
              </View>
            </View>
            {/* Unit segmented control */}
            <View style={styles.seg}>
              <TouchableOpacity style={[styles.segBtn, unit === 'us' && styles.segActive]} onPress={() => setUnit('us')}>
                <Text style={[styles.segTxt, unit === 'us' && styles.segActiveTxt]}>US</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segBtn, unit === 'metric' && styles.segActive]} onPress={() => setUnit('metric')}>
                <Text style={[styles.segTxt, unit === 'metric' && styles.segActiveTxt]}>Metric</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['ingredients', 'method', 'nutrition'] as Tab[]).map(t => (
              <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabTxt, tab === t && styles.tabActiveTxt]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Ingredients tab */}
          {tab === 'ingredients' && (
            <View>
              <View style={styles.ingrHeader}>
                <Text style={styles.secTitle}>{recipe.ingredients.length} ingredients</Text>
                <Text style={styles.scaledLabel}>Scaled for {servings}</Text>
              </View>
              {recipe.ingredients.map(ing => (
                <TouchableOpacity key={ing.id} style={styles.ingrRow} onPress={() => toggleIngr(ing.id)}>
                  <View style={[styles.check, checkedIngr.has(ing.id) && styles.checkOn]}>
                    {checkedIngr.has(ing.id) && <Icon name="check" size={15} color="#fff" />}
                  </View>
                  <Text style={[styles.ingrTxt, checkedIngr.has(ing.id) && styles.ingrDone]}>
                    <Text style={styles.ingrQty}>
                      {scaleQuantity(ing.quantity, recipe.servings, servings)} {ing.unit}
                    </Text>
                    {'  '}{ing.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <Button
                label="Add all to shopping list"
                variant="ghost"
                onPress={addToShoppingList}
                style={{ marginTop: 14 }}
                leadingIcon={<Icon name="cart" size={18} color={Colors.ink} />}
              />
            </View>
          )}

          {/* Method tab */}
          {tab === 'method' && (
            <View>
              {recipe.steps.map(step => (
                <View key={step.id} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumTxt}>{step.number}</Text>
                  </View>
                  <Text style={styles.stepTxt}>{step.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Nutrition tab */}
          {tab === 'nutrition' && recipe.nutrition && (
            <View style={styles.nutritionCard}>
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>Per serving</Text>
                <Text style={styles.calVal}>
                  {recipe.nutrition.calories}{' '}
                  <Text style={styles.calUnit}>kcal</Text>
                </Text>
              </View>
              <NutrBar label="Carbs" value={recipe.nutrition.carbs} max={80} color={Colors.accent} />
              <NutrBar label="Protein" value={recipe.nutrition.protein} max={60} color={Colors.accentDeep} />
              <NutrBar label="Fat" value={recipe.nutrition.fat} max={60} color="#D9602F" />
            </View>
          )}

          {/* Notes */}
          {recipe.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesTxt}>"{recipe.notes}"</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Start Cooking CTA */}
      <View style={styles.stickyBar}>
        <Button
          label="Start Cooking"
          onPress={() => navigation.navigate('CookingMode', { recipeId })}
          leadingIcon={<Icon name="flame" size={18} color="#fff" />}
        />
      </View>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statKey}>{label}</Text>
    </View>
  );
}

function NutrBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.nutrLabel}>{label}</Text>
        <Text style={styles.nutrLabel}>{value}g</Text>
      </View>
      <View style={styles.nutrTrack}>
        <View style={[styles.nutrFill, { width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: {
    position: 'absolute', top: 52, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.line,
  },
  body: { padding: 18, paddingTop: 16 },
  eyebrow: {
    fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 1.6,
    textTransform: 'uppercase', color: Colors.accentDeep,
  },
  title: {
    fontFamily: Fonts.displayMedium, fontSize: 28,
    lineHeight: 31.4, color: Colors.ink, marginTop: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  rating: { fontFamily: Fonts.uiBold, color: Colors.accentDeep, fontSize: 13.5 },
  meta: { fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2 },

  // Stats cluster
  statsCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line,
    marginTop: 16, overflow: 'hidden',
  },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: 13,
    borderLeftWidth: 1, borderLeftColor: Colors.line,
  },
  statVal: { fontFamily: Fonts.uiBold, fontSize: 15, color: Colors.ink },
  statKey: { fontFamily: Fonts.uiRegular, fontSize: 11, color: Colors.ink2, marginTop: 1 },

  // Controls row
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  controlLabel: { fontFamily: Fonts.uiBold, fontSize: 14.5, color: Colors.ink, marginRight: 11 },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.line2,
    borderRadius: Radius.pill, overflow: 'hidden',
  },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepVal: { fontFamily: Fonts.uiBold, minWidth: 46, textAlign: 'center', fontSize: 15, color: Colors.ink },

  // Unit segmented control
  seg: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 4, gap: 2 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.pill },
  segActive: { backgroundColor: Colors.surface },
  segTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink2 },
  segActiveTxt: { color: Colors.ink },

  // Tabs
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderRadius: Radius.pill, padding: 4, marginTop: 18, gap: 2,
  },
  tabItem: { flex: 1, paddingVertical: 7, borderRadius: Radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surface },
  tabTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink2 },
  tabActiveTxt: { color: Colors.ink },

  // Ingredients
  ingrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18 },
  secTitle: { fontFamily: Fonts.uiBold, fontSize: 19, letterSpacing: -0.2, color: Colors.ink },
  scaledLabel: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.accentDeep },
  ingrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  check: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2,
    borderColor: Colors.line2, alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  ingrTxt: { fontFamily: Fonts.uiRegular, flex: 1, fontSize: 15.5, color: Colors.ink, lineHeight: 21 },
  ingrQty: { fontFamily: Fonts.uiBold },
  ingrDone: { color: Colors.ink3, textDecorationLine: 'line-through' },

  // Method steps
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 13,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  stepNum: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  stepNumTxt: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.accentInk },
  stepTxt: { fontFamily: Fonts.uiRegular, flex: 1, fontSize: 15.5, color: Colors.ink, lineHeight: 22 },

  // Nutrition
  nutritionCard: {
    marginTop: 16, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, padding: 16,
  },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  calLabel: { fontFamily: Fonts.uiBold, fontSize: 15, color: Colors.ink },
  calVal: { fontFamily: Fonts.displayMedium, fontSize: 30, color: Colors.ink },
  calUnit: { fontFamily: Fonts.uiRegular, fontSize: 15, color: Colors.ink2 },
  nutrLabel: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink },
  nutrTrack: { height: 6, borderRadius: 99, backgroundColor: Colors.surface2, marginTop: 5, overflow: 'hidden' },
  nutrFill: { height: '100%', borderRadius: 99 },

  // Notes
  notesCard: {
    marginTop: 18, padding: 15,
    backgroundColor: '#FFF9EC', borderWidth: 1,
    borderColor: '#F0E2C0', borderRadius: Radius.lg,
  },
  notesTxt: { fontFamily: Fonts.displayRegularItalic, fontSize: 15.5, color: '#5C4A1E', lineHeight: 23 },

  // Sticky bar
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 12, paddingHorizontal: 18,
    backgroundColor: 'rgba(250,246,239,0.96)',
    borderTopWidth: 1, borderTopColor: Colors.line,
  },
});
