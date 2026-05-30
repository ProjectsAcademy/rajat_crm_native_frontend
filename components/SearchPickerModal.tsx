/**
 * SearchPickerModal — Reusable search-and-pick modal.
 * Used by CustomerFormSheet, VendorFormSheet, OrderFormSheet, etc.
 *
 * Props:
 *   visible   — controls modal visibility
 *   title     — modal header title
 *   items     — array of { id, label, sub? }
 *   loading   — shows spinner instead of list when true
 *   onSelect  — called with item on pick, null on dismiss
 */
import {
  Modal, View, Text, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export interface PickerItem {
  id: number;
  label: string;
  sub?: string;
}

interface Props {
  visible: boolean;
  title: string;
  items: PickerItem[];
  loading: boolean;
  onSelect: (item: PickerItem | null) => void;
}

export default function SearchPickerModal({ visible, title, items, loading, onSelect }: Props) {
  const [q, setQ] = useState('');

  const filtered = q
    ? items.filter(
        i =>
          i.label.toLowerCase().includes(q.toLowerCase()) ||
          (i.sub ?? '').toLowerCase().includes(q.toLowerCase()),
      )
    : items;

  useEffect(() => { if (!visible) setQ(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onSelect(null)}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
          <TouchableOpacity onPress={() => onSelect(null)} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search..."
            placeholderTextColor={Colors.textMuted}
            value={q}
            onChangeText={setQ}
            autoFocus
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="none"
            importantForAutofill="no"
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={s.item} onPress={() => onSelect(item)} activeOpacity={0.7}>
                <Text style={s.itemLabel}>{item.label}</Text>
                {item.sub ? <Text style={s.itemSub}>{item.sub}</Text> : null}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
            ListEmptyComponent={
              <View style={s.center}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>No results found</Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title:       { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  closeBtn:    { padding: 4 },
  searchRow:   {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, margin: 12,
    paddingHorizontal: 12, height: 44, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1, fontSize: 15, color: Colors.textPrimary,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  item:        { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.surface },
  itemLabel:   { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  itemSub:     { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
});
