#!/bin/bash

# Script to clean up macOS metadata files
# Run this before generating Allure reports

echo "🧹 Cleaning up macOS metadata files..."

# Remove .DS_Store files
find . -name ".DS_Store" -delete 2>/dev/null
echo "✅ Removed .DS_Store files"

# Remove ._ files (AppleDouble files)
find . -name "._*" -delete 2>/dev/null
echo "✅ Removed ._ (AppleDouble) files"

# Specifically clean allure-results directory
if [ -d "allure-results" ]; then
    find allure-results -name "._*" -delete 2>/dev/null
    echo "✅ Cleaned allure-results directory"
fi

# Clean old video files (keep only last 10 videos)
if [ -d "allure-results" ]; then
    video_count=$(find allure-results -name "*.webm" | wc -l)
    if [ "$video_count" -gt 10 ]; then
        echo "🎬 Cleaning old video files (keeping last 10)..."
        find allure-results -name "*.webm" -type f -printf '%T@ %p\n' | sort -n | head -n -10 | cut -d' ' -f2- | xargs rm -f 2>/dev/null
        echo "✅ Old video files cleaned"
    fi
fi

echo "🎉 Cleanup completed!"
