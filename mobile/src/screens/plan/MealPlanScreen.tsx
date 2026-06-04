import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MealPlanEntry, Recipe } from '../../types';
import { Colors, Radius } from '../../theme';
import { getMealPlan, getRecipes, deleteMealEntry } from '../../store/storage';
import { dateKey, weekDays, dayLabel } from '../../utils/id';
import FoodPlaceholder from '../../components/FoodPlaceholder';

const MEAL_TYPES: MealPlanEntry['mealType'][] = ['breakfast', 'lunch', 'dinner'];

export default function MealPlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const today = new Date();
  const days = weekDays(today);

  useFocusEffect(useCallback(() => {
    Promise.all([getMealPlan(), getRecipes()]).then(([e, r]) => {
      setEntries(e); setRecipes(r);
    });
  }, []));

  function getRecipe(id: string) {
    return recipes.find(r => r.id === id);
  }

  function getDayEntries(d: Date) {
    const key = dateKey(d);
    return entries.filter(e => e.date === key);
  }

  const label = selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const selectedKey = dateKey(selectedDay);
  const todayKey = dateKey(today);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.subTxt}>This week</Text>
          <Text style={styles.title}>{today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconTxt}>🛒</Text></TouchableOpacity>
        </View>
      </View>

      {/* Day strip */}
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
              onPress={() => setSelectedDay(d)}
            >
              <Text style={[styles.dayLabel, (isToday || isSelected) && styles.dayLabelLight]}>{dayLabel(d)}</Text>
              <Text style={[styles.dayNum, (isToday || isSelected) && styles.dayLabelLight]}>{d.getDate()}</Text>
              {hasMeals && <View style={[styles.dot, isToday && styles.dotWhite]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{label}</Text>
          <TouchableOpacity><Text style={styles.autoFill}>Auto-fill week</Text></TouchableOpacity>
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
                  onLongPress={() => {
                    Alert.alert('Remove', `Remove ${recipe.title} from ${mealType}?`, [
                      { text: 'Cancel' },
                      { text: 'Remove', style: 'destructive', onPress: async () => {
                        await deleteMealEntry(entry!.id);
                        const e = await getMealPlan();
                        setEntries(e);
                      }},
                    ]);
                  }}
                >
                  {recipe.imageUri
                    ? <Image source={{ uri: recipe.imageUri }} style={styles.mealThumb} />
                    : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.mealThumb} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealTitle} numberOfLines={1}>{recipe.title}</Text>
                    <Text style={styles.mealSub}>{recipe.prepMinutes + recipe.cookMinutes} min · serves {entry?.servings}</Text>
                  </View>
                  <Text style={{ color: Colors.ink3, fontSize: 16 }}>⋮</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptySlot} onPress={() => navigation.navigate('AddToMealPlan', { recipeId: '' })}>
                  <Text style={styles.emptySlotTxt}>+ Add {mealType}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, paddingHorizontal: 22, paddingTop: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  subTxt: { fontSize: 13.5, color: Colors.ink2 },
  title: { fontSize: 28, fontWeight: '600', color: Colors.ink, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 9 },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 18 },
  dayStrip: { marginBottom: 18 },
  dayPill: { width: 46, height: 68, borderRadius: Radius.md, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  dayPillToday: { backgroundColor: Colors.accent },
  dayPillSelected: { backgroundColor: Colors.accentSoft, borderWidth: 1, borderColor: Colors.accentDeep },
  dayLabel: { fontSize: 11, fontWeight: '700', color: Colors.ink2 },
  dayNum: { fontSize: 19, fontWeight: '600', color: Colors.ink },
  dayLabelLight: { color: '#fff' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 2 },
  dotWhite: { backgroundColor: '#fff' },
  content: { paddingBottom: 100 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  dayTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink },
  autoFill: { fontSize: 12.5, fontWeight: '700', color: Colors.accentDeep },
  mealLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.04, color: Colors.ink3, marginTop: 16, marginBottom: 7 },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line },
  mealThumb: { width: 50, height: 50, borderRadius: Radius.sm },
  mealTitle: { fontWeight: '600', fontSize: 14.5, color: Colors.ink },
  mealSub: { fontSize: 12.5, color: Colors.ink3, marginTop: 1 },
  emptySlot: { height: 56, borderWidth: 1.5, borderColor: Colors.line2, borderStyle: 'dashed', borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  emptySlotTxt: { fontSize: 13.5, fontWeight: '600', color: Colors.ink3 },
});
