import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type TabKey = 'eas' | 'termux' | 'path';

export default function BuildGuideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('eas');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 8),
        backgroundColor: colors.card,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.muted }]}>
          <Ionicons name="arrow-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>بناء APK</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>دليل شامل خطوة بخطوة</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: 'eas', label: 'EAS Build', icon: 'cloud-outline' },
          { key: 'termux', label: 'Termux', icon: 'terminal-outline' },
          { key: 'path', label: 'مسار MBTiles', icon: 'folder-outline' },
        ] as { key: TabKey; label: string; icon: any }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={15} color={tab === t.key ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.tabText, { color: tab === t.key ? colors.primary : colors.mutedForeground }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'eas' && <EASTab colors={colors} />}
        {tab === 'termux' && <TermuxTab colors={colors} />}
        {tab === 'path' && <PathTab colors={colors} />}
      </ScrollView>
    </View>
  );
}

function EASTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const steps = [
    {
      num: 1,
      title: 'حمّل Termux من F-Droid',
      desc: 'لا تستخدم نسخة Google Play (قديمة)',
      url: 'f-droid.org/packages/com.termux',
      cmd: null,
    },
    {
      num: 2,
      title: 'تحديث وتثبيت Node.js',
      desc: 'في نافذة Termux:',
      url: null,
      cmd: 'pkg update && pkg upgrade -y\npkg install nodejs git -y\nnode --version',
    },
    {
      num: 3,
      title: 'تثبيت EAS CLI',
      desc: 'أداة البناء الرسمية من Expo:',
      url: null,
      cmd: 'npm install -g eas-cli\neas --version',
    },
    {
      num: 4,
      title: 'نقل ملفات المشروع',
      desc: 'انسخ ملفات marine-nav إلى Termux:',
      url: null,
      cmd: 'mkdir -p ~/projects\ncp -r /sdcard/marine-nav ~/projects/\ncd ~/projects/marine-nav/artifacts/marine-nav\nnpm install',
    },
    {
      num: 5,
      title: 'سجّل دخول Expo (مجاني)',
      desc: 'أنشئ حساباً من expo.dev ثم:',
      url: 'expo.dev',
      cmd: 'eas login',
    },
    {
      num: 6,
      title: 'ابنِ APK مجاناً ☁️',
      desc: 'يُجمَّع على سيرفرات Expo (5-15 دقيقة):',
      url: null,
      cmd: 'eas build --platform android --profile preview\n\n# بعد الانتهاء، يعطيك رابط تحميل APK مباشر',
    },
    {
      num: 7,
      title: 'تثبيت APK',
      desc: 'افتح الرابط في المتصفح → حمّل APK → ثبّته\n(فعّل "مصادر غير معروفة" أولاً)',
      url: null,
      cmd: null,
    },
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.infoBanner, { backgroundColor: `${colors.success}18`, borderColor: `${colors.success}40` }]}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoBannerTitle, { color: colors.success }]}>الطريقة الأسهل والموصى بها</Text>
          <Text style={[styles.infoBannerSub, { color: colors.mutedForeground }]}>
            30 بناء مجاني شهرياً • بدون Android SDK • لا تحتاج جهاز كمبيوتر
          </Text>
        </View>
      </View>

      {steps.map((s) => (
        <View key={s.num} style={[styles.stepCard, { backgroundColor: colors.card }]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepBadgeText}>{s.num}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{s.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
            </View>
          </View>
          {s.url && (
            <View style={[styles.urlBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="link-outline" size={14} color={colors.primary} />
              <Text style={[styles.urlText, { color: colors.primary }]}>{s.url}</Text>
            </View>
          )}
          {s.cmd && (
            <View style={[styles.codeBox, { backgroundColor: '#060F1A' }]}>
              <Text style={styles.codeText}>{s.cmd}</Text>
            </View>
          )}
        </View>
      ))}

      <View style={[styles.noteCard, { backgroundColor: `${colors.gold}15`, borderColor: `${colors.gold}40` }]}>
        <MaterialCommunityIcons name="information-outline" size={18} color={colors.gold} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
          إذا طلب EAS إنشاء ملف eas.json، أجب بـ Y. الملف موجود مسبقاً في المشروع.
        </Text>
      </View>
    </View>
  );
}

function TermuxTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  const steps = [
    {
      title: 'تثبيت Java JDK 17',
      desc: 'مطلوب للبناء المحلي:',
      cmd: 'pkg install openjdk-17 -y\njava -version',
    },
    {
      title: 'إعداد Android SDK',
      desc: 'حمّل Command Line Tools من developer.android.com/studio#command-tools',
      cmd: 'mkdir -p ~/android-sdk/cmdline-tools\ncd ~/android-sdk/cmdline-tools\n# انسخ ملف الـ zip إلى /sdcard/ ثم:\ncp /sdcard/commandlinetools-linux-*.zip ~/android-sdk/\ncd ~/android-sdk\nunzip commandlinetools-linux-*.zip -d cmdline-tools/latest',
    },
    {
      title: 'متغيرات البيئة',
      desc: 'أضفها إلى ~/.bashrc:',
      cmd: 'echo \'export ANDROID_HOME=$HOME/android-sdk\' >> ~/.bashrc\necho \'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin\' >> ~/.bashrc\necho \'export PATH=$PATH:$ANDROID_HOME/platform-tools\' >> ~/.bashrc\necho \'export JAVA_HOME=/data/data/com.termux/files/usr\' >> ~/.bashrc\nsource ~/.bashrc',
    },
    {
      title: 'تثبيت Build Tools',
      desc: 'قد يستغرق 30+ دقيقة:',
      cmd: 'yes | sdkmanager --licenses\nsdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"\nsdkmanager "ndk;26.1.10909125"',
    },
    {
      title: 'بناء APK محلياً',
      desc: 'التجميع الأول قد يستغرق ساعة:',
      cmd: 'cd ~/projects/marine-nav/artifacts/marine-nav\nexport GRADLE_OPTS="-Xmx2048m"\nnpx expo run:android --variant release',
    },
  ];

  return (
    <View style={{ gap: 10 }}>
      <View style={[styles.infoBanner, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}40` }]}>
        <Ionicons name="warning-outline" size={22} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoBannerTitle, { color: colors.accent }]}>طريقة متقدمة - بناء محلي</Text>
          <Text style={[styles.infoBannerSub, { color: colors.mutedForeground }]}>
            يحتاج 10+ غيغا مساحة • 4+ ساعات للتجميع الأول • Android SDK كامل
          </Text>
        </View>
      </View>

      {steps.map((s, i) => (
        <View key={i} style={[styles.stepCard, { backgroundColor: colors.card }]}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.stepBadgeText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>{s.title}</Text>
              <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
            </View>
          </View>
          <View style={[styles.codeBox, { backgroundColor: '#060F1A' }]}>
            <Text style={styles.codeText}>{s.cmd}</Text>
          </View>
        </View>
      ))}

      <View style={[styles.stepCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.stepTitle, { color: colors.foreground }]}>استكشاف الأخطاء الشائعة</Text>
        {[
          ['JAVA_HOME not set', 'export JAVA_HOME=/data/data/com.termux/files/usr'],
          ['Out of memory', 'export GRADLE_OPTS="-Xmx2048m -Xms512m"'],
          ['SDK not found', 'تحقق من: echo $ANDROID_HOME'],
          ['Gradle build failed', 'cd android && ./gradlew clean'],
          ['npm permission error', 'npm config set prefix ~/.npm-global'],
        ].map(([err, fix], i) => (
          <View key={i} style={[styles.errorRow, { borderColor: colors.border }]}>
            <Text style={[styles.errorTxt, { color: colors.destructive }]}>✗ {err}</Text>
            <Text style={[styles.fixTxt, { color: colors.success }]}>→ {fix}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PathTab({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 12 }}>
      {/* Box 1 — File Manager path */}
      <View style={[styles.pathMainCard, { backgroundColor: colors.card }]}>
        <View style={styles.pathMainHeader}>
          <View style={[styles.pathIcon, { backgroundColor: `${colors.gold}22` }]}>
            <Ionicons name="folder" size={24} color={colors.gold} />
          </View>
          <View>
            <Text style={[styles.pathMainTitle, { color: colors.foreground }]}>مسار MBTiles في مدير الملفات</Text>
            <Text style={[styles.pathMainSub, { color: colors.mutedForeground }]}>بعد تثبيت APK</Text>
          </View>
        </View>
        <View style={[styles.pathBox, { backgroundColor: '#060F1A' }]}>
          <Text style={[styles.pathBoxText, { color: '#7FC4FD' }]}>
            {'Android/\n  data/\n    com.marine.navigator/\n      files/\n        map.mbtiles  ← ضع الملف هنا'}
          </Text>
        </View>
        <View style={[styles.infoBox2, { backgroundColor: colors.muted }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.infoText2, { color: colors.mutedForeground }]}>
            افتح مدير الملفات → التخزين الداخلي → Android → data → com.marine.navigator → files
          </Text>
        </View>
      </View>

      {/* Box 2 — Internal DB path */}
      <View style={[styles.pathMainCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>المسار الداخلي (بعد تحميل الملف)</Text>
        <View style={[styles.pathBox, { backgroundColor: '#060F1A' }]}>
          <Text style={[styles.pathBoxText, { color: '#7FC4FD' }]}>
            /data/user/0/com.marine.navigator/files/SQLite/map.mbtiles
          </Text>
        </View>
        <Text style={[styles.noteSmall, { color: colors.mutedForeground }]}>
          هذا المسار يُستخدم داخلياً بعد نسخ الملف عبر منتقي الملفات. لا يمكن الوصول إليه بدون صلاحيات Root.
        </Text>
      </View>

      {/* Box 3 — ADB method */}
      <View style={[styles.pathMainCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>نقل الملف عبر ADB (من الكمبيوتر)</Text>
        <View style={[styles.codeBox, { backgroundColor: '#060F1A' }]}>
          <Text style={styles.codeText}>
            {'# على جهاز الكمبيوتر بعد توصيل USB:\nadb push your_map.mbtiles \\\n  /sdcard/Android/data/com.marine.navigator/files/map.mbtiles'}
          </Text>
        </View>
        <Text style={[styles.noteSmall, { color: colors.mutedForeground }]}>
          حمّل ADB من: developer.android.com/tools/releases/platform-tools
        </Text>
      </View>

      {/* Box 4 — MBTiles sources */}
      <View style={[styles.pathMainCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>تحميل خرائط بحرية مجانية</Text>
        {[
          { name: 'OpenSeaMap', url: 'openseamap.org', note: 'خرائط بحرية مع إشارات الملاحة' },
          { name: 'QGIS (برنامج)', url: 'qgis.org', note: 'صدّر MBTiles لأي منطقة' },
          { name: 'MapTiler Cloud', url: 'cloud.maptiler.com', note: 'مجاني للاستخدام الشخصي' },
          { name: 'SAS Planet', url: 'sasgis.org', note: 'تحميل ودمج خرائط متعددة' },
        ].map((src, i) => (
          <View key={i} style={[styles.sourceItem, { borderColor: colors.border }]}>
            <View style={[styles.srcDot, { backgroundColor: colors.primary }]} />
            <View>
              <Text style={[styles.srcName, { color: colors.foreground }]}>{src.name}</Text>
              <Text style={[styles.srcUrl, { color: colors.primary }]}>{src.url}</Text>
              <Text style={[styles.srcNote, { color: colors.mutedForeground }]}>{src.note}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Box 5 — Sizes */}
      <View style={[styles.pathMainCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>حجم ملف MBTiles المتوقع</Text>
        {[
          ['منطقة صغيرة (ميناء - 10km²)', 'zoom 10-18', '~20 MB'],
          ['خليج / بحر صغير', 'zoom 8-16', '~150 MB'],
          ['بحر كامل (مثل الخليج)', 'zoom 5-15', '~800 MB'],
          ['منطقة كبيرة مع تفاصيل عالية', 'zoom 4-17', '~2+ GB'],
        ].map(([area, zoom, size], i) => (
          <View key={i} style={[styles.sizeRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sizeArea, { color: colors.foreground }]}>{area}</Text>
              <Text style={[styles.sizeZoom, { color: colors.mutedForeground }]}>{zoom}</Text>
            </View>
            <Text style={[styles.sizeVal, { color: colors.gold }]}>{size}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 14, gap: 0, paddingBottom: 40 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  infoBannerTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  infoBannerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3, lineHeight: 17 },
  stepCard: { borderRadius: 14, padding: 14, gap: 10, marginBottom: 8 },
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  stepBadgeText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  stepTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  stepDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 17 },
  urlBox: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  urlText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  codeBox: { borderRadius: 10, padding: 12 },
  codeText: { color: '#7FC4FD', fontSize: 11, fontFamily: 'Inter_500Medium', lineHeight: 19 },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4 },
  noteText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  errorRow: { paddingVertical: 8, borderBottomWidth: 1, gap: 3 },
  errorTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  fixTxt: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  pathMainCard: { borderRadius: 14, padding: 14, gap: 10 },
  pathMainHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pathIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pathMainTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  pathMainSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pathBox: { borderRadius: 10, padding: 12 },
  pathBoxText: { fontSize: 12, fontFamily: 'Inter_700Bold', lineHeight: 22, letterSpacing: 0.3 },
  infoBox2: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10 },
  infoText2: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  noteSmall: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },
  sourceItem: { flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  srcDot: { width: 7, height: 7, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  srcName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  srcUrl: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  srcNote: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  sizeArea: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  sizeZoom: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  sizeVal: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
