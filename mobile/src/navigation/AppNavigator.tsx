import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import { Colors, Radius } from '../theme';

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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AddPlaceholder() {
  return <View />;
}

function TabBar() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabbar,
        tabBarActiveTintColor: Colors.accentDeep,
        tabBarInactiveTintColor: Colors.ink3,
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600', marginTop: 0 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }: { color: string }) => <Text style={[styles.tabIcon, { color }]}>🏠</Text>, title: 'Home' }} />
      <Tab.Screen name="Recipes" component={LibraryScreen} options={{ tabBarIcon: ({ color }: { color: string }) => <Text style={[styles.tabIcon, { color }]}>📚</Text>, title: 'Recipes' }} />
      <Tab.Screen
        name="Add"
        component={AddPlaceholder}
        options={{
          tabBarIcon: () => (
            <View style={styles.plusBtn}>
              <Text style={{ color: '#fff', fontSize: 24, lineHeight: 28 }}>+</Text>
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            (navigation as any).navigate('RecipeEditor');
          },
        }}
      />
      <Tab.Screen name="Plan" component={MealPlanScreen} options={{ tabBarIcon: ({ color }: { color: string }) => <Text style={[styles.tabIcon, { color }]}>📅</Text>, title: 'Plan' }} />
      <Tab.Screen name="Shopping" component={ShoppingScreen} options={{ tabBarIcon: ({ color }: { color: string }) => <Text style={[styles.tabIcon, { color }]}>🛒</Text>, title: 'List' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={SplashScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="LogIn" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={LoginScreen as any} />
        <Stack.Screen name="PersonalizationQuiz" component={PersonalizationQuizScreen} />
        <Stack.Screen name="Main" component={TabBar} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <Stack.Screen name="CookingMode" component={CookingModeScreen} />
        <Stack.Screen name="RecipeEditor" component={RecipeEditorScreen} />
        <Stack.Screen name="AIGenerator" component={AIGeneratorScreen} />
        <Stack.Screen name="AddToMealPlan" component={MealPlanScreen} />
        <Stack.Screen name="Profile" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    height: 72,
    paddingBottom: 8,
    paddingTop: 9,
  },
  tabIcon: { fontSize: 20 },
  plusBtn: {
    width: 50,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
});
