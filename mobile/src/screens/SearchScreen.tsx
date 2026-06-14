import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../types';
import { Colors, Radius, Fonts } from '../theme';
import { getRecipes } from '../store/storage';
import RecipeCard from '../components/RecipeCard';
import Chip from '../components/Chip';
import Icon from '../components/Icon';

const TAG_FILTERS = ['All', 'Dinner', 'Breakfast', 'Lunch', 'Quick', 'Vegetarian', 'Baking'];

function scoreRecipe(recipe: Recipe, query: string): number {
  const q = query.toLowerCase();
  let score = 0;
  if (recipe.title.toLowerCase().includes(q)) score += 10;
  if (recipe.description?.toLowerCase().includes(q)) score += 4;
  if (recipe.tags.some(t => t.toLowerCase().includes(q))) score += 6;
  if (recipe.ingredients.some(i => i.name.toLowerCase().includes(q))) score += 3;
  return score;
}

export default function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(route.params?.initialQuery ?? '');
  const [tagFilter, setTagFilter] = useState('All');
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [results, setResults] = useState<Recipe[]>([]);

  useFocusEffect(useCallback(() => {
    getRecipes().then(setAllRecipes);
  }, []));

  useEffect(() => {
    let filtered = allRecipes;

    if (tagFilter !== 'All') {
      filtered = filtered.filter(r =>
        r.tags.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))
      );
    }

    if (query.trim().length > 0) {
      filtered = filtered
        .map(r => ({ recipe: r, score: scoreRecipe(r, query.trim()) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.recipe);
    }

    setResults(filtered);
  }, [query, tagFilter, allRecipes]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="back" size={20} color={Colors.ink} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Search recipes & ingredients…"
          placeholderTextColor={Colors.ink3}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
            <Icon name="x" size={18} color={Colors.ink3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tag filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 18 }}>
        {TAG_FILTERS.map(f => (
          <Chip
            key={f}
            label={f}
            active={tagFilter === f}
            soft={tagFilter === f}
            onPress={() => setTagFilter(prev => prev === f ? 'All' : f)}
            style={{ marginRight: 8 }}
          />
        ))}
      </ScrollView>

      {/* Results */}
      {query.length === 0 && tagFilter === 'All' ? (
        <View style={styles.emptyState}>
          <Icon name="search" size={48} color={Colors.line2} />
          <Text style={styles.emptyTitle}>Search your recipes</Text>
          <Text style={styles.emptySub}>
            {allRecipes.length > 0
              ? `Search across ${allRecipes.length} saved recipes`
              : 'Save some recipes first using the + button'}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="plate" size={48} color={Colors.line2} />
          <Text style={styles.emptyTitle}>No matches</Text>
          <Text style={styles.emptySub}>Try a different search or import a new recipe.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {results.length} recipe{results.length !== 1 ? 's' : ''}
              {query.trim() ? ` for "${query.trim()}"` : ''}
            </Text>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(260).springify().damping(26).stiffness(240)}
            >
              <RecipeCard
                recipe={item}
                onPress={() => navigation.navigate('RecipeDetail', { recipeId: item.id })}
                variant="list"
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: Colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1, height: 44,
    backgroundColor: Colors.surface2, borderRadius: Radius.pill,
    paddingHorizontal: 16, fontFamily: Fonts.uiRegular, fontSize: 15.5, color: Colors.ink,
  },
  clearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  filterRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.line },
  listContent: { paddingHorizontal: 18, paddingBottom: 100 },
  resultCount: { fontFamily: Fonts.uiSemiBold, fontSize: 12.5, color: Colors.ink3, marginTop: 12, marginBottom: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80, gap: 16 },
  emptyTitle: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink },
  emptySub: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, textAlign: 'center', paddingHorizontal: 40 },
});
