# Reels Views - Explained

## The Issue You Found

You noticed that the "Views" shown in the report don't match what you see on Instagram. This was because the system was using the wrong metric.

## What Was Wrong

**Before (Incorrect):**
- Used `total_interactions` metric
- This includes: likes + comments + shares + saves + views
- **Result:** Much higher number than actual views

**After (Fixed):**
- Now uses `plays` metric for Reels
- This matches exactly what Instagram shows
- **Result:** Accurate view count

## Understanding Instagram Metrics

### For Reels:
- **Views (Plays):** Number of times the Reel was played
  - This is what Instagram shows as "views"
  - This is what the report now shows ✅

- **Total Interactions:** Sum of all engagement
  - Likes + Comments + Shares + Saves + Views
  - This was being used before (incorrect) ❌

- **Impressions:** Number of times the Reel appeared on screen
  - Can be higher than views (if someone scrolled past without watching)

### For Regular Videos:
- **Video Views:** Number of times the video was watched
- Similar to Reels plays

### For Images/Carousels:
- **Views:** Number of times the image was viewed
- Different from impressions

## What Changed

1. **Added `getReelPlaysMetric()` method:**
   - Specifically for Reels
   - Uses `plays` metric from Instagram API
   - Matches Instagram's view count exactly

2. **Updated `getVideoViews()` method:**
   - Checks if it's a Reel first
   - Uses `plays` metric for Reels
   - Falls back to other methods for regular videos

## Now Your Reports Will Show

✅ **Reels Views:** Actual play count (matches Instagram)
✅ **Video Views:** Actual view count
✅ **Image Views:** Actual view count

## Test It

1. Generate a new Instagram report
2. Check the "Views" for your Reels
3. Compare with Instagram app
4. They should now match! 🎉

## Technical Details

**API Endpoint Used:**
```
GET /{reel_id}/insights?metric=plays
```

**Response Format:**
```json
{
  "data": [{
    "name": "plays",
    "values": [{
      "value": 1234  // This is the view count
    }]
  }]
}
```

This matches exactly what Instagram shows in the app!

