import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Tappable from './Tappable';
import { Colors, Radius, Fonts, Shadow } from '../theme';
import { Recipe } from '../types';
import { formatTime } from '../utils/id';
import FoodPlaceholder from './FoodPlaceholder';

interface Props {
  recipe: Recipe;
  onPress: () => void;
  variant?: 'grid' | 'list' | 'horizontal' | 'small';
}

export default function RecipeCard({ recipe, onPress, variant = 'grid' }: Props) {
  // Small tile: 128px wide, used in "Recently added" horizontal scroller
  if (variant === 'small') {
    return (
      <Tappable style={styles.smallWrap} onPress={onPress}>
        {recipe.imageUri
          ? <Image source={{ uri: recipe.imageUri }} style={styles.smallImg} />
          : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.smallImg} />}
        <Text style={styles.smallTitle} numberOfLines={2}>{recipe.title}</Text>
        <Text style={styles.smallSub}>{formatTime(recipe.prepMinutes + recipe.cookMinutes)} · {recipe.difficulty ?? 'Easy'}</Text>
      </Tappable>
    );
  }

  // Horizontal card: 215px wide, used in "What's for dinner" scroller
  if (variant === 'horizontal') {
    return (
      <Tappable style={[styles.hCard, Shadow.cardSoft]} onPress={onPress}>
        {recipe.imageUri
          ? <Image source={{ uri: recipe.imageUri }} style={styles.hImage} />
          : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.hImage} />}
        <View style={styles.hBody}>
          <Text style={styles.hTitle} numberOfLines={2}>{recipe.title}</Text>
          <Text style={styles.hSub}>
            {formatTime(recipe.prepMinutes + recipe.cookMinutes)} · serves {recipe.servings}
            {recipe.rating ? ` · ★ ${recipe.rating}` : ''}
          </Text>
        </View>
      </Tappable>
    );
  }

  // List row
  if (variant === 'list') {
    return (
      <Tappable style={styles.listRow} onPress={onPress}>
        {recipe.imageUri
          ? <Image source={{ uri: recipe.imageUri }} style={styles.listThumb} />
          : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.listThumb} />}
        <View style={styles.listBody}>
          <Text style={styles.listTitle} numberOfLines={1}>{recipe.title}</Text>
          <Text style={styles.listSub} numberOfLines={1}>
            {formatTime(recipe.prepMinutes + recipe.cookMinutes)}
            {recipe.rating ? ` · ★ ${recipe.rating}` : ''}
          </Text>
        </View>
      </Tappable>
    );
  }

  // Grid card (default)
  return (
    <Tappable style={styles.card} onPress={onPress}>
      {recipe.imageUri
        ? <Image source={{ uri: recipe.imageUri }} style={styles.image} />
        : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.image} />}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{recipe.title}</Text>
        <Text style={styles.cardSub}>
          {formatTime(recipe.prepMinutes + recipe.cookMinutes)}
          {recipe.rating ? ` · ★ ${recipe.rating}` : ''}
        </Text>
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  // Grid
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 110 },
  cardBody: { padding: 10 },
  cardTitle: { fontFamily: Fonts.displayMedium, fontSize: 14, color: Colors.ink, lineHeight: 18 },
  cardSub: { fontFamily: Fonts.uiRegular, fontSize: 12, color: Colors.ink3, marginTop: 3 },

  // List
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  listThumb: { width: 64, height: 64, borderRadius: Radius.sm },
  listBody: { flex: 1 },
  listTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 15, color: Colors.ink },
  listSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3, marginTop: 3 },

  // Horizontal (dinner cards)
  hCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  hImage: { width: '100%', height: 130 },
  hBody: { padding: 12 },
  hTitle: { fontFamily: Fonts.displayMedium, fontSize: 18, color: Colors.ink, lineHeight: 22 },
  hSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink2, marginTop: 4 },

  // Small (recently added)
  smallWrap: { width: 128 },
  smallImg: { width: 128, height: 96, borderRadius: Radius.md },
  smallTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink, marginTop: 7, lineHeight: 17 },
  smallSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink2, marginTop: 1 },
});
