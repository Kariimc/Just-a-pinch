import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import { getRecipes } from '../../store/storage';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';
import Icon from '../../components/Icon';

const MEAL_FILTERS = ['All', 'Dinner', 'Breakfast', 'Baking', 'Quick', 'Veg'];

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [tab, setTab] = useState<'all' | 'saved' | 'created'>('all');
  const [filter, setFilter] = useState('All');

  useFocusEffect(useCallback(() => { getRecipes().then(setRecipes); }, []));

  const filtered = recipes.filter(r =>
    filter === 'All' || r.tags.some((t: string) => t.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <View style={styles.container}>
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
            <Text style={{ fontFamily: Fonts.uiBold, color: Colors.ink }}>{filtered.length}</Text>
            <Text style={{ fontFamily: Fonts.uiRegular }}> recipes</Text>
          </Text>
          <TouchableOpacity>
            <Text style={styles.sortTxt}>Recently added  ▾</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptySub}>Tap + to save your first recipe.</Text>
          </View>
        ) : mode === 'grid' ? (
          <View style={styles.grid}>
            {filtered.map(r => (
              <View key={r.id} style={{ width: '48%' }}>
                <RecipeCard recipe={r} onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })} variant="grid" />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.listPad}>
            {filtered.map(r => (
              <RecipeCard key={r.id} recipe={r} onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })} variant="list" />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper, paddingHorizontal: 22, paddingTop: 14 },
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
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  countTxt: { fontSize: 12.5, color: Colors.ink3 },
  sortTxt: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.ink2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 13, paddingBottom: 100 },
  listPad: { paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink },
  emptySub: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, marginTop: 8 },
});
