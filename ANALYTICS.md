# Firebase Analytics Setup (Vercel Hosting)

## ✅ Firebase Analytics + Vercel = Perfect Match!

Firebase Analytics er **client-side** tracking som fungerer uavhengig av hosting. Du trenger IKKE Firebase Hosting!

---

## 🔧 Environment Variables (Minimal Setup)

### ✅ Nødvendige (kun for Analytics):

Legg disse i `.env.local`:

```bash
# Firebase Analytics - PÅKREVD
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDUwrCBlNFdYh1PZwLIV-v6P67ldt0ymac
NEXT_PUBLIC_FIREBASE_PROJECT_ID=qrydex
NEXT_PUBLIC_FIREBASE_APP_ID=1:743509328922:web:aaa78d52f16521d19cbda3
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ES9S2XGF6N
```

### ❌ IKKE nødvendige (siden du hoster på Vercel):

```bash
# Disse er bare for Firebase Auth, Storage, og Messaging
# Ikke legg til hvis du ikke bruker de tjenestene
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=qrydex.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=qrydex.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=743509328922
```

> **💡 Tip:** Vår Firebase config støtter optional vars, så du kan legge dem til senere hvis du trenger Firebase Auth eller Storage.

---

## 🚀 Deployment (Vercel)

### 1. Lokal Testing
```bash
# Legg til de 4 påkrevde vars i .env.local
npm run dev
```

### 2. Deploy til Vercel
1. Gå til Vercel Dashboard → Project Settings → Environment Variables
2. Legg til **kun de 4 nødvendige** variablene:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
3. Redeploy

---

## 📊 Firebase Console

**Sjekk analytics:**
1. Gå til [Firebase Console](https://console.firebase.google.com/)
2. Velg "qrydex" project
3. Analytics → Dashboard
4. DebugView for realtime testing

**Enable Debug Mode (testing):**
```bash
# I browser console
window.localStorage.setItem('debug_mode', 'true')
```

---

## 📈 Tracked Events

Firebase Analytics bruker **recommended event names**:

### Automatiske Events
- `page_view` - Hver sidevisning

### Post Interactions
- `view_item` - Post visning
- `create_post` - Lag post  
- `select_content` - Upvote
- `generate_lead` - Comment

### Channel Interactions  
- `join_group` - Join channel
- `leave_group` - Leave channel
- `create_channel` - Lag channel

### User Actions
- `sign_up` - Registrering
- `login` - Innlogging
- `follow_user` - Følg bruker
- `search` - Søk

---

## 💻 Bruk i Code

```tsx
import { trackEvent } from '@/lib/analytics';

// Track events
trackEvent.viewPost(postId);
trackEvent.joinChannel(channelId);
trackEvent.search(query);
```

---

## 🔒 Sikkerhet

**Er API Key trygt å eksponere?**
- ✅ JA! Firebase API keys er ment å være public
- Sikkerhet håndteres av:
  - Firebase Security Rules
  - Domain restrictions (sett i Firebase Console)
  - App Check (ekstra lag)

**Begrens domener i Firebase Console:**
1. Firebase Console → Project Settings → General
2. Under "Your apps" → Web app → App restrictions
3. Legg til: `qrydex.com`, `*.vercel.app`

---

## ✅ Verifisering

1. **Lokal testing:**
   - Restart dev server
   - Besøk siden
   - Åpne Firebase Console → Analytics → DebugView
   - Se events i realtime

2. **Production testing:**
   - Deploy til Vercel
   - Sjekk Firebase Console → Analytics → Events
   - Events vises innen 24 timer

---

## 🆚 Hvorfor Firebase Analytics?

✅ **Gratis** - Ubegrenset events  
✅ **Realtime** - DebugView for instant feedback  
✅ **Auto-sync** - Data syncs til Google Analytics 4  
✅ **User Properties** - Track user segments  
✅ **No Cookies** - GDPR-friendly tracking  
✅ **Works Anywhere** - Vercel, Netlify, etc.

---

## 🎯 Når trenger du de andre vars?

Legg til **kun hvis** du bruker:

| Variable | Trengs for |
|----------|-----------|
| `AUTH_DOMAIN` | Firebase Authentication |
| `STORAGE_BUCKET` | Firebase Storage (bilder/filer) |
| `MESSAGING_SENDER_ID` | Firebase Cloud Messaging (push notifications) |

For **bare Analytics** → Treng du IKKE disse! 🎉

---

## 🐛 Troubleshooting

**Events ikke vises?**
- Sjekk at de 4 nødvendige vars finnes
- Restart dev server
- Sjekk browser console for errors
- Bruk DebugView i Firebase Console

**Ad blockers?**
- Noen ad blockers blokkerer Firebase
- Test i incognito mode
- Events queues offline og sendes senere

**Vercel deployment issues?**
- Sjekk at de 4 env vars er lagt til
- Redeploy etter å legge til vars
- Sjekk Vercel build logs
