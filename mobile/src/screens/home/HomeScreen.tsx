import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import { getRecipes, getProfile } from '../../store/storage';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';
import FoodPlaceholder from '../../components/FoodPlaceholder';

const QUICK_FILTERS = ['Quick & Easy', 'Vegetarian', '5 Ingredients', 'Family favorites', 'Comfort'];

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userName, setUserName] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [r, p] = await Promise.all([getRecipes(), getProfile()]);
    setRecipes(r);
    setUserName(p?.name?.split(' ')[0] ?? 'Chef');
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  const filtered = activeFilter
    ? recipes.filter(r => r.tags.some(t => t.toLowerCase().includes(activeFilter.toLowerCase())))
    : recipes;

  const recent = recipes.slice(0, 6);
  const dinner = recipes.filter(r => r.tags.includes('dinner')).slice(0, 4);
  const displayed = dinner.length ? dinner : recipes.slice(0, 4);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      {/* Appbar */}
      <View style={styles.appbar}>
        <View>
          <Text style={styles.subGreet}>{greeting}</Text>
          <Text style={styles.nameGreet}>{userName}</Text>
        </View>
        <TouchableOpacity onPress={() => (navigation as any).navigate('Profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{userName?.[0] ?? 'M'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')}>
        <Text style={styles.searchTxt}>🔍  Search recipes & ingredients</Text>
      </TouchableOpacity>

      {/* Quick filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
        {QUICK_FILTERS.map(f => (
          <Chip
            key={f}
            label={f}
            soft={activeFilter === f}
            active={activeFilter === f}
            onPress={() => setActiveFilter(prev => prev === f ? '' : f)}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>

      {/* What's for dinner */}
      {recipes.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>What's for dinner?</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {displayed.map(r => (
              <View key={r.id} style={{ width: 215, marginRight: 13 }}>
                <RecipeCard recipe={r} onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })} variant="horizontal" />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Cook with what you have */}
      <TouchableOpacity style={styles.aiCard}>
        <View style={styles.aiIcon}><Text style={{ fontSize: 22 }}>✨</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Cook with what you have</Text>
          <Text style={styles.aiSub}>{recipes.length > 0 ? `${Math.min(recipes.length, 7)} recipes from your pantry tonight` : 'Add pantry items to get suggestions'}</Text>
        </View>
        <Text style={{ color: Colors.accentDeep, fontSize: 16 }}>›</Text>
      </TouchableOpacity>

      {/* Recently added */}
      {recent.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>Recently added</Text>
            <Text style={styles.seeAll}>Library</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {recent.map(r => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })}
                variant="horizontal"
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Empty state */}
      {recipes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your kitchen awaits</Text>
          <Text style={styles.emptySub}>Import your first recipe using the + button below.</Text>
        </View>
      )}

      {/* Family shelf teaser */}
      <View style={styles.familyCard}>
        <FoodPlaceholder variant="cream" style={styles.familyImg} />
        <View style={styles.familyOverlay}>
          <Text style={styles.familyTitle}>Nonna Lucia's Sundays</Text>
          <Text style={styles.familySub}>12 recipes · handed down</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 22, paddingTop: 14, paddingBottom: 100 },
  appbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  subGreet: { fontSize: 14, color: Colors.ink2 },
  nameGreet: { fontSize: 28, fontWeight: '600', color: Colors.ink, letterSpacing: -0.3 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 16, backgroundColor: Colors.surface2, borderRadius: Radius.md },
  searchTxt: { color: Colors.ink3, fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22 },
  secTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink, letterSpacing: -0.2 },
  seeAll: { fontSize: 12.5, fontWeight: '700', color: Colors.accentDeep },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22, padding: 16, backgroundColor: Colors.accentSoft, borderRadius: Radius.lg },
  aiIcon: { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontWeight: '700', fontSize: 15.5, color: Colors.ink },
  aiSub: { fontSize: 13, color: Colors.ink2, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 40, padding: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '600', color: Colors.ink },
  emptySub: { fontSize: 14, color: Colors.ink2, marginTop: 8, textAlign: 'center' },
  familyCard: { marginTop: 22, borderRadius: Radius.lg, overflow: 'hidden', height: 150 },
  familyImg: { width: '100%', height: '100%' },
  familyOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,14,6,0.65)', justifyContent: 'flex-end', padding: 16 },
  familyTitle: { fontSize: 22, fontWeight: '600', color: '#fff' },
  familySub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
});
