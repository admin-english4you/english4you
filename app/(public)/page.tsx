// ⚠️ This file is superseded by app/page.tsx to avoid a duplicate "/" route.
// Next.js route groups (parentheses) don't create URL segments, so
// app/(public)/page.tsx and app/page.tsx BOTH serve "/" — which causes a build error.
// The landing page now lives in app/page.tsx.
// Delete this file if you no longer need the (public) route group for other pages.
export {};
