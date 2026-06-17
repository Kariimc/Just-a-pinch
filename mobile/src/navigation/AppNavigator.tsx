import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation, interpolate, interpolateColor,
  SharedValue, useAnimatedProps, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
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

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type GlyphInner = { color: string; f: SharedValue<number>; react: SharedValue<number> };

// Home: a window lights up with warm amber on press; glows dimly when focused.
function HomeGlyph({ color, f, react }: GlyphInner) {
  const windowProps = useAnimatedProps(() => {
    const lit = Math.min(1, f.value * 0.55 + react.value * 0.9);
    return { fill: interpolateColor(lit, [0, 1], ['rgba(246,198,107,0)', 'rgba(246,198,107,1)']) };
  });
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      <AnimatedRect x={9.5} y={11} width={5} height={3.5} rx={0.7} stroke="none" animatedProps={windowProps} />
    </Svg>
  );
}

// Recipes: the book opens flat — text lines fade in to show the pages on focus/press.
function BookGlyph({ color, f, react }: GlyphInner) {
  const linesStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, f.value * 0.9 + react.value * 1.5),
  }));
  return (
    <View>
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 0 5 20.5z" />
        <Path d="M5 17.5A1.5 1.5 0 0 1 6.5 16H20" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, linesStyle]} pointerEvents="none">
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.3} strokeLinecap="round">
          <Path d="M8 8.5h8M8 11.5h8M8 14.5h5.5" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// Plan: a checkmark draws itself on a calendar date cell on press; stays visible while focused.
function CalendarGlyph({ color, f, react }: GlyphInner) {
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(Math.max(react.value, f.value * 0.8), [0, 1], [13, 0]),
    opacity: Math.max(react.value, f.value * 0.7),
  }));
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3.5} y={4.5} width={17} height={16} rx={2.5} />
      <Path d="M3.5 9h17M8 3v4M16 3v4" />
      <AnimatedPath d="M8.5 16 11 19 16.5 13" strokeDasharray={13} animatedProps={checkProps} />
    </Svg>
  );
}

// List: food circles drop into the cart on press and stay inside while focused.
function CartGlyph({ color, f, react }: GlyphInner) {
  const dot1Props = useAnimatedProps(() => {
    const t = Math.max(react.value, f.value * 0.85);
    return {
      cy: interpolate(t, [0, 1], [5, 11]),
      opacity: interpolate(t, [0, 0.1, 1], [0, 1, 1]),
      r: 1.9,
    };
  });
  const dot2Props = useAnimatedProps(() => {
    const fromReact = Math.max(0, interpolate(react.value, [0.35, 1], [0, 1]));
    const t = Math.max(fromReact, f.value * 0.7);
    return {
      cy: interpolate(t, [0, 1], [5, 12.5]),
      opacity: interpolate(t, [0, 0.1, 1], [0, 1, 1]),
      r: 1.5,
    };
  });
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9.5} cy={20} r={1.4} />
      <Circle cx={18} cy={20} r={1.4} />
      <Path d="M2.5 3.5h2.2l2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.47-1.16L21 7.5H6" />
      <AnimatedCircle cx={11.5} fill={color} stroke="none" animatedProps={dot1Props} />
      <AnimatedCircle cx={15.5} fill={color} stroke="none" animatedProps={dot2Props} />
    </Svg>
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
    <Tappable {...(rest as object)} style={[style as object, styles.tabBtn]} scaleTo={0.9}>
      {children}
    </Tappable>
  );
}

// The + button breathes: a soft ring pings outward every few seconds so the
// primary action quietly advertises itself.
function PlusButton() {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(
      withDelay(2600, withSequence(
        withTiming(1, { duration: 900, easing: Curves.enter }),
        withTiming(0, { duration: 1 }),
      )),
      -1,
      false,
    );
    return () => cancelAnimation(p);
  }, [p]);

  const ping = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.12, 1], [0, 0.45, 0]),
    transform: [{ scale: 0.9 + p.value * 0.55 }],
  }));

  return (
    <View style={styles.plusWrap}>
      <Animated.View style={[styles.plusPing, ping]} />
      <View style={styles.plusBtn}>
        <Icon name="plus" size={26} color="#fff" />
      </View>
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
    position: 'absolute', width: 48, height: 28,
    borderRadius: Radius.pill, backgroundColor: Colors.accentSoft,
  },
  plusWrap: {
    width: 50, height: 40, marginTop: -6,
    alignItems: 'center', justifyContent: 'center',
  },
  plusPing: {
    position: 'absolute', width: 50, height: 40,
    borderRadius: Radius.md, backgroundColor: Colors.accent,
  },
  plusBtn: {
    width: 50,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
