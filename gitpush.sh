#!/bin/bash

# Check if commit message is provided
if [ -z "$1" ]; then
  echo "Usage: ./gitpush.sh \"commit message\""
  exit 1
fi

msg=$1

git add .
git commit -m "$msg"
git branch -M main
git push -u origin main