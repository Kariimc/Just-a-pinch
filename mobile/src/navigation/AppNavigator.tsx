import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation, interpolate,
  SharedValue, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import { Colors, Radius, Fonts } from '../theme';
import { Springs, Curves } from '../theme/motion';
import { AuthProvider, useAuth } from '../context/AuthContext';
import Icon, { IconName } from '../components/Icon';
import Tappable from '../components/Tappable';

type GlyphInner = { color: string; f: SharedValue<number>; react: SharedValue<number> };

// Home: an amber window lights up inside the house on press; glows when focused.
// Uses a plain Animated.View overlay at SVG-coordinate position so no useAnimatedProps needed.
function HomeGlyph({ color, f, react }: GlyphInner) {
  const lightStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, f.value * 0.55 + react.value * 0.9),
  }));
  return (
    <View style={styles.iconWrap}>
      <Icon name="home" size={24} color={color} />
      {/* Amber window rect at SVG coords x=9.5,y=11,w=5,h=3.5 — 1:1 with the 24×24 viewBox */}
      <Animated.View style={[styles.windowLight, lightStyle]} pointerEvents="none" />
    </View>
  );
}

// Recipes: page text lines fade in over the closed book, showing it open on focus/press.
function BookGlyph({ color, f, react }: GlyphInner) {
  const linesStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, f.value * 0.9 + react.value * 1.5),
  }));
  return (
    <View style={styles.iconWrap}>
      <Icon name="book" size={24} color={color} />
      <Animated.View style={[StyleSheet.absoluteFill, linesStyle]} pointerEvents="none">
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round">
          <Path d="M8 8.5h8M8 11.5h8M8 14.5h5.5" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// Plan: a checkmark fades in on a calendar date cell; stays visible while focused.
function CalendarGlyph({ color, f, react }: GlyphInner) {
  const checkStyle = useAnimatedStyle(() => ({
    opacity: Math.max(react.value, f.value * 0.7),
  }));
  return (
    <View style={styles.iconWrap}>
      <Icon name="calendar" size={24} color={color} />
      <Animated.View style={[StyleSheet.absoluteFill, checkStyle]} pointerEvents="none">
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M8.5 16 11 19 16.5 13" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// List: two food dots drop from above into the cart on press, stay inside while focused.
function CartGlyph({ color, f, react }: GlyphInner) {
  const dot1Style = useAnimatedStyle(() => {
    const t = Math.max(react.value, f.value);
    return {
      opacity: interpolate(t, [0, 0.1, 1], [0, 1, 1]),
      transform: [{ translateY: interpolate(t, [0, 1], [-8, 0]) }],
    };
  });
  const dot2Style = useAnimatedStyle(() => {
    const fromReact = Math.max(0, interpolate(react.value, [0.35, 1], [0, 1]));
    const t = Math.max(fromReact, f.value * 0.9);
    return {
      opacity: interpolate(t, [0, 0.1, 1], [0, 1, 1]),
      transform: [{ translateY: interpolate(t, [0, 1], [-8, 0]) }],
    };
  });
  return (
    <View style={styles.iconWrap}>
      <Icon name="cart" size={24} color={color} />
      {/* Dots positioned at their landing spot (inside basket); translateY lifts them into starting pos */}
      <Animated.View style={[styles.cartDot1, { backgroundColor: color }, dot1Style]} pointerEvents="none" />
      <Animated.View style={[styles.cartDot2, { backgroundColor: color }, dot2Style]} pointerEvents="none" />
    </View>
  );
}

// Auth
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import PersonalizationQuizScreen from '../screens/auth/PersonalizationQuizScreen';

// Main tabs
import HomeScreen from '../screens/home/HomeScreen';
import LibraryScreen from '../screens/library/LibraryScreen';
import MealPlanScreen from '../screens/plan/MealPlanScreen';
import ShoppingScreen from '../screens/shopping/ShoppingScreen';

// Screens
import RecipeDetailScreen from '../screens/recipe/RecipeDetailScreen';
import CookingModeScreen from '../screens/recipe/CookingModeScreen';
import RecipeEditorScreen from '../screens/capture/RecipeEditorScreen';
import AddMenuScreen from '../screens/capture/AddMenuScreen';
import AIGeneratorScreen from '../screens/capture/AIGeneratorScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import BadgesScreen from '../screens/settings/BadgesScreen';
import PaywallScreen from '../screens/paywall/PaywallScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import CommunityScreen from '../screens/community/CommunityScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AddPlaceholder() {
  return <View />;
}

// Lets each tab replay its glyph reaction on press — including re-pressing the
// already-active tab, so the animations are easy to trigger and see. Keyed by
// the glyph's icon name; the tab's tabPress listener calls fireTabReaction.
const tabReactors: Partial<Record<IconName, () => void>> = {};
function fireTabReaction(name: IconName) { tabReactors[name]?.(); }

// Tab icon with focus choreography: pill blooms behind the glyph on focus,
// icon lifts and pops. Each tab also plays a themed one-shot reaction on press:
//   home     → window lights up amber
//   recipes  → page text lines fade in (book opens flat)
//   plan     → checkmark draws on a calendar date cell
//   list     → food circles drop into the cart
function TabGlyph({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const f = useSharedValue(focused ? 1 : 0);
  const react = useSharedValue(0);

  useEffect(() => {
    f.value = focused ? withSpring(1, Springs.pop) : withSpring(0, Springs.glide);
  }, [focused, f]);

  useEffect(() => {
    const fire = () => {
      react.value = 0;
      react.value = withSequence(
        withTiming(1, { duration: 240, easing: Curves.enter }),
        withSpring(0, Springs.glide),
      );
    };
    tabReactors[name] = fire;
    return () => { if (tabReactors[name] === fire) delete tabReactors[name]; };
  }, [name, react]);

  const pill = useAnimatedStyle(() => ({
    opacity: Math.min(f.value, 1),
    transform: [{ scaleX: 0.6 + f.value * 0.4 }, { scaleY: 0.8 + f.value * 0.2 }],
  }));

  const glyph = useAnimatedStyle(() => ({
    transform: [
      { translateY: -(f.value * 2 + react.value * 1.5) },
      { scale: 1 + f.value * 0.08 + react.value * 0.06 },
    ],
  }));

  return (
    <View style={styles.tabGlyphWrap}>
      <Animated.View style={[styles.tabPill, pill]} />
      <Animated.View style={glyph}>
        {name === 'home' && <HomeGlyph color={color} f={f} react={react} />}
        {name === 'book' && <BookGlyph color={color} f={f} react={react} />}
        {name === 'calendar' && <CalendarGlyph color={color} f={f} react={react} />}
        {name === 'cart' && <CartGlyph color={color} f={f} react={react} />}
      </Animated.View>
    </View>
  );
}

// Spring-press wrapper for every tab button (replaces the default opacity dim).
function TabButton(props: BottomTabBarButtonProps) {
  const { style, children, ...rest } = props;
  return (
    <Tappable {...(rest as object)} style={[style as object, styles.tabBtn]}>
      {children}
    </Tappable>
  );
}

// The + is the app's primary action, so it gets the richest treatment: a
// gradient brand-green orb with a glass highlight and a slow breathing scale,
// two staggered rings that quietly ping outward to advertise it, and a
// one-shot burst + squash when tapped (fired from the Add tab's listener).
const PLUS_W = 56;
const PLUS_H = 40;

function PlusButton() {
  const breath = useSharedValue(0); // continuous gentle breathing scale
  const ping = useSharedValue(0);   // continuous outward ring
  const react = useSharedValue(0);  // one-shot press burst + squash

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Curves.drift }), -1, true,
    );
    ping.value = withRepeat(
      withDelay(2200, withSequence(
        withTiming(1, { duration: 1800, easing: Curves.enter }),
        withTiming(0, { duration: 1 }),
      )),
      -1, false,
    );
    return () => { cancelAnimation(breath); cancelAnimation(ping); };
  }, [breath, ping]);

  useEffect(() => {
    const fire = () => {
      react.value = 0;
      react.value = withSequence(
        withTiming(1, { duration: 240, easing: Curves.enter }),
        withSpring(0, Springs.pop),
      );
    };
    tabReactors.plus = fire;
    return () => { if (tabReactors.plus === fire) delete tabReactors.plus; };
  }, [react]);

  // Lead ring + a second ring lagging behind it for layered depth.
  const ring1 = useAnimatedStyle(() => ({
    opacity: interpolate(ping.value, [0, 0.12, 1], [0, 0.36, 0]),
    transform: [{ scale: 0.82 + ping.value * 0.72 }],
  }));
  const ring2 = useAnimatedStyle(() => {
    const p = Math.max(0, interpolate(ping.value, [0.22, 1], [0, 1]));
    return {
      opacity: interpolate(p, [0, 0.12, 1], [0, 0.24, 0]),
      transform: [{ scale: 0.82 + p * 0.5 }],
    };
  });
  // Sharp burst ring that snaps out on press.
  const burst = useAnimatedStyle(() => ({
    opacity: interpolate(react.value, [0, 0.25, 1], [0, 0.55, 0]),
    transform: [{ scale: 0.9 + react.value * 0.9 }],
  }));
  const orb = useAnimatedStyle(() => ({
    transform: [
      { translateY: -react.value * 2 },
      { scale: 1 + breath.value * 0.02 - react.value * 0.07 },
    ],
  }));
  const glyph = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + react.value * 0.18 }],
  }));

  return (
    <View style={styles.plusWrap}>
      <Animated.View style={[styles.plusRing, ring1]} pointerEvents="none" />
      <Animated.View style={[styles.plusRing, ring2]} pointerEvents="none" />
      <Animated.View style={[styles.plusRing, burst]} pointerEvents="none" />
      <Animated.View style={[styles.plusBtn, orb]}>
        <Svg width={PLUS_W} height={PLUS_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="plusOrb" x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor="#43C275" />
              <Stop offset="0.5" stopColor="#2E9E57" />
              <Stop offset="1" stopColor="#1C763E" />
            </LinearGradient>
            <RadialGradient id="plusHi" cx="32%" cy="22%" r="64%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={PLUS_W} height={PLUS_H} rx="15" fill="url(#plusOrb)" />
          <Rect x="0" y="0" width={PLUS_W} height={PLUS_H} rx="15" fill="url(#plusHi)" />
          {/* crisp top rim highlight */}
          <Rect x="4" y="2" width={PLUS_W - 8} height="2.5" rx="1.25" fill="#FFFFFF" opacity="0.4" />
        </Svg>
        <Animated.View style={glyph}>
          <Icon name="plus" size={26} color="#fff" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function TabBar() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabbar, { height: 74 + insets.bottom, paddingBottom: Math.max(insets.bottom, 10) }],
        tabBarActiveTintColor: Colors.accentDeep,
        tabBarInactiveTintColor: Colors.ink3,
        tabBarButton: TabButton,
        // includeFontPadding:false trims Android's extra glyph padding; the
        // explicit lineHeight stops the descenders on "Recipes"/"Plan" from
        // being clipped on web, where the label box was sitting too short.
        tabBarLabelStyle: {
          fontSize: 10.5,
          lineHeight: 14,
          fontFamily: Fonts.uiSemiBold,
          marginTop: 2,
          includeFontPadding: false,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabGlyph name="home" color={color} focused={focused} />,
        }}
        listeners={{ tabPress: () => fireTabReaction('home') }}
      />
      <Tab.Screen
        name="Recipes"
        component={LibraryScreen}
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => <TabGlyph name="book" color={color} focused={focused} />,
        }}
        listeners={{ tabPress: () => fireTabReaction('book') }}
      />
      <Tab.Screen
        name="Add"
        component={AddPlaceholder}
        options={{
          tabBarIcon: () => <PlusButton />,
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            fireTabReaction('plus');
            (navigation as any).navigate('AddMenu');
          },
        }}
      />
      <Tab.Screen
        name="Plan"
        component={MealPlanScreen}
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => <TabGlyph name="calendar" color={color} focused={focused} />,
        }}
        listeners={{ tabPress: () => fireTabReaction('calendar') }}
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{
          title: 'List',
          tabBarIcon: ({ color, focused }) => <TabGlyph name="cart" color={color} focused={focused} />,
        }}
        listeners={{ tabPress: () => fireTabReaction('cart') }}
      />
    </Tab.Navigator>
  );
}

function Navigator() {
  const { recovering } = useAuth();

  // A tapped password-reset link puts the app into recovery mode: nothing else
  // is reachable until the user sets a new password (or cancels).
  if (recovering) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="LogIn" component={LoginScreen} />
      <Stack.Screen name="PersonalizationQuiz" component={PersonalizationQuizScreen} />
      <Stack.Screen name="Main" component={TabBar} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="CookingMode" component={CookingModeScreen} />
      <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} />
      <Stack.Screen name="AddMenu" component={AddMenuScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AIGenerator" component={AIGeneratorScreen} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="AddToMealPlan" component={MealPlanScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Badges" component={BadgesScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="Community" component={CommunityScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      {/* linking must be explicitly disabled: with no config, tab buttons on web
          still get hrefs like /Main/Recipes that escape the GitHub Pages base path */}
      <NavigationContainer ref={navigationRef} linking={{ enabled: false, prefixes: [] }}>
        <Navigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    backgroundColor: Colors.glass,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingTop: 9,
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center' },
  tabGlyphWrap: {
    width: 52, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  tabPill: {
    position: 'absolute', width: 48, height: 30,
    borderRadius: Radius.pill, backgroundColor: Colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(46,158,87,0.20)',
  },
  // 24×24 wrapper so absolute-positioned overlays align 1:1 with SVG viewBox units.
  iconWrap: { width: 24, height: 24 },
  // Amber window pane at SVG position x=9.5 y=11 w=5 h=3.5
  windowLight: {
    position: 'absolute', left: 9.5, top: 11,
    width: 5, height: 3.5, borderRadius: 1,
    backgroundColor: '#F6C66B',
  },
  // Food dots that drop into the cart basket; translateY animation moves them in from above
  cartDot1: {
    position: 'absolute', left: 10, top: 11,
    width: 3.5, height: 3.5, borderRadius: 2,
  },
  cartDot2: {
    position: 'absolute', left: 14.5, top: 12.5,
    width: 2.5, height: 2.5, borderRadius: 1.5,
  },
  plusWrap: {
    width: 62, height: 44, marginTop: -8,
    alignItems: 'center', justifyContent: 'center',
  },
  plusRing: {
    position: 'absolute', width: PLUS_W, height: PLUS_H,
    borderRadius: 15, backgroundColor: Colors.accent,
  },
  plusBtn: {
    width: PLUS_W,
    height: PLUS_H,
    borderRadius: 15,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.5,
    shadowRadius: 13,
    elevation: 9,
  },
});
