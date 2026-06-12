import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  Platform, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  withSpring, withSequence, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts, Shadow } from '../../theme';
import { getRecipe, getShoppingItems, saveShoppingItems, saveRecipe, deleteRecipe, getProfile } from '../../store/storage';
import { formatTime, scaleQuantity, uid } from '../../utils/id';
import { convertUnits, categorizeIngredient } from '../../utils/units';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import Skeleton from '../../components/Skeleton';
import AnimatedCheck from '../../components/AnimatedCheck';
import { showToast } from '../../components/Toast';
import { showActionSheet, confirmSheet } from '../../components/ActionSheet';
import { Springs } from '../../theme/motion';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import { shareRecipe as shareToCommunity } from '../../lib/community';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;
type Tab = 'ingredients' | 'method' | 'nutrition';
type Unit = 'us' | 'metric';

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState(4);
  const [authorName, setAuthorName] = useState('');
  const [unit, setUnit] = useState<Unit>('us');
  const [checkedIngr, setCheckedIngr] = useState<Set<string>>(new Set());

  const scrollY = useSharedValue(0);
  const bookmarkScale = useSharedValue(1);
  const servingsScale = useSharedValue(1);

  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  // Hero parallax: scrolls at 45% speed, stretches past 1x on overscroll pull.
  // Scroll-driven transforms drift and jank on react-native-web, so the hero
  // stays fixed there and the effect runs on native only.
  const heroStyle = useAnimatedStyle(() => {
    if (Platform.OS === 'web') return {};
    return {
      transform: [
        { translateY: interpolate(scrollY.value, [-300, 0, 248], [-150, 0, 112], Extrapolation.CLAMP) },
        { scale: interpolate(scrollY.value, [-300, 0], [2.2, 1], Extrapolation.CLAMP) },
      ],
    };
  });
  const bookmarkStyle = useAnimatedStyle(() => ({ transform: [{ scale: bookmarkScale.value }] }));
  const servingsStyle = useAnimatedStyle(() => ({ transform: [{ scale: servingsScale.value }] }));

  function bumpServings(delta: number) {
    hapticLight();
    setServings(s => Math.max(1, s + delta));
    servingsScale.value = withSequence(withSpring(1.18, Springs.pop), withSpring(1, Springs.press));
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getRecipe(recipeId), getProfile()]).then(([r, p]) => {
      if (!active) return;
      if (r) {
        setRecipe(r);
        setServings(prev => (prev === 4 ? r.servings : prev));
      }
      if (p?.preferMetric) setUnit('metric');
      if (p?.name) setAuthorName(p.name.split(' ')[0]);
    });
    return () => { active = false; };
  }, [recipeId]));

  async function addToShoppingList() {
    if (!recipe) return;
    const existing = await getShoppingItems();
    const newItems = recipe.ingredients.map(ing => ({
      id: uid(),
      name: ing.name,
      quantity: scaleQuantity(ing.quantity, recipe.servings, servings),
      unit: ing.unit,
      category: categorizeIngredient(ing.name),
      checked: false,
      recipeIds: [recipe.id],
    }));
    await saveShoppingItems([...existing, ...newItems]);
    hapticSuccess();
    showToast(`${newItems.length} ingredients added to your list`, 'cart');
  }

  async function toggleSaved() {
    if (!recipe) return;
    hapticLight();
    bookmarkScale.value = withSequence(withSpring(1.3, Springs.pop), withSpring(1, Springs.glide));
    const updated = { ...recipe, isSaved: !recipe.isSaved };
    setRecipe(updated);
    await saveRecipe(updated);
    showToast(updated.isSaved ? 'Saved to your library' : 'Removed from saved', 'bookmark');
  }

  function confirmDelete() {
    if (!recipe) return;
    confirmSheet({
      title: 'Delete recipe',
      message: `Delete "${recipe.title}" forever?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await deleteRecipe(recipe.id);
        showToast('Recipe deleted', 'trash');
        navigation.goBack();
      },
    });
  }

  async function shareRecipe() {
    if (!recipe) return;
    const lines = [
      recipe.title,
      '',
      `Serves ${recipe.servings} · ${formatTime(recipe.prepMinutes + recipe.cookMinutes)}`,
      '',
      'Ingredients:',
      ...recipe.ingredients.map(i => `• ${[i.quantity, i.unit, i.name].filter(Boolean).join(' ')}`),
    ];
    if (recipe.sourceUrl) lines.push('', recipe.sourceUrl);
    try {
      await Share.share({ message: lines.join('\n'), title: recipe.title });
    } catch {
      // user dismissed the share sheet
    }
  }

  function shareToJapCommunity() {
    if (!recipe) return;
    confirmSheet({
      title: 'Share to Community',
      message: `Share "${recipe.title}" with the Just a Pinch community? Anyone can see and save it.`,
      confirmLabel: 'Share',
      destructive: false,
      onConfirm: async () => {
        try {
          await shareToCommunity(recipe, authorName || 'Anonymous');
          showToast('Shared to the community!', 'people');
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Could not share';
          showToast(msg === 'Sign in to share recipes' ? 'Sign in to share recipes' : 'Could not share recipe', 'wifi');
        }
      },
    });
  }

  function openMenu() {
    if (!recipe) return;
    showActionSheet({
      title: recipe.title,
      actions: [
        { label: 'Edit recipe', onPress: () => navigation.navigate('RecipeEditor', { recipeId: recipe.id }) },
        { label: 'Add to meal plan', onPress: () => navigation.navigate('AddToMealPlan', { recipeId: recipe.id }) },
        { label: 'Share', onPress: shareRecipe },
        { label: 'Share to Community', onPress: shareToJapCommunity },
        { label: 'Delete', onPress: confirmDelete, destructive: true },
      ],
    });
  }

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={248} radius={0} />
        <View style={styles.body}>
          <Skeleton width={120} height={12} />
          <Skeleton width="85%" height={26} style={{ marginTop: 12 }} />
          <Skeleton width="100%" height={64} radius={16} style={{ marginTop: 18 }} />
          <Skeleton width="100%" height={44} radius={999} style={{ marginTop: 18 }} />
          <Skeleton width="100%" height={16} style={{ marginTop: 22 }} />
          <Skeleton width="92%" height={16} style={{ marginTop: 12 }} />
          <Skeleton width="96%" height={16} style={{ marginTop: 12 }} />
        </View>
      </View>
    );
  }

  const totalMin = recipe.prepMinutes + recipe.cookMinutes;

  function displayIngredient(qty: string, ingUnit: string) {
    const scaled = scaleQuantity(qty, recipe!.servings, servings);
    const converted = convertUnits(scaled, ingUnit, unit);
    return `${converted.qty} ${converted.unit}`.trim();
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView contentContainerStyle={{ paddingBottom: 100 }} onScroll={onScroll} scrollEventThrottle={16}>
        {/* Hero photo — parallax + overscroll stretch */}
        <Animated.View style={[{ height: 248 }, heroStyle]}>
          {recipe.imageUri
            ? <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : (
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('RecipeEditor', { recipeId: recipe.id })}
              >
                <FoodPlaceholder variant={recipe.imageColor as any} style={StyleSheet.absoluteFill} />
                <View style={styles.addPhotoHint}>
                  <Icon name="camera" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.addPhotoTxt}>Add a cover photo</Text>
                </View>
              </TouchableOpacity>
            )}
        </Animated.View>

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
                <TouchableOpacity style={styles.stepBtn} onPress={() => bumpServings(-1)}>
                  <Icon name="minus" size={18} color={Colors.ink} />
                </TouchableOpacity>
                <Animated.Text style={[styles.stepVal, servingsStyle]}>{servings}</Animated.Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => bumpServings(1)}>
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
                <TouchableOpacity key={ing.id} style={styles.ingrRow} onPress={() => {
                  hapticLight();
                  setCheckedIngr(prev => {
                    const n = new Set(prev);
                    n.has(ing.id) ? n.delete(ing.id) : n.add(ing.id);
                    return n;
                  });
                }}>
                  <AnimatedCheck checked={checkedIngr.has(ing.id)} />
                  <Text style={[styles.ingrTxt, checkedIngr.has(ing.id) && styles.ingrDone]}>
                    <Text style={styles.ingrQty}>{displayIngredient(ing.quantity, ing.unit)}</Text>
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
          {tab === 'nutrition' && (
            recipe.nutrition ? (
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
            ) : (
              <View style={styles.nutritionCard}>
                <Text style={styles.noNutrition}>
                  No nutrition info for this recipe yet. AI-generated recipes include estimates automatically.
                </Text>
              </View>
            )
          )}

          {/* Notes */}
          {recipe.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesTxt}>"{recipe.notes}"</Text>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* Floating header controls — pinned while the hero parallaxes beneath */}
      <View style={[styles.heroOverlay, { top: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={20} color={Colors.ink} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          <TouchableOpacity
            style={[styles.iconBtn, recipe.isSaved && styles.iconBtnOn]}
            onPress={toggleSaved}
          >
            <Animated.View style={bookmarkStyle}>
              <Icon name="bookmark" size={20} color={recipe.isSaved ? '#fff' : Colors.ink} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
            <Icon name="more" size={20} color={Colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sticky Start Cooking CTA */}
      {recipe.steps.length > 0 && (
        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button
            label="Start Cooking"
            onPress={() => navigation.navigate('CookingMode', { recipeId })}
            leadingIcon={<Icon name="flame" size={18} color="#fff" />}
          />
        </View>
      )}

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
  heroOverlay: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.line,
  },
  iconBtnOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
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
  noNutrition: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, lineHeight: 20 },
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
    backgroundColor: Colors.glassPaper,
    borderTopWidth: 1, borderTopColor: Colors.line,
  },

  addPhotoHint: {
    position: 'absolute', bottom: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  addPhotoTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
});
