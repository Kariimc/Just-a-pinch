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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AddPlaceholder() {
  return <View />;
}

// Tab icon with focus choreography: a soft pill blooms behind the glyph while
// the icon rises 2px and pops once on the expressive spring.
function TabGlyph({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const f = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    f.value = focused ? withSpring(1, Springs.pop) : withSpring(0, Springs.glide);
  }, [focused, f]);

  const pill = useAnimatedStyle(() => ({
    opacity: Math.min(f.value, 1),
    transform: [{ scaleX: 0.6 + f.value * 0.4 }, { scaleY: 0.8 + f.value * 0.2 }],
  }));

  const glyph = useAnimatedStyle(() => ({
    transform: [{ translateY: f.value * -2 }, { scale: 1 + f.value * 0.08 }],
  }));

  return (
    <View style={styles.tabGlyphWrap}>
      <Animated.View style={[styles.tabPill, pill]} />
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
        tabBarStyle: [styles.tabbar, { height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarActiveTintColor: Colors.accentDeep,
        tabBarInactiveTintColor: Colors.ink3,
        tabBarButton: TabButton,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontFamily: Fonts.uiSemiBold,
          marginTop: 1,
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
      />
      <Tab.Screen
        name="Recipes"
        component={LibraryScreen}
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => <TabGlyph name="book" color={color} focused={focused} />,
        }}
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
      />
      <Tab.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{
          title: 'List',
          tabBarIcon: ({ color, focused }) => <TabGlyph name="cart" color={color} focused={focused} />,
        }}
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
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <Navigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    paddingTop: 9,
  },
  tabBtn: { alignItems: 'center', justifyContent: 'center' },
  tabGlyphWrap: {
    width: 52, height: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  tabPill: {
    position: 'absolute', width: 48, height: 30,
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
