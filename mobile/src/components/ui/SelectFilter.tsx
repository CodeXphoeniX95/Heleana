/**
 * SelectFilter — Menu déroulant de filtre stylisé.
 * Utilise @react-native-picker/picker sous le capot.
 * Sur Android : modal natif.
 * Sur iOS : wheel picker natif.
 */
import React from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

interface SelectFilterProps<T extends string = string> {
  label?: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SelectFilter<T extends string = string>({
  label,
  options,
  value,
  onChange,
  style,
}: SelectFilterProps<T>) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  return (
    <View style={[s.wrapper, style]}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.container}>
        <Picker
          selectedValue={value}
          onValueChange={(v) => onChange(v as T)}
          style={s.picker}
          dropdownIconColor={Palette.primary500}
          mode="dropdown"
        >
          {options.map((opt) => (
            <Picker.Item
              key={opt.value}
              label={opt.label}
              value={opt.value}
              color={Palette.neutral800}
              style={{ fontSize: FontSize.sm }}
            />
          ))}
        </Picker>
        {/* Icône chevron (visible surtout sur iOS) */}
        <Ionicons
          name="chevron-down"
          size={16}
          color={Palette.primary500}
          style={s.chevron}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { gap: 4 },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Palette.neutral600,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.neutral0,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Palette.neutral200,
    paddingHorizontal: Platform.OS === 'ios' ? Spacing.two : 0,
    overflow: 'hidden',
  },
  picker: {
    flex: 1,
    height: Platform.OS === 'ios' ? 44 : 48,
    color: Palette.neutral800,
  },
  chevron: {
    position: 'absolute',
    right: Spacing.three,
    pointerEvents: 'none',
  },
});
