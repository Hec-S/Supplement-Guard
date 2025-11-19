#!/bin/bash

echo "GitHub Push Helper"
echo "=================="
echo ""
echo "First, you need to create a Personal Access Token on GitHub:"
echo "1. Go to: https://github.com/settings/tokens/new"
echo "2. Give it a name (e.g., 'Git Push Token')"
echo "3. Select scopes: 'repo' (full control of private repositories)"
echo "4. Click 'Generate token'"
echo "5. Copy the token (it starts with 'ghp_')"
echo ""
read -p "Enter your GitHub username: " username
read -s -p "Enter your Personal Access Token: " token
echo ""

# Configure git to use the token
git config --local credential.helper ""
git config --local credential.helper "!f() { echo username=$username; echo password=$token; }; f"

# Try to push
echo "Attempting to push..."
git push origin main

# Clean up the credential helper for security
git config --local --unset credential.helper

echo ""
echo "Push attempt completed. If successful, your changes are now on GitHub."