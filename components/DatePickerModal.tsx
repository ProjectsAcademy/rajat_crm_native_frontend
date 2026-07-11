import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Fully-controlled calendar date picker (house dropdown policy: no native
// browser/OS pickers). Returns ISO YYYY-MM-DD via onSelect; onSelect(null)
// means "cleared" (only offered when allowClear).

interface Props {
  visible: boolean;
  title?: string;
  value?: string | null;      // ISO YYYY-MM-DD
  allowClear?: boolean;
  onSelect: (iso: string | null) => void;
  onClose: () => void;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DatePickerModal({ visible, title, value, allowClear, onSelect, onClose }: Props) {
  const initial = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso();
  const [y, setY] = useState(parseInt(initial.slice(0, 4)));
  const [m, setM] = useState(parseInt(initial.slice(5, 7)));

  useEffect(() => {
    if (!visible) return;
    const iso = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso();
    setY(parseInt(iso.slice(0, 4)));
    setM(parseInt(iso.slice(5, 7)));
  }, [visible, value]);

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setY(d.getUTCFullYear());
    setM(d.getUTCMonth() + 1);
  };

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Mon=0
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isoFor = (day: number) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const today = todayIso();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {!!title && <Text style={styles.title}>{title}</Text>}

          {/* Month / year navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => shift(-12)} hitSlop={6}>
              <Ionicons name="play-back-outline" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => shift(-1)} hitSlop={6}>
              <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.navText}>{MONTH_NAMES[m - 1]} {y}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={() => shift(1)} hitSlop={6}>
              <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => shift(12)} hitSlop={6}>
              <Ionicons name="play-forward-outline" size={14} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Weekday header + day grid */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((wd) => <Text key={wd} style={styles.weekday}>{wd}</Text>)}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (day === null) return <View key={di} style={styles.dayCell} />;
                const iso = isoFor(day);
                const selected = iso === value;
                const isToday = iso === today;
                return (
                  <TouchableOpacity
                    key={di}
                    style={[styles.dayCell, styles.dayCellActive, isToday && styles.dayToday, selected && styles.daySelected]}
                    onPress={() => onSelect(iso)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayNum, isToday && { color: Colors.accentDark }, selected && styles.dayNumSelected]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Footer actions */}
          <View style={styles.footer}>
            {allowClear && (
              <TouchableOpacity style={styles.footerBtn} onPress={() => onSelect(null)} activeOpacity={0.7}>
                <Text style={styles.footerBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.footerBtn} onPress={() => onSelect(today)} activeOpacity={0.7}>
              <Text style={[styles.footerBtnText, { color: Colors.accentDark }]}>Today</Text>
            </TouchableOpacity>
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
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(0,0,0,0.35)' },
      default: { elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 32 },
    }),
  },
  title: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textAlign: 'center' },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  navBtn: {
    width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
  },
  navText: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, minWidth: 130, textAlign: 'center' },

  weekRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: Colors.textMuted, paddingVertical: 4, textTransform: 'uppercase' },
  dayCell: { flex: 1, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  dayCellActive: { backgroundColor: Colors.background },
  dayToday: { borderWidth: 1, borderColor: Colors.accent },
  daySelected: { backgroundColor: Colors.accent },
  dayNum: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dayNumSelected: { color: '#111', fontWeight: '800' },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  footerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  footerBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
});
