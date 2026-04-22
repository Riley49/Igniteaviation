# AGENTS.md

This repo is a lightweight web app for RV-12iS build tracking.

## Main goals
- Keep the UI simple and mobile-friendly
- Do not add frameworks unless explicitly requested
- Preserve current page structure and styling
- Prefer minimal, high-confidence changes

## Files
- `index.html`: parts finder
- `bags.html`: bag tracker
- `tools.html`: tool tracker
- `admin.html`: admin updates and photo upload
- `apps-script/Code.gs`: backend for Google Sheets + login + bag/tool updates

## Data model
Sheets:
- Inventory
- Bags
- Tools

## Constraints
- Cloudinary is used for photo uploads
- Google Apps Script is the backend
- Avoid adding fuzzy search unless explicitly requested
