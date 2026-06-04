import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import { getRecipes } from '../../store/storage';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';

const MEAL_FILTERS = ['All', 'Dinner', 'Breakfast', 'Baking', 'Quick', 'Veg'];

export default function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [tab, setTab] = useState<'all' | 'saved' | 'created'>('all');
  const [filter, setFilter] = useState('All');

  useFocusEffect(useCallback(() => {
    getRecipes().then(setRecipes);
  }, []));

  const filtered = recipes.filter(r => {
    if (filter !== 'All' && !r.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Recipes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconTxt}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, mode === 'list' && styles.iconBtnActive]} onPress={() => setMode(m => m === 'grid' ? 'list' : 'grid')}>
            <Text style={styles.iconTxt}>{mode === 'grid' ? '☰' : '⊞'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all','saved','created'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabTxt, tab === t && styles.tabActiveTxt]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'all' ? ` · ${recipes.length}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {MEAL_FILTERS.map(f => (
            <Chip key={f} label={f} soft={filter === f} active={filter === f} onPress={() => setFilter(f)} style={{ marginRight: 8 }} />
          ))}
        </ScrollView>

        <View style={styles.countRow}>
          <Text style={styles.countTxt}><Text style={{ color: Colors.ink, fontWeight: '700' }}>{filtered.length}</Text> recipes</Text>
          <Text style={styles.sortTxt}>Recently added ▾</Text>
        </View>

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '600', color: Colors.ink, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 9 },
  iconBtn: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: Colors.accentSoft, borderColor: 'transparent' },
  iconTxt: { fontSize: 18 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 4, gap: 2, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 7, borderRadius: Radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surface },
  tabTxt: { fontWeight: '600', fontSize: 13.5, color: Colors.ink2 },
  tabActiveTxt: { color: Colors.ink },
  filterRow: { marginBottom: 12 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  countTxt: { fontSize: 12.5, color: Colors.ink3 },
  sortTxt: { fontSize: 12.5, fontWeight: '700', color: Colors.ink2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 13, paddingBottom: 100 },
  listPad: { paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: Colors.ink },
  emptySub: { fontSize: 14, color: Colors.ink2, marginTop: 8 },
});
