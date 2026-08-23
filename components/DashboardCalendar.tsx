import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Modal, Platform, Alert, ScrollView,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calendarApi, CalendarEvent, CalendarOrderEntry, AuthUser } from '../services/api';
import { userHasFeature } from '../store/auth';
import { Colors } from '../constants/colors';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const EVENT_COLORS = ['#FF9900', '#0073BB', '#067D62', '#D13212', '#7B61FF'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function toIso(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

interface Props { user: AuthUser | null }

// A real month-grid calendar, sized to sit in the dashboard's left column
// (see app/(app)/index.tsx's 50/50 split) — not a compact list, not a modal.
export default function DashboardCalendar({ user }: Props) {
  const canView   = userHasFeature(user, 'calendar') || userHasFeature(user, 'calendar-write') || userHasFeature(user, 'calendar-manage');
  const canWrite  = userHasFeature(user, 'calendar-write') || userHasFeature(user, 'calendar-manage');
  const canManage = userHasFeature(user, 'calendar-manage');

  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [orders, setOrders] = useState<CalendarOrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd   = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const load = useCallback(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    calendarApi.list({ from: toIso(monthStart), to: toIso(monthEnd) })
      .then(({ data }) => { setEvents(data.events); setOrders(data.orders); })
      .catch(() => { setEvents([]); setOrders([]); })
      .finally(() => setLoading(false));
  }, [monthStart, monthEnd, canView]);

  useEffect(() => { load(); }, [load]);

  if (!canView) return null; // whole section hidden — default: superadmin + legacy only, until granted via RBAC

  // Build the 6x7 grid, padded with the trailing/leading days of neighboring months
  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), i - firstWeekday + 1), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const eventsOn = (d: Date) => events.filter((e) => sameDay(new Date(e.eventDate), d));
  const ordersOn = (d: Date) => orders.filter((o) => sameDay(new Date(o.deliveryDate), d));

  const openAdd = () => {
    setEditingEvent(null);
    setTitle(''); setDescription(''); setColor(EVENT_COLORS[0]);
    setShowAdd(true);
  };
  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title); setDescription(ev.description); setColor(ev.color);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Title required', 'Enter a title for the event.'); return; }
    setSaving(true);
    try {
      if (editingEvent) {
        await calendarApi.update(editingEvent.id, { title: title.trim(), description, color });
      } else {
        await calendarApi.create({ title: title.trim(), description, color, eventDate: toIso(selected) });
      }
      setShowAdd(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Could not save event.');
    } finally { setSaving(false); }
  };

  const handleDelete = (ev: CalendarEvent) => {
    const doIt = async () => {
      try {
        await calendarApi.remove(ev.id);
        load();
      } catch (e: any) {
        const msg = e?.response?.data?.error ?? 'Could not delete event.';
        if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Error', msg);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${ev.title}"?`)) doIt();
      return;
    }
    Alert.alert('Delete Event', `Delete "${ev.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doIt },
    ]);
  };

  const selEvents = eventsOn(selected);
  const selOrders = ordersOn(selected);
  const today = new Date();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
          <Text style={styles.headerTitle}>CALENDAR</Text>
        </View>
        <View style={styles.nav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} hitSlop={8}>
            <Ionicons name="chevron-back" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} hitSlop={8}>
            <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color={Colors.accent} /></View>
      ) : (
        <>
          <View style={styles.gridSection}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map(({ date, inMonth }, i) => {
              const dayEvents = eventsOn(date);
              const dayOrders = ordersOn(date);
              const isSelected = sameDay(date, selected);
              const isToday = sameDay(date, today);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.cell, isToday && !isSelected && styles.cellToday, isSelected && styles.cellSelected]}
                  onPress={() => setSelected(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    !inMonth && styles.cellTextMuted,
                    isToday && styles.cellTextToday,
                    isSelected && styles.cellTextSelected,
                  ]}>
                    {date.getDate()}
                  </Text>
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((e) => <View key={e.id} style={[styles.cellDot, { backgroundColor: isSelected ? '#fff' : e.color }]} />)}
                    {dayOrders.length > 0 && <View style={[styles.cellDot, { backgroundColor: isSelected ? '#fff' : Colors.info }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          </View>

          {/* Selected day detail — fills the free space below the grid */}
          <View style={styles.detail}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailDate}>{selected.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
              {canWrite && (
                <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                  <Ionicons name="add" size={12} color={Colors.textPrimary} />
                  <Text style={styles.addBtnText}>ADD EVENT</Text>
                </TouchableOpacity>
              )}
            </View>

            {selEvents.length === 0 && selOrders.length === 0 && (
              <Text style={styles.emptyText}>Nothing scheduled.</Text>
            )}

            <View style={{ gap: 1 }}>
              {selOrders.map((o) => (
                <TouchableOpacity key={`o-${o.id}`} style={styles.entryRow} onPress={() => router.push(`/(app)/orders/${o.id}` as any)} activeOpacity={0.7}>
                  <View style={[styles.entryBar, { backgroundColor: Colors.info }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.entryTitle} numberOfLines={1}>Order delivery — {o.orderNo}</Text>
                    <Text style={styles.entrySub}>{o.customer ? o.customer.customerName : 'Order delivery'}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {selEvents.map((e) => {
                const canEditThis = e.isMine || canManage;
                return (
                  <View key={`e-${e.id}`} style={styles.entryRow}>
                    <View style={[styles.entryBar, { backgroundColor: e.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.entryTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={styles.entrySub}>Event · by {e.createdBy.username}{e.isMine ? ' (you)' : ''}</Text>
                    </View>
                    {canEditThis && (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity onPress={() => openEdit(e)} hitSlop={8}><Ionicons name="create-outline" size={15} color={Colors.accent} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(e)} hitSlop={8}><Ionicons name="trash-outline" size={15} color={Colors.error} /></TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* Add/Edit event modal */}
      <Modal visible={showAdd} animationType="fade" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={m.backdrop}>
          <View style={m.dialog}>
            <Text style={m.title}>{editingEvent ? 'Edit Event' : `New Event — ${selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={m.label}>Title</Text>
              <TextInput style={m.input} value={title} onChangeText={setTitle} placeholder="e.g. Client meeting" placeholderTextColor={Colors.textMuted} autoFocus />
              <Text style={m.label}>Description <Text style={m.opt}>(optional)</Text></Text>
              <TextInput style={[m.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} placeholder="Details..." placeholderTextColor={Colors.textMuted} multiline textAlignVertical="top" />
              <Text style={m.label}>Color</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                {EVENT_COLORS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setColor(c)} style={[m.colorDot, { backgroundColor: c }, color === c && m.colorDotActive]} />
                ))}
              </View>
            </ScrollView>
            <View style={m.actions}>
              <TouchableOpacity style={m.cancelBtn} onPress={() => setShowAdd(false)} disabled={saving}>
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[m.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#111" /> : <Text style={m.saveText}>{editingEvent ? 'Update' : 'Create'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 2, borderBottomColor: Colors.textPrimary,
  },
  headerTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: Colors.textPrimary },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, minWidth: 96, textAlign: 'center' },

  gridSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  weekRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8, marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: Colors.textMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
  cellToday: {
    ...Platform.select({
      web: { boxShadow: `inset 0 0 0 2px ${Colors.accent}` },
      default: { borderWidth: 2, borderColor: Colors.accent },
    }),
  },
  cellSelected: { backgroundColor: Colors.primary },
  cellText: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  cellTextMuted: { color: '#C6CBCB', fontWeight: '400' },
  cellTextToday: { fontWeight: '800' },
  cellTextSelected: { color: '#fff', fontWeight: '800' },
  dotRow: { flexDirection: 'row', gap: 3, height: 4, alignItems: 'center' },
  cellDot: { width: 4, height: 4 },

  detail: { flex: 1, backgroundColor: '#FAFAFA', borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  detailDate: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: Colors.textSecondary, flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: Colors.textPrimary },
  emptyText: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', paddingVertical: 8 },

  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10 },
  entryBar: { width: 3, height: 26, flexShrink: 0 },
  entryTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  entrySub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});

const m = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: Colors.surface, borderRadius: 12, padding: 20, maxHeight: '80%' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 5, marginTop: 8 },
  opt: { fontWeight: '400', color: Colors.textMuted },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary, ...Platform.select({ web: { outlineStyle: 'none' } }) },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: Colors.textPrimary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: Colors.accent, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '700', color: '#111' },
});
