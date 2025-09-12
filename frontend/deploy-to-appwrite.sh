#!/bin/bash

# EcoTrace Appwrite Deployment Script
set -e

APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
PROJECT_ID="68bf3f5e00183c7886b0"
API_KEY="standard_929744aca2c7871cb066a6a6ef98ebb385dfb308b7d862ac7dc3587b700d5d6ab8b2e0a6d576f6460d598c6766b84b951416a69ed38dc13cd5411b28a9139c7082c1cfc5c334b8f78c3d048784088f0d61bc69684877df4cccc92caecada5f1262626d294f73b5404c02f20463e1b2fb4e906bcc6f471c00f38ac71b751bf504"

echo "🚀 Deploying EcoTrace to Appwrite..."

# Step 1: Create a site
echo "📝 Creating site..."
SITE_RESPONSE=$(curl -s -X POST \
  "${APPWRITE_ENDPOINT}/storage/buckets" \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Response-Format: 1.6.0" \
  -H "X-Appwrite-Project: ${PROJECT_ID}" \
  -H "X-Appwrite-Key: ${API_KEY}" \
  -d '{
    "bucketId": "ecotrace-site",
    "name": "EcoTrace Static Site",
    "permissions": ["read(\"any\")"],
    "fileSecurity": false,
    "enabled": true
  }' || echo "Bucket may already exist")

echo "Site creation response: $SITE_RESPONSE"

# Step 2: Create index.html file
echo "📁 Uploading index.html..."
curl -X POST \
  "${APPWRITE_ENDPOINT}/storage/buckets/ecotrace-site/files" \
  -H "X-Appwrite-Response-Format: 1.6.0" \
  -H "X-Appwrite-Project: ${PROJECT_ID}" \
  -H "X-Appwrite-Key: ${API_KEY}" \
  -F 'fileId=index' \
  -F 'file=@index.html' \
  -F 'permissions=["read(\"any\")"]'

# Step 3: Upload the build directory as a zip
echo "📦 Creating build archive..."
cd public/build && zip -r ../../build.zip . && cd ../..

echo "⬆️ Uploading build files..."
curl -X POST \
  "${APPWRITE_ENDPOINT}/storage/buckets/ecotrace-site/files" \
  -H "X-Appwrite-Response-Format: 1.6.0" \
  -H "X-Appwrite-Project: ${PROJECT_ID}" \
  -H "X-Appwrite-Key: ${API_KEY}" \
  -F 'fileId=build-assets' \
  -F 'file=@build.zip' \
  -F 'permissions=["read(\"any\")"]'

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your site files are uploaded to Appwrite Storage"
echo "📊 Access your files via:"
echo "   - Index: ${APPWRITE_ENDPOINT}/storage/buckets/ecotrace-site/files/index/view?project=${PROJECT_ID}"
echo "   - Assets: ${APPWRITE_ENDPOINT}/storage/buckets/ecotrace-site/files/build-assets/view?project=${PROJECT_ID}"
echo ""
echo "📝 To set up proper hosting, configure a custom domain in your Appwrite Console"
echo "   or use the storage URLs as a basic static site."

# Clean up
rm -f build.zip site.tar.gz