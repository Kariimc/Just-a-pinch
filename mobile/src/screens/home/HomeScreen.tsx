import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts, Shadow } from '../../theme';
import { getRecipes, getProfile } from '../../store/storage';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Icon from '../../components/Icon';

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

  const recent = recipes.slice(0, 6);
  const dinner = recipes.filter(r => r.tags.includes('dinner')).slice(0, 4);
  const displayed = dinner.length ? dinner : recipes.slice(0, 4);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.accent} />}
    >
      {/* App bar */}
      <View style={styles.appbar}>
        <View>
          <Text style={styles.subGreet}>{greeting}</Text>
          <Text style={styles.nameGreet}>{userName}</Text>
        </View>
        <View style={styles.appbarActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="bell" size={20} color={Colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.avatarTxt}>{userName?.[0]?.toUpperCase() ?? 'M'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search field */}
      <TouchableOpacity style={styles.searchField} onPress={() => navigation.navigate('Search')}>
        <Icon name="search" size={18} color={Colors.ink3} />
        <Text style={styles.searchTxt}>Search recipes &amp; ingredients</Text>
      </TouchableOpacity>

      {/* Quick filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK_FILTERS.map(f => (
            <Chip
              key={f}
              label={f}
              soft={activeFilter === f}
              active={activeFilter === f}
              onPress={() => setActiveFilter(prev => prev === f ? '' : f)}
            />
          ))}
          <View style={{ width: 8 }} />
        </View>
      </ScrollView>

      {/* What's for dinner */}
      {recipes.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>What's for dinner?</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 13 }}>
              {displayed.map(r => (
                <View key={r.id} style={{ width: 215 }}>
                  <RecipeCard
                    recipe={r}
                    onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })}
                    variant="horizontal"
                  />
                </View>
              ))}
              <View style={{ width: 8 }} />
            </View>
          </ScrollView>
        </>
      )}

      {/* Cook with what you have — AI card */}
      <TouchableOpacity style={styles.aiCard} activeOpacity={0.8}>
        <View style={styles.aiIconWrap}>
          <Icon name="sparkle" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Cook with what you have</Text>
          <Text style={styles.aiSub}>
            {recipes.length > 0
              ? `${Math.min(recipes.length, 7)} recipes from your pantry tonight`
              : 'Add pantry items to get suggestions'}
          </Text>
        </View>
        <Icon name="fwd" size={20} color={Colors.accentDeep} />
      </TouchableOpacity>

      {/* Recently added */}
      {recent.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>Recently added</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Recipes')}>
              <Text style={styles.seeAll}>Library</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 13 }}>
              {recent.map(r => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  onPress={() => navigation.navigate('RecipeDetail', { recipeId: r.id })}
                  variant="small"
                />
              ))}
              <View style={{ width: 8 }} />
            </View>
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

      {/* Family shelf */}
      <Text style={[styles.secTitle, { marginTop: 24 }]}>From the family shelf</Text>
      <TouchableOpacity style={[styles.familyCard, Shadow.cardSoft]} activeOpacity={0.9}>
        <FoodPlaceholder variant="cream" style={StyleSheet.absoluteFillObject} />
        <View style={styles.familyOverlay}>
          <Text style={styles.familyTitle}>Nonna Lucia's Sundays</Text>
          <Text style={styles.familySub}>12 recipes · handed down</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 100 },
  appbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  appbarActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subGreet: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2 },
  nameGreet: { fontFamily: Fonts.displayMedium, fontSize: 30, letterSpacing: -0.3, color: Colors.ink },
  iconBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { fontFamily: Fonts.uiBold, color: '#fff', fontSize: 16 },
  searchField: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50,
    paddingHorizontal: 16, backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
  },
  searchTxt: { fontFamily: Fonts.uiRegular, fontSize: 15, color: Colors.ink3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22 },
  secTitle: { fontFamily: Fonts.uiBold, fontSize: 19, letterSpacing: -0.2, color: Colors.ink },
  seeAll: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.accentDeep },
  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 22,
    padding: 16,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radius.lg,
  },
  aiIconWrap: {
    width: 48, height: 48, borderRadius: Radius.sm,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  aiTitle: { fontFamily: Fonts.uiBold, fontSize: 15.5, color: Colors.ink },
  aiSub: { fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink2, marginTop: 2 },
  emptyState: { alignItems: 'center', marginTop: 40, padding: 20 },
  emptyTitle: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink },
  emptySub: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, marginTop: 8, textAlign: 'center' },
  familyCard: { marginTop: 12, borderRadius: Radius.lg, overflow: 'hidden', height: 150 },
  familyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,14,6,0.65)',
    justifyContent: 'flex-end', padding: 16,
  },
  familyTitle: { fontFamily: Fonts.displayMedium, fontSize: 22, color: '#fff' },
  familySub: { fontFamily: Fonts.uiRegular, fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
});
