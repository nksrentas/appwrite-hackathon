#!/bin/bash

# Deploy EcoTrace to Appwrite Hosting
APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
PROJECT_ID="68bf3f5e00183c7886b0"
API_KEY="standard_929744aca2c7871cb066a6a6ef98ebb385dfb308b7d862ac7dc3587b700d5d6ab8b2e0a6d576f6460d598c6766b84b951416a69ed38dc13cd5411b28a9139c7082c1cfc5c334b8f78c3d048784088f0d61bc69684877df4cccc92caecada5f1262626d294f73b5404c02f20463e1b2fb4e906bcc6f471c00f38ac71b751bf504"

# Create a zip file of the public directory
cd public
zip -r ../site.zip ./*
cd ..

# Upload to Appwrite using curl
echo "Creating site..."
SITE_RESPONSE=$(curl -X POST \
  ${APPWRITE_ENDPOINT}/storage/buckets \
  -H "Content-Type: application/json" \
  -H "X-Appwrite-Response-Format: 1.6.0" \
  -H "X-Appwrite-Project: ${PROJECT_ID}" \
  -H "X-Appwrite-Key: ${API_KEY}" \
  -d '{
    "bucketId": "site-assets",
    "name": "EcoTrace Site Assets",
    "permissions": ["read(\"any\")"],
    "fileSecurity": false,
    "enabled": true
  }')

echo "Site creation response: $SITE_RESPONSE"

# Upload files
echo "Uploading site files..."
curl -X POST \
  ${APPWRITE_ENDPOINT}/storage/buckets/site-assets/files \
  -H "X-Appwrite-Response-Format: 1.6.0" \
  -H "X-Appwrite-Project: ${PROJECT_ID}" \
  -H "X-Appwrite-Key: ${API_KEY}" \
  -F 'fileId=site-bundle' \
  -F 'file=@site.zip'

echo "Deployment complete!"
echo "Your site should be accessible through Appwrite storage URLs"