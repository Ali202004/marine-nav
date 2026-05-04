# دليل تجميع التطبيق عبر Termux - شرح كامل

## المقدمة
هناك طريقتان للتجميع:
- **الطريقة السهلة**: EAS Build (التجميع على سحابة Expo - مجاني)
- **الطريقة المتقدمة**: تجميع محلي عبر Termux (يحتاج مساحة 10+ غيغا)

---

## الطريقة الأولى: EAS Build (موصى بها)
### المتطلبات: هاتف Android + انترنت + حساب Expo مجاني

### الخطوة 1: تثبيت Termux
- حمّل Termux من **F-Droid** (وليس Google Play - نسخة Play قديمة):
  - https://f-droid.org/packages/com.termux/

### الخطوة 2: إعداد Termux
```bash
# تحديث الحزم
pkg update && pkg upgrade -y

# تثبيت Node.js و git
pkg install nodejs git -y

# تحقق من الإصدارات
node --version   # يجب أن يكون v20+
npm --version
```

### الخطوة 3: تثبيت EAS CLI
```bash
npm install -g eas-cli
```

### الخطوة 4: نقل ملفات المشروع
```bash
# إنشاء مجلد العمل
mkdir -p ~/projects
cd ~/projects

# إما نقل الملفات من جهاز الكمبيوتر عبر:
# - Termux:API (pkg install termux-api)
# - أو نسخ الملفات يدوياً إلى /sdcard/projects/ ثم:
cp -r /sdcard/projects/marine-nav ~/projects/

# أو استنساخ من Git (إذا رفعت المشروع على GitHub)
git clone https://github.com/username/marine-nav.git
cd marine-nav
```

### الخطوة 5: تثبيت Dependencies
```bash
cd ~/projects/marine-nav/artifacts/marine-nav

# تثبيت npm (pnpm يصعب على Termux)
npm install
```

### الخطوة 6: إعداد eas.json
```bash
cat > eas.json << 'EOF'
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
EOF
```

### الخطوة 7: تسجيل الدخول وبناء
```bash
# تسجيل دخول Expo (إنشاء حساب مجاني من expo.dev)
eas login

# بناء APK مجاني على السحابة
eas build --platform android --profile preview

# سيعطيك رابط لتتبع البناء ورابط لتحميل APK
# البناء يستغرق 5-15 دقيقة على سيرفرات Expo
```

---

## الطريقة الثانية: تجميع محلي في Termux (متقدم)
### تحذير: يحتاج 10+ غيغا مساحة و 4+ ساعات للتجميع الأول

### المتطلبات الإضافية
```bash
# تثبيت Java JDK 17
pkg install openjdk-17 -y

# تثبيت Android SDK (الطريقة الإضافية)
pkg install aapt apksigner zipalign -y

# تحقق من Java
java -version  # يجب: openjdk 17.x.x
```

### إعداد Android SDK يدوياً
```bash
# إنشاء مجلد SDK
mkdir -p ~/android-sdk/cmdline-tools

cd ~/android-sdk/cmdline-tools

# تحميل Command Line Tools
# من الموقع: https://developer.android.com/studio#command-tools
# ابحث عن "commandlinetools-linux-*.zip"
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

unzip commandlinetools-linux-*.zip -d latest
rm commandlinetools-linux-*.zip
```

### إعداد متغيرات البيئة
```bash
# إضافة للـ ~/.bashrc
cat >> ~/.bashrc << 'EOF'
export ANDROID_HOME=$HOME/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/35.0.0
export JAVA_HOME=/data/data/com.termux/files/usr
EOF

source ~/.bashrc
```

### تثبيت Android Build Tools
```bash
# قبول الرخص
yes | sdkmanager --licenses

# تثبيت المكونات المطلوبة
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
sdkmanager "ndk;26.1.10909125"
```

### تجميع التطبيق
```bash
cd ~/projects/marine-nav/artifacts/marine-nav

# تثبيت expo-dev-client و react-native
npm install

# بناء APK محلياً
npx expo run:android --variant release
# ملاحظة: الأمر الأول يستغرق وقتاً طويلاً لتحميل Gradle
```

---

## إنشاء ملف MBTiles للخرائط البحرية (بدون انترنت)

### باستخدام QGIS (مجاني - الكمبيوتر):
1. حمّل QGIS من: https://qgis.org/
2. أضف طبقة OpenSeaMap: `WMS > https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png`
3. صدّر الخريطة: `Processing > Generate XYZ Tiles (MBTiles)`
4. اختر المنطقة والمستويات (5-14 للاستخدام البحري)
5. احفظ كـ `.mbtiles`

### باستخدام TileMill / MapTiler:
- موقع MapTiler: https://www.maptiler.com/
- يدعم تصدير MBTiles مباشرة

### باستخدام mbutil (Python):
```bash
pip install mbutil

# تحويل مجلد من الـ tiles إلى MBTiles
mb-util tiles_folder/ output.mbtiles --scheme=tms
```

### مصادر Tiles البحرية المجانية:
- **OpenSeaMap**: https://tiles.openseamap.org/ (خرائط بحرية مفتوحة)
- **NOAA Charts**: https://tileservice.charts.noaa.gov/ (خرائط أمريكية)
- **OpenStreetMap**: https://tile.openstreetmap.org/ (خرائط عامة)

---

## تثبيت APK على الهاتف

### مباشرة في Termux:
```bash
# تثبيت أدوات ADB
pkg install android-tools -y

# تثبيت APK (إذا كان في نفس الجهاز)
# أولاً: فعّل "مصادر غير معروفة" في إعدادات الأمان
am start -a android.intent.action.VIEW \
  -d file:///sdcard/Download/marine-nav.apk \
  -t application/vnd.android.package-archive
```

### أو انقل APK إلى الهاتف:
1. بعد اكتمال `eas build`، حمّل APK من الرابط المعطى
2. انقله للهاتف عبر USB أو WiFi
3. افتحه وثبّته (يحتاج تفعيل "مصادر غير معروفة")

---

## استكشاف الأخطاء الشائعة

| الخطأ | الحل |
|-------|------|
| `JAVA_HOME not set` | `export JAVA_HOME=/data/data/com.termux/files/usr` |
| `npm EACCES permission` | `npm config set prefix ~/.npm-global` |
| `Gradle build failed` | امسح الكاش: `cd android && ./gradlew clean` |
| `Out of memory` | زد الذاكرة: `export GRADLE_OPTS="-Xmx2048m"` |
| `SDK not found` | تحقق من `ANDROID_HOME` و `sdkmanager --list` |

---

## ملاحظات مهمة
- **EAS Build مجاني** لـ 30 بناء شهرياً لكل حساب
- التجميع المحلي في Termux **بطيء جداً** على الهواتف المتوسطة
- ملف MBTiles للخليج العربي بمستوى 10-14 يحتاج ~500MB - 2GB
