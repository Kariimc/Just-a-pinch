import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import { getRecipes } from '../../store/storage';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';
import Icon from '../../components/Icon';
import { GridCardSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

const MEAL_FILTERS = ['All', 'Quick & Easy', 'Vegetarian', 'Breakfast', 'Brunch', 'Dinner', 'Snacks', 'Desserts', 'Baking', 'Comfort'];

function matchesFilter(recipe: Recipe, filter: string): boolean {
  if (filter === 'All') return true;
  const lf = filter.toLowerCase();
  return recipe.tags.some(t => {
    const lt = t.toLowerCase();
    if (lf === 'quick & easy') return lt.includes('quick') || lt.includes('easy');
    if (lf === 'vegetarian') return lt.includes('veg') || lt.includes('vegetarian');
    return lt.includes(lf);
  });
}

type SortKey = 'recent' | 'alpha' | 'time';
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'recent', label: 'Recently added' },
  { key: 'alpha', label: 'A – Z' },
  { key: 'time', label: 'Quickest first' },
];

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [tab, setTab] = useState<'all' | 'saved' | 'created'>('all');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState<SortKey>('recent');

  useFocusEffect(useCallback(() => {
    getRecipes().then(r => { setRecipes(r); setLoading(false); });
  }, []));

  const byTab = recipes.filter(r => {
    if (tab === 'saved') return !!r.sourceUrl;
    if (tab === 'created') return !r.sourceUrl;
    return true;
  });

  const filtered = byTab.filter(r => matchesFilter(r, filter));

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'alpha') return a.title.localeCompare(b.title);
    if (sort === 'time') return (a.prepMinutes + a.cookMinutes) - (b.prepMinutes + b.cookMinutes);
    return b.savedAt - a.savedAt;
  });

  function cycleSort() {
    const idx = SORTS.findIndex(s => s.key === sort);
    setSort(SORTS[(idx + 1) % SORTS.length].key);
  }

  const sortLabel = SORTS.find(s => s.key === sort)?.label ?? '';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* App bar */}
      <View style={styles.header}>
        <Text style={styles.title}>My Recipes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
            <Icon name="search" size={20} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, mode === 'list' && styles.iconBtnActive]}
            onPress={() => setMode(m => m === 'grid' ? 'list' : 'grid')}
          >
            <Icon name={mode === 'grid' ? 'list' : 'grid'} size={20} color={Colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented tabs: All / Saved / Created */}
      <View style={styles.tabs}>
        {(['all', 'saved', 'created'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTxt, tab === t && styles.tabActiveTxt]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'all' ? ` · ${recipes.length}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {MEAL_FILTERS.map(f => (
              <Chip key={f} label={f} soft={filter === f} active={filter === f} onPress={() => setFilter(f)} />
            ))}
            <View style={{ width: 8 }} />
          </View>
        </ScrollView>

        {/* Count + sort */}
        <View style={styles.countRow}>
          <Text style={styles.countTxt}>
            <Text style={{ fontFamily: Fonts.uiBold, color: Colors.ink }}>{sorted.length}</Text>
            <Text style={{ fontFamily: Fonts.uiRegular }}> recipe{sorted.length === 1 ? '' : 's'}</Text>
          </Text>
          <TouchableOpacity onPress={cycleSort} style={styles.sortBtn}>
            <Text style={styles.sortTxt}>{sortLabel}</Text>
            <Icon name="down" size={13} color={Colors.ink2} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && recipes.length === 0 ? (
          <View style={styles.grid}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ width: '48%' }}><GridCardSkeleton /></View>
            ))}
          </View>
        ) : sorted.length === 0 ? (
          recipes.length === 0 ? (
            <EmptyState
              icon="book"
              title="No recipes yet"
              message="Everything you save or create lives here — searchable, scalable, and ready to cook."
              ctaLabel="Add a recipe"
              onPress={() => navigation.navigate('AddMenu')}
            />
          ) : (
            <EmptyState
              icon="filter"
              title="Nothing matches"
              message="No recipes match this tab and filter combination. Try a different filter."
            />
          )
        ) : mode === 'grid' ? (
          <View style={styles.grid}>
            {sorted.map((r, i) => (
              <Animated.View
                key={r.id}
                style={{ width: '48%' }}
                entering={FadeInDown.delay(Math.min(i, 8) * 40).springify().damping(26).stiffness(240)}
                layout={LinearTransition.springify().damping(26).stiffness(240)}
              >
                <RecipeCard recipe={r} onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })} variant="grid" />
              </Animated.View>
            ))}
          </View>
        ) : (
          <View style={styles.listPad}>
            {sorted.map((r, i) => (
              <Animated.View
                key={r.id}
                entering={FadeInDown.delay(Math.min(i, 8) * 40).springify().damping(26).stiffness(240)}
                layout={LinearTransition.springify().damping(26).stiffness(240)}
              >
                <RecipeCard recipe={r} onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })} variant="list" />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  title: { fontFamily: Fonts.displayMedium, fontSize: 30, letterSpacing: -0.3, color: Colors.ink },
  headerActions: { flexDirection: 'row', gap: 9 },
  iconBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: Colors.accentSoft, borderColor: 'transparent' },
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderRadius: Radius.pill, padding: 4, gap: 2, marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: Radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surface },
  tabTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink2 },
  tabActiveTxt: { color: Colors.ink },
  filterRow: { marginBottom: 12 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  countTxt: { fontSize: 12.5, color: Colors.ink3 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  sortTxt: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.ink2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 13, paddingBottom: 100 },
  listPad: { paddingBottom: 100 },
});
