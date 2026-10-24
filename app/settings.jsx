import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Card from '../src/components/Card';
import SectionHeader from '../src/components/SectionHeader';
import { SETTINGS_KEYS } from '../src/constants';
import { deleteAllData, getRecordCounts } from '../src/database/maintenance';
import { getSetting } from '../src/database/settingsRepository';
import { useFocusedQuery } from '../src/hooks/useFocusedQuery';
import {
  BackupValidationError,
  exportBackup,
  exportTransactionsCsv,
  pickBackupFile,
  readBackupFile,
  restoreBackup,
} from '../src/services/backupService';
import { colors, layout, radius, spacing } from '../src/theme';
import { formatDateTimeLabel } from '../src/utils/dates';

function SettingsRow({ icon, title, description, onPress, tone = 'default', busy = false, last = false }) {
  const color = tone === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.pressed]}
    >
      <View style={[styles.rowIcon, tone === 'danger' && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={tone === 'danger' ? colors.danger : colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color }]}>{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
      )}
    </Pressable>
  );
}

function describeCounts(counts) {
  return `${counts.incomes} income, ${counts.expenses} expense, ${counts.goals} goal and ${counts.goalTransactions} savings records`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => {
    const [counts, lastBackupAt] = await Promise.all([getRecordCounts(), getSetting(SETTINGS_KEYS.lastBackupAt)]);
    return { counts, lastBackupAt };
  }, []);
  const { data, reload } = useFocusedQuery(load);

  const runTask = async (key, task) => {
    setBusy(key);
    try {
      await task();
    } catch (error) {
      Alert.alert('Something went wrong', error.message);
    } finally {
      setBusy(null);
      reload();
    }
  };

  const handleExportBackup = () =>
    runTask('backup', async () => {
      const result = await exportBackup();
      Alert.alert('Backup ready', `${result.fileName} contains ${describeCounts(result.counts)}. Keep a copy somewhere safe, such as Google Drive.`);
    });

  const handleExportCsv = () =>
    runTask('csv', async () => {
      const result = await exportTransactionsCsv();
      Alert.alert('CSV ready', `${result.fileName} contains ${result.rowCount} transactions.`);
    });

  const handleRestore = () =>
    runTask('restore', async () => {
      const file = await pickBackupFile();
      if (!file) {
        return;
      }
      let backup;
      try {
        backup = await readBackupFile(file);
      } catch (error) {
        if (error instanceof BackupValidationError) {
          Alert.alert('Backup not restored', error.message);
          return;
        }
        throw error;
      }

      const existing = data?.counts;
      const hasExisting = existing && Object.values(existing).some((count) => count > 0);
      const summary = `The backup${backup.exportedAt ? ` from ${formatDateTimeLabel(backup.exportedAt)}` : ''} contains ${describeCounts(backup.counts)}.`;

      await new Promise((resolve) => {
        Alert.alert(
          hasExisting ? 'Replace existing data?' : 'Restore backup?',
          hasExisting
            ? `${summary}\n\nAll ${describeCounts(existing)} currently on this phone will be replaced. This cannot be undone.`
            : summary,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            {
              text: hasExisting ? 'Replace' : 'Restore',
              style: 'destructive',
              onPress: async () => {
                try {
                  const counts = await restoreBackup(backup);
                  Alert.alert('Restore complete', `Restored ${describeCounts(counts)}.`);
                } catch (error) {
                  Alert.alert('Restore failed', `${error.message}\n\nNo changes were made.`);
                } finally {
                  resolve();
                }
              },
            },
          ],
          { cancelable: true, onDismiss: () => resolve() }
        );
      });
    });

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all data?',
      'Every income, expense, goal and savings record will be removed from this phone. Export a backup first if you might need them again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you sure?', 'This cannot be undone.', [
              { text: 'Keep my data', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () =>
                  runTask('delete', async () => {
                    await deleteAllData();
                    Alert.alert('Data deleted', 'The app has been reset.');
                    router.back();
                  }),
              },
            ]),
        },
      ]
    );
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={layout.screen} contentContainerStyle={layout.content}>
      <Card style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.infoBody}>
          <Text style={styles.infoTitle}>Everything stays on this phone</Text>
          <Text style={styles.infoText}>
            No account, no internet needed. Because there is no cloud copy, export a backup regularly and keep it
            somewhere safe.
          </Text>
        </View>
      </Card>

      <SectionHeader title="Backup" />
      <Card padded={false}>
        <SettingsRow
          icon="cloud-upload-outline"
          title="Export backup (JSON)"
          description={
            data?.lastBackupAt
              ? `Last backup ${formatDateTimeLabel(data.lastBackupAt)}`
              : 'No backup exported yet'
          }
          onPress={handleExportBackup}
          busy={busy === 'backup'}
        />
        <SettingsRow
          icon="document-text-outline"
          title="Export transactions (CSV)"
          description="Open income and expenses in Excel or Google Sheets"
          onPress={handleExportCsv}
          busy={busy === 'csv'}
        />
        <SettingsRow
          icon="cloud-download-outline"
          title="Restore from backup"
          description="Replace the data on this phone with a backup file"
          onPress={handleRestore}
          busy={busy === 'restore'}
          last
        />
      </Card>

      <SectionHeader title="Data on this phone" />
      <Card>
        {data ? (
          <>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>Income entries</Text>
              <Text style={styles.countValue}>{data.counts.incomes}</Text>
            </View>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>Expenses</Text>
              <Text style={styles.countValue}>{data.counts.expenses}</Text>
            </View>
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>Savings goals</Text>
              <Text style={styles.countValue}>{data.counts.goals}</Text>
            </View>
            <View style={[styles.countRow, styles.countRowLast]}>
              <Text style={styles.countLabel}>Savings records</Text>
              <Text style={styles.countValue}>{data.counts.goalTransactions}</Text>
            </View>
          </>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </Card>

      <SectionHeader title="Danger zone" />
      <Card padded={false}>
        <SettingsRow
          icon="trash-outline"
          title="Delete all data"
          description="Reset the app to a clean state"
          onPress={handleDeleteAll}
          tone="danger"
          busy={busy === 'delete'}
          last
        />
      </Card>

      <Text style={styles.footer}>Salary & Expense Tracker · v{version} · Amounts in ₹</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoBody: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  infoText: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.neutralSoft,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowIconDanger: {
    backgroundColor: colors.expenseSoft,
  },
  rowBody: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDescription: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  countRowLast: {
    borderBottomWidth: 0,
  },
  countLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  countValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  footer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: 12,
    color: colors.subtle,
  },
});
