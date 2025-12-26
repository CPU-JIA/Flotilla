#!/bin/bash
# Batch convert all Mermaid diagrams to PNG
# Usage: bash convert-all.sh

cd "$(dirname "$0")"

echo "Starting Mermaid to PNG conversion..."
echo "============================================"

count=0
total=$(ls -1 *.mmd 2>/dev/null | wc -l)

for file in *.mmd; do
    if [ -f "$file" ]; then
        count=$((count + 1))
        name="${file%.mmd}"
        echo "[$count/$total] Converting: $file -> ${name}.png"
        mmdc -i "$file" -o "${name}.png" -w 1600 -b white --scale 2 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  ✓ Success"
        else
            echo "  ✗ Failed"
        fi
    fi
done

echo "============================================"
echo "Conversion complete! $count files processed."
echo "PNG files saved in: $(pwd)"
