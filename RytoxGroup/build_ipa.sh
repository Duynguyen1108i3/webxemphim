#!/usr/bin/env bash
# ==============================================================================
# RytoxGroup iOS App — Automated Build & TrollStore IPA Packager
# Target: iOS 16.0 - 18.0
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="RytoxGroup"
SCHEME="RytoxGroup"
BUILD_DIR="${SCRIPT_DIR}/build"
DERIVED_DATA="${BUILD_DIR}/DerivedData"
ARCHIVE_PATH="${BUILD_DIR}/${PROJECT_NAME}.xcarchive"
PAYLOAD_DIR="${BUILD_DIR}/Payload"
OUTPUT_IPA="${SCRIPT_DIR}/${PROJECT_NAME}.ipa"

echo "=========================================================="
echo "🎬 Building ${PROJECT_NAME} for iOS 16.0 - 18.0 (TrollStore)"
echo "=========================================================="

# 1. Clean previous build artifacts
rm -rf "${BUILD_DIR}" "${OUTPUT_IPA}"
mkdir -p "${BUILD_DIR}" "${PAYLOAD_DIR}"

# 2. Build Release .app for Generic iOS Device (Unsigned / Ad-hoc for TrollStore)
echo "📦 Compiling Xcode Project with Release Configuration..."

xcodebuild \
    -project "${SCRIPT_DIR}/${PROJECT_NAME}.xcodeproj" \
    -scheme "${SCHEME}" \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -derivedDataPath "${DERIVED_DATA}" \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGN_IDENTITY="" \
    PROVISIONING_PROFILE_SPECIFIER="" \
    build

# 3. Locate compiled .app bundle
APP_BUNDLE=$(find "${DERIVED_DATA}/Build/Products/Release-iphoneos" -name "${PROJECT_NAME}.app" -maxdepth 1 | head -n 1)

if [[ ! -d "${APP_BUNDLE}" ]]; then
    echo "❌ Error: Could not find compiled ${PROJECT_NAME}.app in Products folder!"
    exit 1
fi

echo "✅ Compiled App Bundle found: ${APP_BUNDLE}"

# 4. Assemble TrollStore Payload structure
echo "📁 Assembling TrollStore IPA Payload..."
cp -R "${APP_BUNDLE}" "${PAYLOAD_DIR}/"

# 5. Pack IPA
echo "🗜️ Packaging ${OUTPUT_IPA}..."
cd "${BUILD_DIR}"
zip -qry "${OUTPUT_IPA}" Payload

echo "=========================================================="
echo "🎉 BUILD SUCCESSFUL!"
echo "📍 File IPA: ${OUTPUT_IPA}"
echo "📱 Để cài đặt: Chuyển file ${PROJECT_NAME}.ipa sang iPhone qua AirDrop / iCloud / Safari và chọn 'Open in TrollStore'."
echo "=========================================================="
