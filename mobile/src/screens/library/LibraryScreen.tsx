import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, LinearTransition } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts, Shadow } from '../../theme';
import { getRecipes, saveRecipe } from '../../store/storage';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';
import Icon from '../../components/Icon';
import { GridCardSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { showActionSheet } from '../../components/ActionSheet';
import { showToast } from '../../components/Toast';
import { fetchFoodPhotoFor } from '../../services/api';

const COACH_SEEN_KEY = '@jap_library_coach_seen';

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
  const [backfilling, setBackfilling] = useState(false);
  const [showCoach, setShowCoach] = useState(false);

  useFocusEffect(useCallback(() => {
    getRecipes().then(r => { setRecipes(r); setLoading(false); });
  }, []));

  // First visit only: a small popover that names the toolbar buttons — the
  // "Get photos" action especially isn't self-evident behind the ⋯ icon.
  useEffect(() => {
    AsyncStorage.getItem(COACH_SEEN_KEY).then(v => { if (!v) setShowCoach(true); });
  }, []);

  function dismissCoach() {
    setShowCoach(false);
    AsyncStorage.setItem(COACH_SEEN_KEY, '1').catch(() => {});
  }

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

  function openSortMenu() {
    showActionSheet({
      title: 'Sort recipes',
      actions: SORTS.map(s => ({
        // A leading check marks the current choice — the sheet has no built-in
        // selected state, so it rides in the label.
        label: `${sort === s.key ? '✓  ' : ''}${s.label}`,
        onPress: () => setSort(s.key),
      })),
    });
  }

  const sortLabel = SORTS.find(s => s.key === sort)?.label ?? '';

  // Back-fill cover photos for recipes saved without one (AI/manual/paste, or a
  // page with no extractable image) by pulling a stock dish photo per title.
  async function fillMissingPhotos() {
    const missing = recipes.filter(r => !r.imageUri);
    if (!missing.length) return;
    setBackfilling(true);
    showToast(`Finding photos for ${missing.length} recipe${missing.length === 1 ? '' : 's'}…`, 'sparkle');
    let added = 0;
    for (const r of missing) {
      const url = await fetchFoodPhotoFor(r.title, r.tags);
      if (url) { await saveRecipe({ ...r, imageUri: url }); added += 1; }
    }
    setRecipes(await getRecipes());
    setBackfilling(false);
    showToast(
      added ? `Added ${added} photo${added === 1 ? '' : 's'}` : 'No new photos found',
      added ? 'check' : 'info',
    );
  }

  function openMoreMenu() {
    const missingCount = recipes.filter(r => !r.imageUri).length;
    showActionSheet({
      title: 'My Recipes',
      actions: [{
        label: backfilling
          ? 'Finding photos…'
          : missingCount
            ? `Fill in ${missingCount} missing photo${missingCount === 1 ? '' : 's'}`
            : 'All recipes have photos',
        onPress: missingCount && !backfilling ? fillMissingPhotos : undefined,
      }],
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* App bar */}
      <View style={styles.header}>
        <Text style={styles.title}>My Recipes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn} accessibilityRole="button" hitSlop={8}
            accessibilityLabel="Search recipes and ingredients"
            onPress={() => navigation.navigate('Search')}
          >
            <Icon name="search" size={20} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, mode === 'list' && styles.iconBtnActive]} accessibilityRole="button" hitSlop={8}
            accessibilityLabel={mode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            onPress={() => setMode(m => m === 'grid' ? 'list' : 'grid')}
          >
            <Icon name={mode === 'grid' ? 'list' : 'grid'} size={20} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn} accessibilityRole="button" hitSlop={8}
            accessibilityLabel="Get photos and more options"
            onPress={openMoreMenu}
          >
            <Icon name="more" size={20} color={Colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* One-time coach popover naming the toolbar buttons */}
      {showCoach && (
        <>
          <Animated.View entering={FadeIn.duration(160)} style={styles.coachBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismissCoach} />
          </Animated.View>
          <Animated.View entering={FadeInDown.springify().damping(18)} style={[styles.coach, { top: insets.top + 52 }]}>
            <View style={styles.coachArrow} />
            <Text style={styles.coachTitle}>Quick tour</Text>
            <View style={styles.coachRow}>
              <View style={styles.coachIcon}><Icon name="search" size={15} color={Colors.accentDeep} /></View>
              <View style={styles.coachText}>
                <Text style={styles.coachLabel}>Search</Text>
                <Text style={styles.coachDesc}>Find any recipe or ingredient fast.</Text>
              </View>
            </View>
            <View style={styles.coachRow}>
              <View style={styles.coachIcon}><Icon name="grid" size={15} color={Colors.accentDeep} /></View>
              <View style={styles.coachText}>
                <Text style={styles.coachLabel}>View</Text>
                <Text style={styles.coachDesc}>Toggle between grid and list layouts.</Text>
              </View>
            </View>
            <View style={styles.coachRow}>
              <View style={styles.coachIcon}><Icon name="more" size={15} color={Colors.accentDeep} /></View>
              <View style={styles.coachText}>
                <Text style={styles.coachLabel}>Get photos</Text>
                <Text style={styles.coachDesc}>Auto-fill cover photos for recipes that are missing one.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.coachBtn} onPress={dismissCoach} activeOpacity={0.85}>
              <Text style={styles.coachBtnTxt}>Got it</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

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
              <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
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
          <TouchableOpacity onPress={openSortMenu} style={styles.sortBtn}>
            <Text style={styles.sortLead}>Sort:</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, position: 'relative', zIndex: 30 },
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
  sortLead: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3 },
  sortTxt: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.ink2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 13, paddingBottom: 100 },
  listPad: { paddingBottom: 100 },

  // First-visit coach popover
  coachBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,40,28,0.18)', zIndex: 40 },
  coach: {
    position: 'absolute', right: 22, width: 274, zIndex: 41,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.line,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    ...Shadow.cardSoft,
  },
  coachArrow: {
    position: 'absolute', top: -7, right: 18,
    width: 14, height: 14, backgroundColor: Colors.surface,
    borderLeftWidth: 1, borderTopWidth: 1, borderColor: Colors.line,
    transform: [{ rotate: '45deg' }],
  },
  coachTitle: {
    fontFamily: Fonts.uiBold, fontSize: 11, letterSpacing: 1.4,
    textTransform: 'uppercase', color: Colors.accentDeep, marginBottom: 10,
  },
  coachRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 11 },
  coachIcon: {
    width: 28, height: 28, borderRadius: 14, marginTop: 1,
    backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  coachText: { flex: 1 },
  coachLabel: { fontFamily: Fonts.uiBold, fontSize: 13.5, color: Colors.ink },
  coachDesc: { fontFamily: Fonts.uiRegular, fontSize: 12, color: Colors.ink2, lineHeight: 16, marginTop: 1 },
  coachBtn: {
    marginTop: 2, height: 38, borderRadius: Radius.md,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  coachBtnTxt: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.white },
});
