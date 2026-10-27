import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { calendarApi, CalendarEvent, CalendarOrderEntry, AuthUser } from '../services/api';
import { userHasFeature } from '../store/auth';
import { Colors } from '../constants/colors';
import { notify, confirmAsync } from '../utils/dialogs';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const EVENT_COLORS = ['#D97706', '#2563EB', '#059669', '#DC2626', '#7C3AED'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Props {
  user: AuthUser | null;
}

export default function DashboardCalendar({ user }: Props) {
  const canView =
    userHasFeature(user, 'calendar') ||
    userHasFeature(user, 'calendar-write') ||
    userHasFeature(user, 'calendar-manage');
  const canWrite =
    userHasFeature(user, 'calendar-write') || userHasFeature(user, 'calendar-manage');
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

  const monthStart = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor]
  );
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    [cursor]
  );

  const load = useCallback(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    calendarApi
      .list({ from: toIso(monthStart), to: toIso(monthEnd) })
      .then(({ data }) => {
        setEvents(data.events);
        setOrders(data.orders);
      })
      .catch(() => {
        setEvents([]);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [monthStart, monthEnd, canView]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canView) return null;

  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth(), i - firstWeekday + 1),
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: new Date(cursor.getFullYear(), cursor.getMonth(), d),
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      inMonth: false,
    });
  }

  const eventsOn = (d: Date) => events.filter((e) => sameDay(new Date(e.eventDate), d));
  const ordersOn = (d: Date) => orders.filter((o) => sameDay(new Date(o.deliveryDate), d));

  const openAdd = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setColor(EVENT_COLORS[0]);
    setShowAdd(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description);
    setColor(ev.color);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      notify('Title required', 'Enter a title for the event.');
      return;
    }
    setSaving(true);
    try {
      if (editingEvent) {
        await calendarApi.update(editingEvent.id, {
          title: title.trim(),
          description,
          color,
        });
      } else {
        await calendarApi.create({
          title: title.trim(),
          description,
          color,
          eventDate: toIso(selected),
        });
      }
      setShowAdd(false);
      load();
    } catch (e: any) {
      notify('Error', e?.response?.data?.error ?? 'Could not save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev: CalendarEvent) => {
    const confirmed = await confirmAsync('Delete Event', `Delete "${ev.title}"?`, 'Delete', true);
    if (!confirmed) return;
    try {
      await calendarApi.remove(ev.id);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? 'Could not delete event.';
      notify('Error', msg);
    }
  };

  const selEvents = eventsOn(selected);
  const selOrders = ordersOn(selected);
  const today = new Date();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
          </View>
          <Text style={styles.headerTitle}>CALENDAR</Text>
        </View>

        <View style={styles.nav}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {cursor.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <>
          {/* Calendar Grid */}
          <View style={styles.gridSection}>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={styles.weekday}>
                  {w}
                </Text>
              ))}
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
                    style={[
                      styles.cell,
                      isToday && !isSelected && styles.cellToday,
                      isSelected && styles.cellSelected,
                    ]}
                    onPress={() => setSelected(date)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        !inMonth && styles.cellTextMuted,
                        isToday && styles.cellTextToday,
                        isSelected && styles.cellTextSelected,
                      ]}
                    >
                      {date.getDate()}
                    </Text>

                    <View style={styles.dotRow}>
                      {dayEvents.slice(0, 3).map((e) => (
                        <View
                          key={e.id}
                          style={[
                            styles.cellDot,
                            { backgroundColor: isSelected ? '#FFFFFF' : e.color },
                          ]}
                        />
                      ))}
                      {dayOrders.length > 0 && (
                        <View
                          style={[
                            styles.cellDot,
                            { backgroundColor: isSelected ? '#FFFFFF' : Colors.info },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Selected day detail */}
          <View style={styles.detail}>
            <View style={styles.detailHeader}>
              <View style={styles.detailDateWrap}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.detailDate} numberOfLines={1}>
                  {selected
                    .toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                    .toUpperCase()}
                </Text>
              </View>

              {canWrite && (
                <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.75}>
                  <Ionicons name="add" size={13} color={Colors.textPrimary} />
                  <Text style={styles.addBtnText}>ADD EVENT</Text>
                </TouchableOpacity>
              )}
            </View>

            {selEvents.length === 0 && selOrders.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Nothing scheduled for this day.</Text>
              </View>
            )}

            <View style={styles.entryList}>
              {selOrders.map((o) => (
                <TouchableOpacity
                  key={`o-${o.id}`}
                  style={styles.entryRow}
                  onPress={() => router.push(`/(app)/orders/${o.id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.entryBar, { backgroundColor: Colors.info }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      Order delivery — {o.orderNo}
                    </Text>
                    <Text style={styles.entrySub} numberOfLines={1}>
                      {o.customer ? o.customer.customerName : 'Order delivery'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}

              {selEvents.map((e) => {
                const canEditThis = e.isMine || canManage;
                return (
                  <View key={`e-${e.id}`} style={styles.entryRow}>
                    <View style={[styles.entryBar, { backgroundColor: e.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.entryTitle} numberOfLines={1}>
                        {e.title}
                      </Text>
                      <Text style={styles.entrySub} numberOfLines={1}>
                        Event · by {e.createdBy.username}
                        {e.isMine ? ' (you)' : ''}
                      </Text>
                    </View>
                    {canEditThis && (
                      <View style={styles.entryActions}>
                        <TouchableOpacity onPress={() => openEdit(e)} hitSlop={8}>
                          <Ionicons name="create-outline" size={16} color={Colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(e)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* Add / Edit event modal */}
      <Modal visible={showAdd} animationType="fade" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={m.backdrop}>
          <View style={m.dialog}>
            <View style={m.dialogHeader}>
              <Text style={m.title}>
                {editingEvent
                  ? 'Edit Event'
                  : `New Event — ${selected.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}`}
              </Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={m.label}>Title</Text>
              <TextInput
                style={m.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Client meeting"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />

              <Text style={m.label}>
                Description <Text style={m.opt}>(optional)</Text>
              </Text>
              <TextInput
                style={[m.input, { minHeight: 64 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Details..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={m.label}>Color</Text>
              <View style={m.colorRow}>
                {EVENT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      m.colorDot,
                      { backgroundColor: c },
                      color === c && m.colorDotActive,
                    ]}
                  />
                ))}
              </View>
            </ScrollView>

            <View style={m.actions}>
              <TouchableOpacity
                style={m.cancelBtn}
                onPress={() => setShowAdd(false)}
                disabled={saving}
              >
                <Text style={m.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#111" />
                ) : (
                  <Text style={m.saveText}>{editingEvent ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    flex: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(0,43,73,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: Colors.textPrimary,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 72,
    textAlign: 'center',
  },

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  gridSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  weekRow: {
    flexDirection: 'row',
    paddingBottom: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 8,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
  },
  cellText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  cellTextMuted: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  cellTextToday: {
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  cellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 2.5,
    height: 4,
    alignItems: 'center',
  },
  cellDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  detail: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  detailDate: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  emptyWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  entryList: {
    gap: 6,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  entryBar: {
    width: 3.5,
    height: 24,
    borderRadius: 2,
    flexShrink: 0,
  },
  entryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  entrySub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});

const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    maxHeight: '80%',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
      default: { elevation: 6 },
    }),
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 5,
    marginTop: 10,
  },
  opt: {
    fontWeight: '400',
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.textPrimary,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
});
