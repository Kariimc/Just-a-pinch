import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Colors, Radius, Spacing } from '../theme';
import { Recipe } from '../types';
import { formatTime } from '../utils/id';
import FoodPlaceholder from './FoodPlaceholder';

interface Props {
  recipe: Recipe;
  onPress: () => void;
  variant?: 'grid' | 'list' | 'horizontal';
}

export default function RecipeCard({ recipe, onPress, variant = 'grid' }: Props) {
  const thumb = recipe.imageUri ? (
    <Image source={{ uri: recipe.imageUri }} style={styles.image} />
  ) : (
    <FoodPlaceholder variant={recipe.imageColor as any} style={styles.image} />
  );

  if (variant === 'list') {
    return (
      <TouchableOpacity style={styles.listRow} onPress={onPress} activeOpacity={0.7}>
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
      </TouchableOpacity>
    );
  }

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity style={styles.hCard} onPress={onPress} activeOpacity={0.7}>
        {recipe.imageUri
          ? <Image source={{ uri: recipe.imageUri }} style={styles.hImage} />
          : <FoodPlaceholder variant={recipe.imageColor as any} style={styles.hImage} />}
        <Text style={styles.hTitle} numberOfLines={2}>{recipe.title}</Text>
        <Text style={styles.hSub}>{formatTime(recipe.prepMinutes + recipe.cookMinutes)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 110 },
  cardBody: { padding: 10 },
  cardTitle: { fontWeight: '600', fontSize: 13.5, color: Colors.ink, lineHeight: 18 },
  cardSub: { fontSize: 12, color: Colors.ink3, marginTop: 3 },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  listThumb: { width: 64, height: 64, borderRadius: Radius.sm },
  listBody: { flex: 1 },
  listTitle: { fontWeight: '600', fontSize: 15, color: Colors.ink },
  listSub: { fontSize: 12.5, color: Colors.ink3, marginTop: 3 },

  hCard: { width: 128, marginRight: Spacing.md },
  hImage: { width: 128, height: 96, borderRadius: Radius.md },
  hTitle: { fontWeight: '600', fontSize: 13.5, color: Colors.ink, marginTop: 7, lineHeight: 18 },
  hSub: { fontSize: 12, color: Colors.ink3 },
});
