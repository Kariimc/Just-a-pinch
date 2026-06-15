import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts, Shadow } from '../../theme';
import { Ambient, Curves } from '../../theme/motion';
import { getRecipes, getProfile, getFeaturedRecipes } from '../../store/storage';
import { useAuth } from '../../context/AuthContext';
import RecipeCard from '../../components/RecipeCard';
import Chip from '../../components/Chip';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import CookbookCover from '../../components/CookbookCover';
import Icon from '../../components/Icon';
import Tappable from '../../components/Tappable';
import Sheen from '../../components/Sheen';
import Skeleton, { RecipeCardSkeleton } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

const QUICK_FILTERS = [
  'Quick & Easy', 'Vegetarian', 'Breakfast', 'Brunch', 'Dinner',
  'Snacks', 'Desserts', 'Baking', 'Comfort',
];

// Choreographed entrance: each section arrives 60ms after the previous,
// falling 16px with a soft spring settle.
const enter = (i: number) =>
  FadeInDown.delay(i * 60).springify().damping(26).stiffness(240).mass(1);

// The AI banner's sparkle takes a little breath every few seconds: a quick
// swell and tilt, then settles — enough to catch the eye without nagging.
function SparklePulse({ children }: { children: React.ReactNode }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withDelay(
        2400,
        withSequence(
          withTiming(1, { duration: 420, easing: Curves.enter }),
          withTiming(0, { duration: 520, easing: Curves.exit }),
        ),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(t);
  }, [t]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + t.value * 0.18 },
      { rotate: `${t.value * -14}deg` },
    ],
  }));

  return <Animated.View style={anim}>{children}</Animated.View>;
}

// Subtle ambient backdrop: two soft colour fields and a faint ring drifting
// behind the content. Stationary while the list scrolls — quiet depth, not decoration.
function HomeBackdrop() {
  const f = useSharedValue(0);

  useEffect(() => {
    f.value = withRepeat(
      withTiming(1, { duration: Ambient.floatMs, easing: Curves.drift }),
      -1,
      true,
    );
    return () => cancelAnimation(f);
  }, [f]);

  const drift = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(f.value, [0, 1], [0, 14]) },
      { translateX: interpolate(f.value, [0, 1], [0, -8]) },
    ],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.bdBlobA, drift]} />
      <View style={styles.bdBlobB} />
      <View style={styles.bdRing} />
    </View>
  );
}

// Module-level so the random "What's for dinner" pick differs from the last one
// shown this session (avoids the same recipes back-to-back).
let lastDinnerIds: string[] = [];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A random 5 from the whole cookbook. With more than 5 recipes it avoids
// repeating the previous pick; with 5 or fewer it just shuffles what's there.
function pickDinner(all: Recipe[]): Recipe[] {
  if (all.length <= 5) return shuffle(all);
  const fresh = all.filter(r => !lastDinnerIds.includes(r.id));
  const pool = fresh.length >= 5 ? fresh : all;
  const picked = shuffle(pool).slice(0, 5);
  lastDinnerIds = picked.map(r => r.id);
  return picked;
}

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dinnerPicks, setDinnerPicks] = useState<Recipe[]>([]);
  const [featured, setFeatured] = useState<Recipe[]>([]);
  const [userName, setUserName] = useState('');
  const [lastName, setLastName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [r, p, f] = await Promise.all([getRecipes(), getProfile(), getFeaturedRecipes()]);
    setRecipes(r);
    setDinnerPicks(pickDinner(r));
    // Never greet with a blank: profile name → signup name → email → Chef.
    const metaName = (user?.user_metadata?.name as string | undefined)?.trim();
    const resolved = p?.name?.trim() || metaName || user?.email?.split('@')[0] || 'Chef';
    setUserName(resolved.split(' ')[0]);
    setLastName(p?.lastName?.trim() ?? '');
    setFeatured(f);
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, [user?.id]));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  const recent = recipes.slice(0, 6);

  // "ANDERSON'S" on the cookbook cover; names already ending in s get just
  // the apostrophe ("CHILES'"). Prefer the surname, fall back to the first
  // name ("KARIIM'S"), and only land on "OUR FAMILY COOKBOOK" when neither is set.
  const coverBase = lastName || userName;
  const coverName = coverBase
    ? `${coverBase.toUpperCase()}${coverBase.toLowerCase().endsWith('s') ? '’' : '’S'}`
    : 'OUR';

  return (
    <View style={styles.container}>
      <HomeBackdrop />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 6 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.accent} />}
      >
      {/* App bar */}
      <View style={styles.appbar}>
        <View>
          <Text style={styles.subGreet}>{greeting}</Text>
          {loading && !userName
            ? <Skeleton width={140} height={28} style={{ marginTop: 4 }} />
            : <Text style={styles.nameGreet}>{userName}</Text>}
        </View>
        <Tappable
          scaleTo={0.92}
          haptic
          style={styles.avatar}
          onPress={() => navigation.navigate('Settings')}
        >
          {userName ? (
            <Text style={styles.avatarTxt}>{userName[0].toUpperCase()}</Text>
          ) : (
            <Icon name="user" size={20} color={Colors.white} />
          )}
        </Tappable>
      </View>

      {/* Search field */}
      <Animated.View entering={enter(0)}>
        <TouchableOpacity style={styles.searchField} onPress={() => navigation.navigate('Search')} activeOpacity={0.7}>
          <Icon name="search" size={18} color={Colors.ink3} />
          <Text style={styles.searchTxt}>Search recipes &amp; ingredients</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick filters → search pre-filtered */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {QUICK_FILTERS.map(f => (
            <Chip
              key={f}
              label={f}
              onPress={() => navigation.navigate('Search', { initialQuery: f })}
            />
          ))}
          <View style={{ width: 8 }} />
        </View>
      </ScrollView>

      {/* Loading skeletons */}
      {loading && recipes.length === 0 && (
        <>
          <Skeleton width={160} height={20} style={{ marginTop: 26 }} />
          <ScrollView horizontal scrollEnabled={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 13 }}>
              <RecipeCardSkeleton />
              <RecipeCardSkeleton />
            </View>
          </ScrollView>
        </>
      )}

      {/* What's for dinner */}
      {recipes.length > 0 && (
        <Animated.View entering={enter(1)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>What's for dinner?</Text>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Recipes')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={styles.cardRow}
          >
            <View style={{ flexDirection: 'row', gap: 13 }}>
              {dinnerPicks.map(r => (
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
        </Animated.View>
      )}

      {/* Generate with AI */}
      <Animated.View entering={enter(2)}>
      <Tappable
        scaleTo={0.97}
        haptic
        style={styles.aiCard}
        onPress={() => navigation.navigate('AIGenerator')}
      >
        <View style={styles.aiIconWrap}>
          <SparklePulse>
            <Icon name="sparkle" size={22} color="#fff" />
          </SparklePulse>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Cook with what you have</Text>
          <Text style={styles.aiSub}>Tell the AI what's in your kitchen tonight</Text>
        </View>
        <Icon name="fwd" size={20} color={Colors.accentDeep} />
        <Sheen radius={Radius.lg} delayMs={900} peak={0.5} />
      </Tappable>
      </Animated.View>

      {/* Community */}
      <Animated.View entering={enter(3)}>
      <Tappable
        scaleTo={0.97}
        haptic
        style={styles.communityCard}
        onPress={() => navigation.navigate('Community')}
      >
        <View style={styles.communityIconWrap}>
          <Icon name="people" size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.communityTitle}>Community Recipes</Text>
            <View style={styles.comingSoonChip}>
              <Text style={styles.comingSoonTxt}>Soon</Text>
            </View>
          </View>
          <Text style={styles.communitySub}>Share, discover, and rate — launching soon</Text>
        </View>
        <Icon name="fwd" size={20} color={Colors.accentDeep} />
      </Tappable>
      </Animated.View>

      {/* Today's Picks */}
      {featured.length > 0 && (
        <Animated.View entering={enter(4)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.secTitle}>Today's picks</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={styles.cardRow}
          >
            <View style={{ flexDirection: 'row', gap: 13 }}>
              {featured.map(r => (
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
        </Animated.View>
      )}

      {/* Recently added */}
      {recent.length > 0 && (
        <Animated.View entering={enter(5)}>
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
        </Animated.View>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && (
        <EmptyState
          icon="chefhat"
          title="Your kitchen awaits"
          message="Import a recipe from a link or photo, write your own, or let the AI cook one up."
          ctaLabel="Add your first recipe"
          onPress={() => navigation.navigate('AddMenu')}
        />
      )}

      {/* Family cookbook — the whole collection. Every saved recipe lives here;
          tapping opens the full library. */}
      {recipes.length > 0 && (
        <>
          <Text style={[styles.secTitle, { marginTop: 24 }]}>From the family cookbook</Text>
          <TouchableOpacity
            style={[styles.familyCard, Shadow.cardSoft]}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('Recipes')}
          >
            <CookbookCover style={StyleSheet.absoluteFill} />
            <View style={styles.familyOverlay}>
              <Text style={styles.familyName}>{coverName}</Text>
              <Text style={styles.familyTitle}>FAMILY COOKBOOK</Text>
              <Text style={styles.familySub}>
                {recipes.length} RECIPE{recipes.length === 1 ? '' : 'S'} · TAP TO OPEN
              </Text>
            </View>
          </TouchableOpacity>
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  scroll: { flex: 1, backgroundColor: Colors.transparent },
  content: { paddingHorizontal: 22, paddingBottom: 100 },
  bdBlobA: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: Colors.accentSoft, opacity: 0.55, top: -110, right: -90,
  },
  bdBlobB: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: Colors.surface2, opacity: 0.7, top: 230, left: -130,
  },
  bdRing: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    borderWidth: 1.5, borderColor: Colors.accent, opacity: 0.07,
    bottom: -120, right: -120,
  },
  appbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  subGreet: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2 },
  nameGreet: { fontFamily: Fonts.displayMedium, fontSize: 30, letterSpacing: -0.3, color: Colors.ink },
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
  // Room for the card shadow to render before the scroller clips it —
  // without this the drop shadow ends in a hard straight edge.
  cardRow: { paddingTop: 2, paddingBottom: 14 },
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
  communityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14,
    padding: 16,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.lg,
  },
  communityIconWrap: {
    width: 48, height: 48, borderRadius: Radius.sm,
    backgroundColor: Colors.accentDeep,
    alignItems: 'center', justifyContent: 'center',
  },
  communityTitle: { fontFamily: Fonts.uiBold, fontSize: 15.5, color: Colors.ink },
  communitySub: { fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink2, marginTop: 2 },
  comingSoonChip: {
    paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: '#F5A62320', borderRadius: Radius.pill,
  },
  comingSoonTxt: { fontFamily: Fonts.uiBold, fontSize: 10, color: '#C88A00', letterSpacing: 0.3 },
  familyCard: { marginTop: 12, borderRadius: Radius.lg, overflow: 'hidden', height: 190 },
  // Centred title block sits in the clear field of the engraved cover; the
  // bottom ~55px stays free for the spice still-life baked into the SVG.
  familyOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 18, paddingBottom: 42, paddingHorizontal: 56,
  },
  familyName: {
    fontFamily: Fonts.displayMedium, fontSize: 26, color: '#EDE8D6',
    letterSpacing: 2.5, textAlign: 'center',
  },
  familyTitle: {
    fontFamily: Fonts.displayMedium, fontSize: 19, color: '#EDE8D6',
    letterSpacing: 3.5, marginTop: 4, textAlign: 'center',
  },
  familySub: {
    fontFamily: Fonts.uiSemiBold, fontSize: 9.5, color: '#D9D3BC',
    letterSpacing: 2.4, marginTop: 9, textAlign: 'center',
  },
});
