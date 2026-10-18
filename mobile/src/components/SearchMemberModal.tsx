/**
 * SearchMemberModal — recherche un utilisateur par nom/email/téléphone
 * et l'ajoute directement au groupe.
 */
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { authApi, membersApi, UserProfile } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

interface SearchMemberModalProps {
  visible: boolean;
  groupId: string;
  /** IDs des membres déjà dans le groupe (pour griser les résultats) */
  existingMemberIds: string[];
  onClose: () => void;
  onAdded: () => void;
}

export function SearchMemberModal({
  visible,
  groupId,
  existingMemberIds,
  onClose,
  onAdded,
}: SearchMemberModalProps) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding]     = useState<string | null>(null); // userId en cours d'ajout

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await authApi.search(text.trim());
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(user: UserProfile) {
    setAdding(user.id);
    try {
      await membersApi.add(groupId, user.id);
      onAdded();
      Alert.alert('Succès', `${user.name} a été ajouté au groupe.`);
      // Retirer des résultats
      setResults((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      Alert.alert('Erreur', (err as Error).message);
    } finally {
      setAdding(null);
    }
  }

  function handleClose() {
    setQuery('');
    setResults([]);
    onClose();
  }

  function renderItem({ item }: { item: UserProfile }) {
    const isAlreadyMember = existingMemberIds.includes(item.id);

    return (
      <View style={s.resultRow}>
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>{item.name[0].toUpperCase()}</Text>
        </View>

        {/* Infos */}
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{item.name}</Text>
          <Text style={s.contact} numberOfLines={1}>
            {item.email ?? item.phone ?? '—'}
          </Text>
        </View>

        {/* Action */}
        {isAlreadyMember ? (
          <View style={s.alreadyBadge}>
            <Text style={s.alreadyText}>Déjà membre</Text>
          </View>
        ) : (
          <Pressable
            onPress={() => handleAdd(item)}
            style={s.addBtn}
            disabled={adding === item.id}
          >
            {adding === item.id ? (
              <ActivityIndicator size="small" color={Palette.neutral0} />
            ) : (
              <Ionicons name="person-add-outline" size={18} color={Palette.neutral0} />
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Ajouter un membre</Text>
          <Pressable onPress={handleClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={Palette.neutral600} />
          </Pressable>
        </View>

        {/* Barre de recherche */}
        <View style={s.searchBar}>
          <Input
            placeholder="Nom, email ou numéro de téléphone…"
            value={query}
            onChangeText={handleSearch}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={
              searching
                ? <ActivityIndicator size="small" color={Palette.primary500} />
                : <Ionicons name="search-outline" size={18} color={Palette.neutral400} />
            }
          />
        </View>

        {/* Résultats */}
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            query.length >= 2 && !searching ? (
              <View style={s.emptyWrap}>
                <Ionicons name="person-outline" size={40} color={Palette.neutral300} />
                <Text style={s.emptyText}>Aucun utilisateur trouvé</Text>
                <Text style={s.emptySubText}>
                  Vérifiez l'email ou le numéro de téléphone
                </Text>
              </View>
            ) : query.length < 2 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="search-outline" size={40} color={Palette.neutral300} />
                <Text style={s.emptyText}>Recherchez un utilisateur</Text>
                <Text style={s.emptySubText}>
                  Tapez au moins 2 caractères pour lancer la recherche
                </Text>
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.neutral0 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.neutral100,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Palette.primary500 },
  closeBtn: { padding: Spacing.one },

  searchBar: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.neutral100,
  },

  list: { paddingHorizontal: Spacing.four, paddingBottom: 100 },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.neutral100,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Palette.primary500 },

  name: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Palette.neutral800 },
  contact: { fontSize: FontSize.xs, color: Palette.neutral400, marginTop: 2 },

  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },

  alreadyBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Palette.neutral100,
  },
  alreadyText: { fontSize: FontSize.xs, color: Palette.neutral500 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: Spacing.seven,
    gap: Spacing.two,
  },
  emptyText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Palette.neutral600 },
  emptySubText: { fontSize: FontSize.sm, color: Palette.neutral400, textAlign: 'center' },
});
