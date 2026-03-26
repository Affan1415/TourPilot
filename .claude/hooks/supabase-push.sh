#!/bin/bash

# Hook script to automatically push Supabase migrations when SQL files are written
# This script is called by Claude Code's PostToolUse hook after Write operations

# Read the JSON input from stdin
INPUT=$(cat)

# Extract the file path from the JSON
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | sed 's/"file_path":"//;s/"$//')

# Check if the file is a Supabase migration
if [[ "$FILE_PATH" == *"supabase/migrations/"* && "$FILE_PATH" == *".sql" ]]; then
  echo "Detected new migration: $FILE_PATH"
  echo "Running supabase db push..."

  # Change to the project directory and run the push
  cd "$(dirname "$0")/../.." || exit 1
  npx supabase db push

  if [ $? -eq 0 ]; then
    echo "Migration pushed successfully!"
  else
    echo "Migration push failed. Please check the output above."
    exit 1
  fi
fi
