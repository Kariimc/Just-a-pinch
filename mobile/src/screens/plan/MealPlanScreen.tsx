import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MealPlanEntry, Recipe, ShoppingItem } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import {
  getMealPlan, getRecipes, deleteMealEntry, saveMealEntry,
  getShoppingItems, saveShoppingItems, getProfile,
} from '../../store/storage';
import { dateKey, weekDays, dayLabel, uid, formatTime } from '../../utils/id';
import { parseQuantity, formatQuantity, categorizeIngredient } from '../../utils/units';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import BottomSheet from '../../components/BottomSheet';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { showActionSheet } from '../../components/ActionSheet';
import { hapticLight, hapticSuccess } from '../../lib/haptics';

const MEAL_TYPES: MealPlanEntry['mealType'][] = ['breakfast', 'lunch', 'dinner'];

export default function MealPlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddToMealPlan'>>();
  const insets = useSafeAreaInsets();
  const presetRecipeId = route.name === 'AddToMealPlan' ? route.params?.recipeId : undefined;

  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [defaultServings, setDefaultServings] = useState(2);
  const [confirmingAdd, setConfirmingAdd] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [generatingList, setGeneratingList] = useState(false);

  // Picker sheet state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMeal, setPickerMeal] = useState<MealPlanEntry['mealType']>('dinner');
  const [pickerRecipe, setPickerRecipe] = useState<Recipe | null>(null);
  const [pickerServings, setPickerServings] = useState(2);
  const [pickerDay, setPickerDay] = useState(new Date());

  const today = new Date();
  const [weekStart, setWeekStart] = useState(today);
  const days = weekDays(weekStart);

  function shiftWeek(delta: number) {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
    setSelectedDay(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  async function load() {
    try {
      const [e, r, p] = await Promise.all([getMealPlan(), getRecipes(), getProfile()]);
      setEntries(e);
      setRecipes(r);
      if (p?.householdSize) setDefaultServings(p.householdSize);
    } catch {
      showToast('Could not load your meal plan', 'wifi');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  // Arriving via "Add to plan" from a recipe: open the picker for that recipe.
  useEffect(() => {
    if (!presetRecipeId || recipes.length === 0) return;
    const r = recipes.find(x => x.id === presetRecipeId);
    if (r) {
      setPickerRecipe(r);
      setPickerServings(r.servings);
      setPickerDay(new Date());
      setPickerMeal('dinner');
      setPickerVisible(true);
    }
  }, [presetRecipeId, recipes.length]);

  function getRecipe(id: string) {
    return recipes.find(r => r.id === id);
  }

  function getDayEntries(d: Date) {
    const key = dateKey(d);
    return entries.filter(e => e.date === key);
  }

  function openPickerForSlot(mealType: MealPlanEntry['mealType']) {
    setPickerMeal(mealType);
    setPickerRecipe(null);
    setPickerServings(defaultServings);
    setPickerDay(selectedDay);
    setPickerVisible(true);
  }

  // The ⋮ on a planned meal (and a long-press anywhere on the card).
  function openEntryMenu(entry: MealPlanEntry, recipe: Recipe) {
    hapticLight();
    showActionSheet({
      title: recipe.title,
      actions: [
        { label: 'View recipe', onPress: () => navigation.navigate('RecipeDetail', { recipeId: recipe.id }) },
        {
          label: `Remove from ${entry.mealType}`,
          destructive: true,
          onPress: async () => {
            await deleteMealEntry(entry.id);
            await load();
            showToast('Removed from plan', 'trash');
          },
        },
      ],
    });
  }

  async function confirmAdd() {
    if (!pickerRecipe || confirmingAdd) return;
    setConfirmingAdd(true);
    try {
      const entry: MealPlanEntry = {
        id: uid(),
        recipeId: pickerRecipe.id,
        date: dateKey(pickerDay),
        mealType: pickerMeal,
        servings: pickerServings,
      };
      await saveMealEntry(entry);
      hapticSuccess();
      setPickerVisible(false);
      setPickerRecipe(null);
      await load();
      showToast(`${pickerRecipe.title} planned for ${pickerMeal}`);
      if (presetRecipeId) navigation.goBack();
    } finally {
      setConfirmingAdd(false);
    }
  }

  async function autoFillWeek() {
    if (autoFilling) return;
    const pool = recipes.length ? recipes : [];
    if (!pool.length) { showToast('Add some recipes first', 'info'); return; }
    setAutoFilling(true);
    try {
      const dinnerPool = pool.filter(r => r.tags.includes('dinner'));
      const usable = dinnerPool.length >= 3 ? dinnerPool : pool;
      let added = 0;
      for (const d of days) {
        const key = dateKey(d);
        const hasDinner = entries.some(e => e.date === key && e.mealType === 'dinner');
        if (hasDinner) continue;
        const pick = usable[Math.floor(Math.random() * usable.length)];
        await saveMealEntry({
          id: uid(), recipeId: pick.id, date: key, mealType: 'dinner', servings: defaultServings,
        });
        added++;
      }
      await load();
      hapticSuccess();
      showToast(added ? `Planned ${added} dinner${added === 1 ? '' : 's'} this week` : 'Week is already full');
    } finally {
      setAutoFilling(false);
    }
  }

  async function generateShoppingList() {
    if (generatingList) return;
    const weekKeys = new Set(days.map(dateKey));
    const weekEntries = entries.filter(e => weekKeys.has(e.date));
    if (!weekEntries.length) { showToast('Nothing planned this week yet', 'info'); return; }

    setGeneratingList(true);
    try {
      const existing = await getShoppingItems();
      const merged = new Map<string, ShoppingItem>();

      for (const entry of weekEntries) {
        const recipe = getRecipe(entry.recipeId);
        if (!recipe) continue;
        for (const ing of recipe.ingredients) {
          const scale = recipe.servings > 0 ? entry.servings / recipe.servings : 1;
          const amount = parseQuantity(ing.quantity);
          const mapKey = `${ing.name.trim().toLowerCase()}|${ing.unit.trim().toLowerCase()}`;
          const prev = merged.get(mapKey);
          if (prev) {
            const prevAmount = parseQuantity(prev.quantity);
            if (prevAmount !== null && amount !== null) {
              prev.quantity = formatQuantity(prevAmount + amount * scale);
            }
            if (!prev.recipeIds?.includes(recipe.id)) prev.recipeIds?.push(recipe.id);
          } else {
            merged.set(mapKey, {
              id: uid(),
              name: ing.name,
              quantity: amount !== null ? formatQuantity(amount * scale) : ing.quantity,
              unit: ing.unit,
              category: categorizeIngredient(ing.name),
              checked: false,
              recipeIds: [recipe.id],
            });
          }
        }
      }

      const newItems = [...merged.values()];
      await saveShoppingItems([...existing, ...newItems]);
      hapticSuccess();
      showToast(`${newItems.length} ingredients added to your list`, 'cart');
    } finally {
      setGeneratingList(false);
    }
  }

  const label = selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const selectedKey = dateKey(selectedDay);
  const todayKey = dateKey(today);
  const pickerDayKey = dateKey(pickerDay);

  const weekStartKey = dateKey(weekStart);
  const currentWeekStartKey = dateKey(today);
  const isCurrentWeek = weekStartKey === currentWeekStartKey;
  const weekLabel = isCurrentWeek
    ? 'This week'
    : days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {presetRecipeId != null && (
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Icon name="back" size={20} color={Colors.ink} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.subTxt}>{weekLabel}</Text>
            <Text style={styles.title}>
              {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => shiftWeek(-1)}>
            <Icon name="back" size={18} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => shiftWeek(1)}>
            <Icon name="fwd" size={18} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={generateShoppingList} disabled={generatingList}>
            <Icon name="cart" size={20} color={Colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day strip */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip}>
          {days.map(d => {
            const k = dateKey(d);
            const isToday = k === todayKey;
            const isSelected = k === dateKey(selectedDay);
            const hasMeals = getDayEntries(d).length > 0;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.dayPill, isToday && styles.dayPillToday, isSelected && !isToday && styles.dayPillSelected]}
                onPress={() => { hapticLight(); setSelectedDay(d); }}
              >
                <Text style={[styles.dayLabel, isToday && styles.dayLabelLight]}>{dayLabel(d)}</Text>
                <Text style={[styles.dayNum, isToday && styles.dayLabelLight]}>{d.getDate()}</Text>
                {hasMeals && <View style={[styles.dot, isToday && styles.dotWhite]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{label}</Text>
          <TouchableOpacity onPress={autoFillWeek} disabled={autoFilling}>
            <Text style={styles.autoFill}>Auto-fill week</Text>
          </TouchableOpacity>
        </View>

        {MEAL_TYPES.map(mealType => {
          const entry = entries.find(e => e.date === selectedKey && e.mealType === mealType);
          const recipe = entry ? getRecipe(entry.recipeId) : null;
          return (
            <View key={mealType}>
              <Text style={styles.mealLabel}>{mealType.toUpperCase()}</Text>
              {recipe ? (
                <TouchableOpacity
                  style={styles.mealCard}
                  onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
                  onLongPress={() => openEntryMenu(entry!, recipe)}
                >
                  {recipe.imageUri
                    ? <Image source={{ uri: recipe.imageUri }} style={styles.mealThumb} />
                    : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.mealThumb} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealTitle} numberOfLines={1}>{recipe.title}</Text>
                    <Text style={styles.mealSub}>{formatTime(recipe.prepMinutes + recipe.cookMinutes)} · serves {entry?.servings}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openEntryMenu(entry!, recipe)} hitSlop={12}>
                    <Icon name="moreV" size={20} color={Colors.ink3} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptySlot} onPress={() => openPickerForSlot(mealType)}>
                  <Text style={styles.emptySlotTxt}>+ Add {mealType}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Only after loading — otherwise the CTA flashes during the fetch
            and vanishes once recipes arrive. */}
        {!loading && recipes.length === 0 && (
          <EmptyState
            icon="calendar"
            title="Plan your week"
            message="Save a few recipes first, then drop them into breakfast, lunch, and dinner slots."
            ctaLabel="Add a recipe"
            onPress={() => navigation.navigate('AddMenu')}
            style={{ paddingVertical: 24 }}
          />
        )}
      </ScrollView>

      {/* Add-to-plan sheet */}
      <BottomSheet visible={pickerVisible} onClose={() => { setPickerVisible(false); if (presetRecipeId) navigation.goBack(); }}>
        {pickerRecipe ? (
          <>
            <Text style={styles.sheetTitle}>Add to plan</Text>
            <View style={styles.sheetRecipeRow}>
              {pickerRecipe.imageUri
                ? <Image source={{ uri: pickerRecipe.imageUri }} style={styles.mealThumb} />
                : <FoodPlaceholder variant={pickerRecipe.imageColor as any} style={styles.mealThumb} />}
              <Text style={styles.sheetRecipeTitle} numberOfLines={2}>{pickerRecipe.title}</Text>
            </View>

            <Text style={styles.sheetLabel}>DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {days.map(d => {
                  const k = dateKey(d);
                  const on = k === pickerDayKey;
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.sheetDayPill, on && styles.sheetDayPillOn]}
                      onPress={() => setPickerDay(d)}
                    >
                      <Text style={[styles.sheetDayTxt, on && styles.sheetDayTxtOn]}>{dayLabel(d)} {d.getDate()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Text style={styles.sheetLabel}>MEAL</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {MEAL_TYPES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.sheetDayPill, pickerMeal === m && styles.sheetDayPillOn]}
                  onPress={() => setPickerMeal(m)}
                >
                  <Text style={[styles.sheetDayTxt, pickerMeal === m && styles.sheetDayTxtOn]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetServingsRow}>
              <Text style={styles.sheetServingsLabel}>Servings</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setPickerServings(s => Math.max(1, s - 1))}>
                  <Icon name="minus" size={16} color={Colors.ink} />
                </TouchableOpacity>
                <Text style={styles.stepVal}>{pickerServings}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setPickerServings(s => s + 1)}>
                  <Icon name="plus" size={16} color={Colors.ink} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirmAdd} disabled={confirmingAdd}>
              <Text style={styles.confirmTxt}>Add to {pickerMeal}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sheetTitle}>
              Pick a recipe for {pickerMeal} · {dayLabel(pickerDay)} {pickerDay.getDate()}
            </Text>
            {recipes.length === 0 ? (
              <Text style={styles.sheetEmpty}>No recipes in your library yet.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 380 }}>
                {recipes.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.pickRow}
                    onPress={() => { setPickerRecipe(r); setPickerServings(defaultServings); }}
                  >
                    {r.imageUri
                      ? <Image source={{ uri: r.imageUri }} style={styles.pickThumb} />
                      : <FoodPlaceholder variant={r.imageColor as any} style={styles.pickThumb} />}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealTitle} numberOfLines={1}>{r.title}</Text>
                      <Text style={styles.mealSub}>{formatTime(r.prepMinutes + r.cookMinutes)} · serves {r.servings}</Text>
                    </View>
                    <Icon name="fwd" size={18} color={Colors.ink3} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  subTxt: { fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2 },
  title: { fontFamily: Fonts.displayMedium, fontSize: 30, letterSpacing: -0.3, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 9 },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  dayStrip: { marginBottom: 18, flexGrow: 0 },
  dayPill: { width: 46, height: 68, borderRadius: Radius.md, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dayPillToday: { backgroundColor: Colors.accent },
  dayPillSelected: { backgroundColor: Colors.accentSoft, borderWidth: 1, borderColor: Colors.accentDeep },
  dayLabel: { fontFamily: Fonts.uiBold, fontSize: 11, color: Colors.ink2 },
  dayNum: { fontFamily: Fonts.uiSemiBold, fontSize: 19, color: Colors.ink },
  dayLabelLight: { color: '#fff' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 2 },
  dotWhite: { backgroundColor: '#fff' },
  content: { paddingBottom: 100 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  dayTitle: { fontFamily: Fonts.uiBold, fontSize: 19, color: Colors.ink },
  autoFill: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.accentDeep },
  mealLabel: { fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 0.04, color: Colors.ink3, marginTop: 16, marginBottom: 7 },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line },
  mealThumb: { width: 50, height: 50, borderRadius: Radius.sm },
  mealTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 14.5, color: Colors.ink },
  mealSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3, marginTop: 1 },
  emptySlot: { height: 56, borderWidth: 1.5, borderColor: Colors.line2, borderStyle: 'dashed', borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  emptySlotTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink3 },

  // Sheet
  sheetTitle: { fontFamily: Fonts.uiBold, fontSize: 18, color: Colors.ink, marginBottom: 12 },
  sheetRecipeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  sheetRecipeTitle: { fontFamily: Fonts.displayMedium, fontSize: 18, color: Colors.ink, flex: 1 },
  sheetLabel: { fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 0.6, color: Colors.ink3, marginTop: 16, marginBottom: 8 },
  sheetDayPill: { paddingHorizontal: 14, height: 38, borderRadius: Radius.pill, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  sheetDayPillOn: { backgroundColor: Colors.accent },
  sheetDayTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.ink2 },
  sheetDayTxtOn: { color: '#fff' },
  sheetServingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  sheetServingsLabel: { fontFamily: Fonts.uiBold, fontSize: 14.5, color: Colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.line2, borderRadius: Radius.pill, overflow: 'hidden' },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepVal: { fontFamily: Fonts.uiBold, minWidth: 42, textAlign: 'center', fontSize: 15, color: Colors.ink },
  confirmBtn: { marginTop: 20, height: 52, backgroundColor: Colors.accent, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: '#fff' },
  sheetEmpty: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, paddingVertical: 16 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.line },
  pickThumb: { width: 44, height: 44, borderRadius: Radius.sm },
});
