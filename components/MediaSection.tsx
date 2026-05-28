import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Modal, Image, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { api, MediaFile } from '../services/api';
import { Colors } from '../constants/colors';
import {
  useMediaUpload, MediaEntity,
  ALLOWED_MIME_TYPES, ALLOWED_MIME_SET,
} from '../hooks/useMediaUpload';
import CameraUploadSheet from './CameraUploadSheet';

export type { MediaFile };

interface Props {
  entity:    MediaEntity;
  entityId:  number;
  files:     MediaFile[];
  onRefresh: () => void;
}

// ── File-type helpers ─────────────────────────────────────────────────────────

function fileIcon(fileType: string): any {
  if (fileType.includes('pdf'))   return 'document-text-outline';
  if (fileType.includes('image')) return 'image-outline';
  if (fileType.includes('word') || fileType.includes('document')) return 'document-outline';
  if (fileType.includes('sheet') || fileType.includes('excel'))   return 'grid-outline';
  return 'attach-outline';
}

function fileIconColor(fileType: string): string {
  if (fileType.includes('pdf'))   return Colors.error;
  if (fileType.includes('image')) return Colors.info;
  if (fileType.includes('word') || fileType.includes('document')) return '#1565C0';
  if (fileType.includes('sheet') || fileType.includes('excel'))   return Colors.success;
  return Colors.textSecondary;
}

function fmtSize(bytes: string | null): string {
  if (!bytes) return '';
  const b = parseInt(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

const SCREEN  = Dimensions.get('window');
const TOP_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 54;

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaSection({ entity, entityId, files, onRefresh }: Props) {
  // Camera / upload sheet
  const [showCamera,   setShowCamera]   = useState(false);
  // File viewer
  const [openingId,    setOpeningId]    = useState<number | null>(null);
  const [preview,      setPreview]      = useState<{ url: string; fileName: string } | null>(null);
  const [thumbnails,   setThumbnails]   = useState<Record<number, string>>({});
  // Bulk select
  const [selectMode,   setSelectMode]   = useState(false);
  const [selected,     setSelected]     = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); };

  // Web: upload hook (mobile uploads go through CameraUploadSheet instead)
  const { upload, uploading, progress } = useMediaUpload(entity, entityId);

  // Web: open file picker directly; Mobile: open upload sheet
  const handleAttach = async () => {
    if (Platform.OS !== 'web') { setShowCamera(true); return; }

    const result = await DocumentPicker.getDocumentAsync({
      type: [...ALLOWED_MIME_TYPES],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return;

    const valid = result.assets.filter(a => !a.mimeType || ALLOWED_MIME_SET.has(a.mimeType));
    if (!valid.length) return;

    const ok = await upload(valid.map(a => ({
      uri: a.uri, name: a.name, mimeType: a.mimeType || 'application/octet-stream',
    })));
    if (ok) onRefresh();
  };

  // ── Auto-load image thumbnails ────────────────────────────────────────────
  useEffect(() => {
    files.forEach(async (file) => {
      if (!file.fileType.includes('image') || thumbnails[file.id]) return;
      try {
        const { data } = await api.get(`/api/media/presign/${entity}/${file.id}`);
        setThumbnails(prev => ({ ...prev, [file.id]: data.url }));
      } catch { /* icon fallback */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, entity]);


  // ── Open / preview ────────────────────────────────────────────────────────
  const handleOpen = async (file: MediaFile) => {
    if (selectMode) {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(file.id) ? next.delete(file.id) : next.add(file.id);
        return next;
      });
      return;
    }

    const isImage = file.fileType.includes('image');
    if (isImage) {
      if (thumbnails[file.id]) {
        setPreview({ url: thumbnails[file.id], fileName: file.fileName });
        return;
      }
      setOpeningId(file.id);
      try {
        const { data } = await api.get(`/api/media/presign/${entity}/${file.id}`);
        setThumbnails(prev => ({ ...prev, [file.id]: data.url }));
        setPreview({ url: data.url, fileName: file.fileName });
      } catch { Alert.alert('Error', 'Could not open file.'); }
      finally { setOpeningId(null); }
    } else {
      setOpeningId(file.id);
      try {
        const { data } = await api.get(`/api/media/presign/${entity}/${file.id}`);
        await Linking.openURL(data.url);
      } catch { Alert.alert('Error', 'Could not open file.'); }
      finally { setOpeningId(null); }
    }
  };

  // ── Single delete ─────────────────────────────────────────────────────────
  const handleDelete = (file: MediaFile) => {
    const doDelete = async () => {
      try {
        await api.delete(`/api/media/${entity}/${file.id}`);
        onRefresh();
      } catch { Alert.alert('Error', 'Could not delete file.'); }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${file.fileName}"? This cannot be undone.`)) doDelete();
      return;
    }
    Alert.alert('Delete file', `Delete "${file.fileName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = () => {
    const count = selected.size;
    if (!count) return;

    const doDelete = async () => {
      setBulkDeleting(true);
      await Promise.all([...selected].map(id =>
        api.delete(`/api/media/${entity}/${id}`).catch(() => {}),
      ));
      setBulkDeleting(false);
      exitSelectMode();
      onRefresh();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${count} file(s)? This cannot be undone.`)) doDelete();
      return;
    }
    Alert.alert('Delete files', `Delete ${count} selected file(s)? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: `Delete ${count}`, style: 'destructive', onPress: doDelete },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.section}>

      {/* Header */}
      <View style={styles.header}>
        {selectMode ? (
          <>
            <TouchableOpacity
              onPress={() => {
                if (selected.size === files.length) setSelected(new Set());
                else setSelected(new Set(files.map(f => f.id)));
              }}
            >
              <Text style={styles.selectCount}>
                {selected.size === files.length && files.length > 0
                  ? 'Deselect all'
                  : `${selected.size} of ${files.length} selected`}
              </Text>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.cancelSelectBtn} onPress={exitSelectMode}>
                <Text style={styles.cancelSelectText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteSelectedBtn, (!selected.size || bulkDeleting) && { opacity: 0.5 }]}
                onPress={handleBulkDelete}
                disabled={!selected.size || bulkDeleting}
              >
                {bulkDeleting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.deleteSelectedText}>
                      Delete {selected.size > 0 ? `(${selected.size})` : ''}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Attachments</Text>
            <View style={styles.headerRight}>
              {files.length > 0 && (
                <TouchableOpacity style={styles.iconBtn} onPress={() => setSelectMode(true)}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.iconBtnText}>Select</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.attachBtn, uploading && styles.attachBtnDisabled]}
                onPress={handleAttach}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading
                  ? <ActivityIndicator size="small" color={Colors.accent} />
                  : <Ionicons name="attach-outline" size={14} color={Colors.accent} />}
                <Text style={styles.attachBtnText}>
                  {uploading && progress ? `${progress.done}/${progress.total}` : 'Attach'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* File list */}
      {files.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={28} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No attachments</Text>
        </View>
      ) : (
        files.map(file => {
          const isImage   = file.fileType.includes('image');
          const thumbUrl  = thumbnails[file.id];
          const hasThumb  = isImage && !!thumbUrl;
          const isSelected = selected.has(file.id);

          return (
            <TouchableOpacity
              key={file.id}
              style={[styles.fileRow, isSelected && styles.fileRowSelected]}
              onPress={() => handleOpen(file)}
              activeOpacity={0.75}
            >
              {selectMode && (
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              )}

              <View style={[styles.thumb, hasThumb && styles.thumbImage]}>
                {hasThumb ? (
                  <Image
                    source={{ uri: thumbUrl }}
                    style={styles.thumbImg}
                    resizeMode="cover"
                    onError={() => setThumbnails(prev => {
                      const n = { ...prev }; delete n[file.id]; return n;
                    })}
                  />
                ) : isImage && !thumbUrl ? (
                  <ActivityIndicator size="small" color={Colors.info} />
                ) : (
                  <Ionicons name={fileIcon(file.fileType)} size={20} color={fileIconColor(file.fileType)} />
                )}
              </View>

              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{file.fileName}</Text>
                <Text style={styles.fileMeta}>
                  {fmtSize(file.fileSize)}{file.fileSize ? ' · ' : ''}
                  {new Date(file.uploadedAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: '2-digit',
                  })}
                </Text>
              </View>

              {!selectMode && (
                <>
                  {openingId === file.id
                    ? <ActivityIndicator size="small" color={Colors.info} style={{ width: 32 }} />
                    : (
                      <View style={styles.actionBtn}>
                        <Ionicons
                          name={isImage ? 'eye-outline' : 'open-outline'}
                          size={16}
                          color={Colors.info}
                        />
                      </View>
                    )
                  }
                  <TouchableOpacity
                    onPress={e => { e.stopPropagation(); handleDelete(file); }}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </>
              )}
            </TouchableOpacity>
          );
        })
      )}

      {/* Full-screen image preview */}
      {preview && (
        <Modal
          visible
          transparent={false}
          animationType="fade"
          onRequestClose={() => setPreview(null)}
          statusBarTranslucent
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalHeader, { paddingTop: TOP_PAD }]}>
              <Text style={styles.modalFileName} numberOfLines={1}>{preview.fileName}</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(preview.url)}
                style={styles.modalIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPreview(null)}
                style={styles.modalIconBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Image
                source={{ uri: preview.url }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Camera upload sheet — reusable across all entities */}
      <CameraUploadSheet
        visible={showCamera}
        entity={entity}
        entityId={entityId}
        onClose={() => setShowCamera(false)}
        onUploaded={onRefresh}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    backgroundColor: Colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  title: {
    fontSize: 13, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  iconBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  cameraBtn:   { borderColor: Colors.info + '55', backgroundColor: Colors.infoLight },

  attachBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accentLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  attachBtnDisabled: { opacity: 0.6 },
  attachBtnText:     { fontSize: 12, fontWeight: '600', color: Colors.accent },

  selectCount:       { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  cancelSelectBtn:   { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  cancelSelectText:  { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  deleteSelectedBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, backgroundColor: Colors.error },
  deleteSelectedText:{ fontSize: 12, fontWeight: '700', color: '#fff' },

  empty:     { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { fontSize: 13, color: Colors.textMuted },

  fileRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  fileRowSelected: { backgroundColor: 'rgba(255,153,0,0.07)' },

  checkbox:        { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: Colors.accent, borderColor: Colors.accent },

  thumb:      { width: 80, height: 80, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, overflow: 'hidden' },
  thumbImage: { backgroundColor: '#000' },
  thumbImg:   { width: 80, height: 80 },

  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  fileMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actionBtn:{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, backgroundColor: '#1c1c1e' },
  modalFileName:  { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', marginRight: 8 },
  modalIconBtn:   { padding: 8 },
  modalBody:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  previewImage:   { width: SCREEN.width, height: SCREEN.height * 0.82 },

  toast:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#B71C1C', borderRadius: 8, margin: 10, marginBottom: 0, padding: 10 },
  toastText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '500' },
});
