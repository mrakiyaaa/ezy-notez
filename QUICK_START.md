# Quick Start Guide - Create Workspace Feature

## 🚀 Getting Started

### Prerequisites
- Backend running on `http://localhost:3001`
- Frontend running on `http://localhost:3000`
- Supabase project configured
- User authenticated

---

## 📋 Setup Checklist

### Backend Setup

1. **Database Migration** (Run in Supabase SQL Editor)
```sql
-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  aura TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint
ALTER TABLE public.workspaces 
  ADD CONSTRAINT unique_slug_per_user UNIQUE (user_id, slug);

-- Indexes
CREATE INDEX idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);
```

2. **Environment Variables** (.env)
```env
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PORT=3001
NODE_ENV=development
```

3. **Start Backend**
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

1. **Environment Variables** (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

2. **Start Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing the Feature

### Test 1: Create Workspace
1. Open `http://localhost:3000/workspaces`
2. Click "Create workspace" button
3. Fill form:
   - Name: "My First Workspace"
   - Description: "Testing the feature"
   - Select a color
4. Click "Create"
5. **Expected**: Redirected to `/workspaces/my-first-workspace`

### Test 2: View Workspace Details
1. You should see workspace overview page
2. Check:
   - Workspace name displays
   - Description shows (if added)
   - Aura color visible in header
   - Navigation cards present (Study Room, Resources, Quiz, Flashcards)

### Test 3: Return to List
1. Go back to `/workspaces`
2. **Expected**: Your new workspace appears in the list
3. Click workspace card to open details again

### Test 4: Duplicate Workspace Names
1. Create two workspaces with name "Test Project"
2. Check slugs:
   - First: `test-project`
   - Second: `test-project-2`
3. **Expected**: Both accessible at their respective URLs

### Test 5: Special Characters in Name
1. Create workspace: "React 101!!!"
2. **Expected**: Slug is `react-101`

---

## 📡 API Testing

### Using cURL or REST Client (VS Code REST Client)

**Create Workspace**
```
POST http://localhost:3001/api/workspaces
Authorization: Bearer YOUR_AUTH_TOKEN
Content-Type: application/json

{
  "name": "API Test Workspace",
  "description": "Testing via API",
  "aura": "#FF6B6B"
}
```

**List Workspaces**
```
GET http://localhost:3001/api/workspaces
Authorization: Bearer YOUR_AUTH_TOKEN
```

**Get Workspace by Slug**
```
GET http://localhost:3001/api/workspaces/api-test-workspace
Authorization: Bearer YOUR_AUTH_TOKEN
```

---

## 🔧 Troubleshooting

### Issue: "Workspace not found" after creation
**Solution**: 
- Check browser network tab for 404
- Verify slug matches Database
- Ensure user_id in token matches workspace table

### Issue: Modal doesn't close after submit
**Solution**:
- Check browser console for errors
- Verify API response includes `data.slug`
- Check network request succeeded (201 status)

### Issue: Workspace appears in list but can't navigate
**Solution**:
- Verify slug is URL-friendly (no spaces, special chars)
- Check [slug] folder exists in Next.js
- Clear Next.js cache: `rm -rf .next`

### Issue: "Unauthorized" when creating workspace
**Solution**:
- Verify authentication token in cookie/header
- Check backend auth middleware
- Log in again to get fresh token

### Issue: Database constraint error
**Solution**:
- Verify workspaces table exists
- Run migration SQL above
- Check unique constraint on (user_id, slug)

---

## 📝 Code Locations

**Need to find something?**

| Feature | File |
|---------|------|
| Slug generation | `backend/src/utils/slugGenerator.ts` |
| Workspace logic | `backend/src/services/workspace.service.ts` |
| API handlers | `backend/src/controllers/workspace.controller.ts` |
| Routes | `backend/src/routes/workspace.routes.ts` |
| **Frontend** | |
| Create modal | `frontend/src/components/workspaces/CreateWorkspaceModal.tsx` |
| List page | `frontend/src/app/(dashboard)/workspaces/page.tsx` |
| Detail page | `frontend/src/app/(dashboard)/workspaces/[slug]/page.tsx` |
| API client | `frontend/src/lib/api/workspace.api.ts` |
| Types | `frontend/src/types/workspace.ts` |

---

## 🎨 UI Components

### Create Workspace Modal
- Input: Workspace name (required)
- Input: Description (optional)
- Selection: 8 color options
- Buttons: Cancel, Create
- States: Loading, Error, Success

### Workspaces List
- Grid layout (1-3 columns)
- Search bar
- Create button
- Empty state when no workspaces
- Workspace cards with click navigation

### Workspace Detail Page
- Header with aura color
- Workspace name and description
- 4 navigation cards
- Demo content section

---

## 🔐 Authentication

All API requests require Bearer token:

```javascript
// Using fetch
fetch('/api/workspaces', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Using axios (configured in workspace.api.ts)
// Automatically added via withCredentials
```

**How to get token:**
1. Log in via `/login` page
2. Token stored in Supabase session
3. Automatically sent via cookies or auth header

---

## 📊 Success Indicators

✅ **Backend Working**
- POST /api/workspaces returns 201
- Response includes slug
- GET /api/workspaces returns array
- GET /api/workspaces/:slug returns single workspace

✅ **Frontend Working**
- Modal opens on button click
- Form validates inputs
- Workspace created successfully
- Redirects to detail page
- List reloads with new workspace
- All pages render without errors

---

## 🚨 Common Implementation Issues

### Issue: FormData shows `slug` undefined
**Fix**: Ensure API response includes `data: { slug, ... }`

### Issue: Navigation doesn't work
**Fix**: Check URL format `/workspaces/[slug]` in browser

### Issue: Types don't match
**Fix**: Verify `Workspace` interface includes all fields

### Issue: Modal stays open on error
**Fix**: Check error handling in `onSuccess` callback

---

## 📚 Related Documentation

- **Full Feature Doc** → `WORKSPACE_FEATURE.md`
- **File Structure** → `STRUCTURE.md`
- **Implementation Summary** → `IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Next Steps

After successful testing:

1. [ ] Add unit tests for slug generation
2. [ ] Add integration tests for API endpoints
3. [ ] Test with various edge cases
4. [ ] Performance testing with large workspaces
5. [ ] Deploy to staging environment
6. [ ] Get stakeholder approval
7. [ ] Deploy to production

---

## 💡 Tips & Tricks

**Reset Everything (Development)**
```bash
# Clear Next.js cache
rm -rf frontend/.next

# Restart backend
npm run dev

# Hard refresh frontend
Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

**Test with Seed Data**
```javascript
// In browser console after login
const workspaces = [
  { name: "React Learning", description: "Frontend basics", aura: "#45B7D1" },
  { name: "Node Mastery", description: "Backend API", aura: "#4ECDC4" },
  { name: "Python Projects", description: "Data science", aura: "#F7DC6F" }
];
// Create each one manually or via API
```

**Debug Slug Generation**
```javascript
// In browser console
import { generateSlug } from '@/utils/slugGenerator'
generateSlug("React 101!!!") // Returns "react-101"
```

---

## 📞 Support

**For issues, check:**
1. Browser console for errors
2. Network tab for API responses
3. Database logs in Supabase
4. Backend logs in terminal

**Common error messages:**
- `"Workspace name is required"` - Name field empty
- `"Workspace aura is required"` - Color not selected
- `"Workspace not found"` - Wrong slug or wrong user
- `"Unauthorized"` - Invalid token

---

**You're all set! 🎉 Start testing the Create Workspace feature!**
