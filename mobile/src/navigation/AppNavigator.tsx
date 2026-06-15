import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
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

// Tab icon with focus choreography: a soft pill blooms behind the glyph while
// the icon rises and pops on the expressive spring. On top of that, each tab
// plays a one-shot reaction on every press, themed to its concept and built on
// the shared motion tokens (web-safe 2D transforms — no 3D rotations that fail
// to render on react-native-web):
//   home → the house lights up (warm glow + pop)
//   book → the cover flips (horizontal squash & spring back)
//   calendar → a page turns (vertical squash & spring back)
//   cart → bounces as a food block drops in
function TabGlyph({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const f = useSharedValue(focused ? 1 : 0);
  const react = useSharedValue(0);

  useEffect(() => {
    f.value = focused ? withSpring(1, Springs.pop) : withSpring(0, Springs.glide);
  }, [focused, f]);

  // Register this glyph's reaction so a tab press can fire it.
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

  const glyph = useAnimatedStyle(() => {
    const lift = f.value * -2;
    const pop = 1 + f.value * 0.08;
    if (name === 'book') {
      // Cover flip: squash horizontally then spring back open.
      return { transform: [{ translateY: lift }, { scaleX: pop * (1 - react.value * 0.7) }, { scaleY: pop }] };
    }
    if (name === 'calendar') {
      // Page turn: squash vertically then spring back.
      return { transform: [{ translateY: lift }, { scaleX: pop }, { scaleY: pop * (1 - react.value * 0.65) }] };
    }
    if (name === 'cart') {
      return { transform: [{ translateY: lift - react.value * 4 }, { scale: pop + react.value * 0.16 }] };
    }
    // home: a clear pop on tap
    return { transform: [{ translateY: lift - react.value * 2 }, { scale: pop + react.value * 0.14 }] };
  });

  // The house "lights on" glow — warms up while Home is active, flares on tap.
  const glow = useAnimatedStyle(() => ({
    opacity: name === 'home' ? Math.min(1, f.value * 0.45 + react.value * 0.5) : 0,
    transform: [{ scale: 0.7 + f.value * 0.35 + react.value * 0.4 }],
  }));

  // The food block that drops into the cart on tap.
  const drop = useAnimatedStyle(() => ({
    opacity: name === 'cart' ? react.value : 0,
    transform: [
      { translateY: interpolate(react.value, [0, 1], [-12, 4]) },
      { scale: 0.8 + react.value * 0.6 },
    ],
  }));

  return (
    <View style={styles.tabGlyphWrap}>
      <Animated.View style={[styles.tabPill, pill]} />
      {name === 'home' && <Animated.View style={[styles.tabGlow, glow]} pointerEvents="none" />}
      {name === 'cart' && <Animated.View style={[styles.tabDrop, drop]} pointerEvents="none" />}
      <Animated.View style={glyph}>
        <Icon name={name} size={24} color={color} />
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
  // Warm "lights on" glow behind the Home glyph.
  tabGlow: {
    position: 'absolute', width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F6C66B',
  },
  // A small food block that drops into the List/cart glyph on tap.
  tabDrop: {
    position: 'absolute', top: 0, width: 9, height: 9, borderRadius: 2.5,
    backgroundColor: Colors.accentDeep,
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
