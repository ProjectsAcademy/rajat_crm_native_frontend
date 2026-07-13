import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Month + year jump picker (house dropdown policy: fully controlled, no
// native popups). Months after maxMonth are greyed out and unselectable.

interface Props {
  visible: boolean;
  value: string;            // YYYY-MM
  maxMonth?: string;        // YYYY-MM — later months/years disabled
  onSelect: (month: string) => void;
  onClose: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MonthYearPickerModal({ visible, value, maxMonth, onSelect, onClose }: Props) {
  const [year, setYear] = useState(parseInt(value.slice(0, 4)));

  useEffect(() => {
    if (visible) setYear(parseInt(value.slice(0, 4)));
  }, [visible, value]);

  const maxYear = maxMonth ? parseInt(maxMonth.slice(0, 4)) : Infinity;
  const selMonth = parseInt(value.slice(5, 7));
  const selYear = parseInt(value.slice(0, 4));

  const monthKey = (m: number) => `${year}-${String(m).padStart(2, '0')}`;
  const isFuture = (m: number) => !!maxMonth && monthKey(m) > maxMonth;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Year selector */}
          <View style={styles.yearRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setYear(year - 1)} hitSlop={6}>
              <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.yearText}>{year}</Text>
            <TouchableOpacity
              style={[styles.navBtn, year >= maxYear && styles.navBtnDisabled]}
              onPress={() => setYear(year + 1)}
              disabled={year >= maxYear}
              hitSlop={6}
            >
              <Ionicons name="chevron-forward" size={16} color={year >= maxYear ? Colors.border : Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 12-month grid */}
          <View style={styles.grid}>
            {MONTHS.map((label, i) => {
              const m = i + 1;
              const disabled = isFuture(m);
              const selected = year === selYear && m === selMonth;
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.monthCell, selected && styles.monthSelected, disabled && styles.monthDisabled]}
                  onPress={() => onSelect(monthKey(m))}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthText, selected && styles.monthTextSelected, disabled && styles.monthTextDisabled]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            {!!maxMonth && (
              <TouchableOpacity style={styles.footerBtn} onPress={() => onSelect(maxMonth)} activeOpacity={0.7}>
                <Text style={[styles.footerBtnText, { color: Colors.accentDark }]}>Current Month</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.footerBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.footerBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 320, backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' },
      default: { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 },
    }),
  },

  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 },
  navBtn: {
    width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.5 },
  yearText: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, minWidth: 64, textAlign: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell: {
    flexBasis: '22%', flexGrow: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    alignItems: 'center',
  },
  monthSelected:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  monthDisabled:     { opacity: 0.4 },
  monthText:         { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  monthTextSelected: { color: '#111', fontWeight: '800' },
  monthTextDisabled: { color: Colors.textMuted },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  footerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  footerBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
});
