# TODO - Fix /events page blank screen crash

## Task: Fix JavaScript runtime error causing /events page to crash to white

- [x] 1. Fix useEvents.ts — wrap auto-update in try/catch
- [x] 2. Fix EventsList.tsx — add error boundary
- [x] 3. Fix EventCard.tsx — guard against undefined fields
- [x] 4. Add a global error boundary in App.tsx
- [x] 5. Test in browser and check console for errors
- [x] 6. Fix StatusBadge.tsx — guard against undefined status
- [x] 7. Fix Dashboard.tsx — normalize status comparison for case variations
- [x] 8. Fix time display to use IST (Indian Standard Time)
  - Added toIST(), nowInIST(), todayInIST(), formatInIST() utilities in utils.ts
  - Updated Dashboard.tsx, EventCard.tsx, EventDetail.tsx to use IST
  - Fixed nowInIST() to properly get current time in IST timezone
  - Updated useEvents.ts to use nowInIST() for status auto-updates

