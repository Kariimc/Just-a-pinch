import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ListRenderItemInfo, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Fonts, FoodColors, Radius, Shadow } from '../../theme';
import {
  CommunityRecipe,
  getTopWeekRecipes,
  getAllRecipes,
  rateRecipe,
  getMyRatings,
} from '../../lib/community';
import { saveRecipe } from '../../store/storage';
import { showToast } from '../../components/Toast';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Icon from '../../components/Icon';
import Tappable from '../../components/Tappable';
import EmptyState from '../../components/EmptyState';
import { uid } from '../../utils/id';

type Props = NativeStackScreenProps<RootStackParamList, 'Community'>;
type Tab = 'week' | 'all';

const FOOD_VARIANTS = Object.keys(FoodColors) as Array<keyof typeof FoodColors>;

function foodVariant(id: string): keyof typeof FoodColors {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return FOOD_VARIANTS[hash % FOOD_VARIANTS.length];
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function StarRow({
  avg,
  count,
  myRating,
  onRate,
}: {
  avg: number;
  count: number;
  myRating?: number;
  onRate: (stars: number) => void;
}) {
  const filled = myRating ?? Math.round(avg);
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => onRate(s)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[starStyles.star, { color: s <= filled ? '#F5A623' : Colors.line2 }]}>
            {s <= filled ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={starStyles.label}>
        {avg > 0 ? avg.toFixed(1) : ''}{count > 0 ? ` (${count})` : myRating ? '' : ' · Tap to rate'}
      </Text>
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  star: { fontSize: 15 },
  label: { fontFamily: Fonts.uiRegular, fontSize: 11, color: Colors.ink3, marginLeft: 3 },
});

interface CardProps {
  item: CommunityRecipe;
  myRating?: number;
  onRate: (id: string, stars: number) => void;
  onSave: (item: CommunityRecipe) => void;
}

function CommunityCard({ item, myRating, onRate, onSave }: CardProps) {
  return (
    <View style={[styles.card, Shadow.card]}>
      <FoodPlaceholder variant={foodVariant(item.id)} style={styles.thumb} />
      <View style={styles.body}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{item.recipe.title}</Text>
        <Text style={styles.byLine} numberOfLines={1}>
          by {item.authorName} · {timeAgo(item.sharedAt)}
        </Text>
        <StarRow
          avg={item.avgRating}
          count={item.ratingCount}
          myRating={myRating}
          onRate={stars => onRate(item.id, stars)}
        />
        <Tappable style={styles.saveBtn} scaleTo={0.92} haptic onPress={() => onSave(item)}>
          <Icon name="bookmark" size={12} color={Colors.accentDeep} />
          <Text style={styles.saveBtnText}>Save to Library</Text>
        </Tappable>
      </View>
    </View>
  );
}

export default function CommunityScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('week');
  const [weekItems, setWeekItems] = useState<CommunityRecipe[]>([]);
  const [allItems, setAllItems] = useState<CommunityRecipe[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);

  const items: CommunityRecipe[] = tab === 'week' ? weekItems : allItems;

  async function loadInitial() {
    setLoading(true);
    try {
      const [week, all] = await Promise.all([getTopWeekRecipes(), getAllRecipes(0)]);
      setWeekItems(week);
      setAllItems(all);
      pageRef.current = 0;
      hasMoreRef.current = all.length === 20;
      const ids = [...new Set([...week, ...all].map(r => r.id))];
      const ratings = await getMyRatings(ids);
      setMyRatings(ratings);
    } catch {
      showToast('Could not load community recipes', 'wifi');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { loadInitial(); }, []));

  async function loadMore() {
    if (tab !== 'all' || loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    try {
      pageRef.current++;
      const more = await getAllRecipes(pageRef.current);
      setAllItems(prev => [...prev, ...more]);
      hasMoreRef.current = more.length === 20;
      const ids = more.map(r => r.id);
      const ratings = await getMyRatings(ids);
      setMyRatings(prev => ({ ...prev, ...ratings }));
    } catch { /* swallow */ }
    finally { setLoadingMore(false); }
  }

  async function handleRate(id: string, stars: number) {
    const prevMyRating = myRatings[id];
    setMyRatings(prev => ({ ...prev, [id]: stars }));
    // Optimistic avg update
    const applyOptimistic = (list: CommunityRecipe[]): CommunityRecipe[] =>
      list.map(r => {
        if (r.id !== id) return r;
        let count = r.ratingCount;
        let sum = r.avgRating * count;
        if (prevMyRating) { sum -= prevMyRating; } else { count += 1; }
        sum += stars;
        return { ...r, avgRating: count > 0 ? sum / count : 0, ratingCount: count };
      });
    setWeekItems(applyOptimistic);
    setAllItems(applyOptimistic);
    try {
      await rateRecipe(id, stars);
    } catch {
      showToast('Could not save rating', 'wifi');
      // revert
      setMyRatings(prev => {
        const next = { ...prev };
        if (prevMyRating) next[id] = prevMyRating;
        else delete next[id];
        return next;
      });
    }
  }

  async function handleSave(item: CommunityRecipe) {
    const recipe: Recipe = {
      ...item.recipe,
      id: uid(),
      savedAt: Date.now(),
      createdAt: Date.now(),
      isSaved: true,
    };
    try {
      await saveRecipe(recipe);
      showToast(`"${item.recipe.title}" saved to your library`, 'bookmark');
    } catch {
      showToast('Could not save recipe', 'wifi');
    }
  }

  const renderItem = ({ item }: ListRenderItemInfo<CommunityRecipe>) => (
    <CommunityCard
      item={item}
      myRating={myRatings[item.id]}
      onRate={handleRate}
      onSave={handleSave}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Tappable onPress={() => navigation.goBack()} style={styles.backBtn} scaleTo={0.88} haptic>
          <Icon name="back" size={22} color={Colors.ink} />
        </Tappable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>What everyone's cooking</Text>
        </View>
      </View>

      {/* Segmented control */}
      <View style={styles.segWrap}>
        <View style={styles.seg}>
          {(['week', 'all'] as Tab[]).map(t => (
            <Tappable
              key={t}
              style={[styles.segBtn, tab === t && styles.segBtnActive]}
              scaleTo={0.95}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.segTxt, tab === t && styles.segTxtActive]}>
                {t === 'week' ? 'This Week' : 'Browse All'}
              </Text>
            </Tappable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); await loadInitial(); setRefreshing(false); }}
              tintColor={Colors.accent}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
              : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="people"
              title={tab === 'week' ? 'Nothing shared yet this week' : 'No community recipes yet'}
              message={
                tab === 'week'
                  ? 'Share a recipe from your library and be the first!'
                  : 'Open any recipe, tap ··· → Share to Community.'
              }
              style={{ marginTop: 48 }}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: Fonts.displaySemiBold, fontSize: 24,
    color: Colors.ink, letterSpacing: -0.5,
  },
  subtitle: { fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink3, marginTop: 1 },
  segWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  seg: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderRadius: Radius.md, padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.sm, alignItems: 'center' },
  segBtnActive: { backgroundColor: Colors.surface, ...Shadow.card },
  segTxt: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.ink3 },
  segTxtActive: { fontFamily: Fonts.uiBold, color: Colors.ink },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  card: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.md, overflow: 'hidden',
  },
  thumb: { width: 90, alignSelf: 'stretch' },
  body: {
    flex: 1, paddingVertical: 11, paddingLeft: 12, paddingRight: 13,
    gap: 1, justifyContent: 'center',
  },
  recipeTitle: {
    fontFamily: Fonts.displayMedium, fontSize: 15.5, color: Colors.ink,
    letterSpacing: -0.2, lineHeight: 21,
  },
  byLine: { fontFamily: Fonts.uiRegular, fontSize: 11.5, color: Colors.ink3 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: Colors.accentSoft, borderRadius: Radius.pill,
  },
  saveBtnText: { fontFamily: Fonts.uiBold, fontSize: 11.5, color: Colors.accentDeep },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
