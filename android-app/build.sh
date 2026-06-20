#!/bin/bash
set -e

# =============================================
#  StreamFlix Android APK Builder
# =============================================
#  Usage: ./build.sh <your-deployed-url>
#  Example: ./build.sh https://movie.yourdomain.com
# =============================================

if [ -z "$1" ]; then
  echo "Error: Please provide your deployed server URL"
  echo "Usage: ./build.sh https://your-domain.com"
  exit 1
fi

SERVER_URL="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> StreamFlix Android Builder"
echo "==> Server URL: $SERVER_URL"
echo ""

# Step 1: Replace URL in index.html
echo "[1/5] Configuring server URL..."
sed "s|__SERVER_URL__|${SERVER_URL}|g" www/index.html > www/index.tmp && mv www/index.tmp www/index.html
echo "      Done."

# Step 2: Install dependencies
echo "[2/5] Installing Capacitor dependencies..."
npm install
echo "      Done."

# Step 3: Initialize Capacitor (if not already)
if [ ! -d "android" ]; then
  echo "[3/5] Adding Android platform..."
  npx cap add android
  echo "      Done."
else
  echo "[3/5] Android platform already exists, skipping..."
fi

# Step 4: Sync
echo "[4/5] Syncing web assets to Android..."
npx cap sync android
echo "      Done."

# Step 5: Build APK
echo "[5/5] Building APK..."
echo ""
echo "  To build the APK, open the project in Android Studio:"
echo "    npx cap open android"
echo ""
echo "  Or build from command line (requires Android SDK):"
echo "    cd android && ./gradlew assembleDebug"
echo ""
echo "  APK output: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""

# Try command line build if gradle is available
if command -v gradle &> /dev/null || [ -f "android/gradlew" ]; then
  echo "  Attempting command-line build..."
  cd android
  chmod +x gradlew
  ./gradlew assembleDebug 2>&1 || {
    echo ""
    echo "  Command-line build failed. Please use Android Studio:"
    echo "    cd $SCRIPT_DIR && npx cap open android"
    exit 1
  }
  cd ..
  APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
  if [ -f "$APK_PATH" ]; then
    echo ""
    echo "==> BUILD SUCCESSFUL!"
    echo "==> APK: $SCRIPT_DIR/$APK_PATH"
    echo ""
    echo "  To install on a device:"
    echo "    adb install $APK_PATH"
  fi
else
  echo "  Android SDK/Gradle not found in PATH."
  echo "  Please open in Android Studio: npx cap open android"
fi
