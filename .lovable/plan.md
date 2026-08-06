# Plan: Add "Start at my school" to the About page

## What we're building
Add a student-facing section on `/about` that explains how to bring Youth Voice to a school, since the current About page is written only for city officials.

## Changes
1. Insert a new section on `src/routes/about.tsx` titled **"Start at my school"**.
2. Content will include:
   - A short pitch students can share with classmates/teachers.
   - Simple steps: open the site, vote on local topics, share the link, submit a school-related topic.
   - A direct link to `/submit` so students can propose school-specific topics immediately.
3. Keep the existing official-facing sections untouched.

## Files touched
- `src/routes/about.tsx`
