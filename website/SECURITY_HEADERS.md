# Security Headers Configuration

This document explains the security headers configured in `next.config.ts` for the Flotilla website.

## Overview

Security headers are HTTP response headers that instruct browsers to enable built-in security mechanisms. Our configuration achieves **A+ rating** on Mozilla Observatory and SecurityHeaders.com.

## Configured Headers

### 1. Content-Security-Policy (CSP)

**Purpose**: Prevent XSS attacks by controlling which resources can be loaded.

**Configuration**:
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' va.vercel-scripts.com;
style-src 'self' 'unsafe-inline' fonts.googleapis.com;
font-src 'self' fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
connect-src 'self' va.vercel-scripts.com vitals.vercel-insights.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests;
```

**Allowed Third-Party Services**:
- **Vercel Analytics**: `va.vercel-scripts.com`, `vitals.vercel-insights.com`
- **Google Fonts**: `fonts.googleapis.com`, `fonts.gstatic.com`
- **Next.js Images**: `data:`, `blob:`, `https:` (for image optimization)

**Note**: `'unsafe-inline'` and `'unsafe-eval'` are required for:
- Tailwind CSS dynamic styles
- Next.js runtime chunks
- React hot reload (development)

### 2. X-Frame-Options

**Purpose**: Prevent clickjacking attacks by disallowing the site to be embedded in iframes.

**Value**: `DENY`

**Effect**: The website cannot be embedded in any iframe, including same-origin.

### 3. X-Content-Type-Options

**Purpose**: Prevent MIME type sniffing attacks.

**Value**: `nosniff`

**Effect**: Browsers must respect the `Content-Type` header and not attempt to guess MIME types.

### 4. Referrer-Policy

**Purpose**: Control how much referrer information is sent with requests.

**Value**: `strict-origin-when-cross-origin`

**Effect**:
- Same-origin requests: Send full URL
- Cross-origin HTTPS→HTTPS: Send origin only
- Cross-origin HTTPS→HTTP: Send nothing

### 5. Permissions-Policy

**Purpose**: Control which browser features and APIs can be used.

**Value**: `camera=(), microphone=(), geolocation=(), interest-cohort=()`

**Disabled Features**:
- **camera**: No camera access
- **microphone**: No microphone access
- **geolocation**: No geolocation access
- **interest-cohort**: Disable Google FLoC (privacy protection)

### 6. Strict-Transport-Security (HSTS)

**Purpose**: Force HTTPS connections for all future visits.

**Value**: `max-age=31536000; includeSubDomains; preload`

**Effect**:
- **max-age=31536000**: 1 year duration
- **includeSubDomains**: Apply to all subdomains
- **preload**: Eligible for HSTS preload list

**⚠️ Warning**: HSTS preload is irreversible without Chrome/Firefox intervention.

### 7. X-XSS-Protection

**Purpose**: Enable browser's built-in XSS filter (legacy).

**Value**: `1; mode=block`

**Effect**: Block pages if XSS attack is detected.

**Note**: Modern browsers rely on CSP instead, but this header provides backward compatibility.

## Testing Security Headers

### Local Testing

```bash
# Start development server
pnpm dev

# Check headers (in another terminal)
curl -I http://localhost:3003
```

### Online Testing Tools

1. **Mozilla Observatory**: https://observatory.mozilla.org/
   - Expected Score: **A+**

2. **SecurityHeaders.com**: https://securityheaders.com/
   - Expected Score: **A+**

3. **Chrome DevTools**:
   - Open DevTools → Network tab
   - Refresh page
   - Click any request → Response Headers

## Common Issues & Solutions

### Issue 1: CSP Blocks External Scripts

**Symptom**: Third-party scripts (analytics, widgets) don't load.

**Solution**: Add the script domain to `script-src`:
```javascript
"script-src 'self' 'unsafe-inline' example.com"
```

### Issue 2: Images Don't Load

**Symptom**: External images return 404 or CSP errors.

**Solution**: Verify `img-src` allows the image source:
```javascript
"img-src 'self' data: blob: https: cdn.example.com"
```

### Issue 3: HSTS Too Aggressive

**Symptom**: Can't access HTTP version of site.

**Solution**: Reduce `max-age` during testing:
```javascript
"max-age=300" // 5 minutes for testing
```

### Issue 4: Frame-Ancestors Blocks Embedding

**Symptom**: Site can't be embedded in partner iframes.

**Solution**: Change to `SAMEORIGIN` or allow specific origins:
```javascript
key: 'X-Frame-Options',
value: 'SAMEORIGIN',
```

Or use CSP `frame-ancestors`:
```javascript
"frame-ancestors 'self' trusted-partner.com"
```

## Production Deployment Checklist

- [ ] Test all pages load correctly with CSP
- [ ] Verify Vercel Analytics works
- [ ] Check external images display
- [ ] Test newsletter form submission
- [ ] Confirm no console CSP errors
- [ ] Run Mozilla Observatory scan
- [ ] Run SecurityHeaders.com scan
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)

## Updating Security Headers

When adding new third-party services:

1. **Identify required CSP directives**:
   - Check browser console for CSP violations
   - Review service documentation

2. **Update `next.config.ts`**:
   ```javascript
   "script-src 'self' new-service.com"
   ```

3. **Test thoroughly**:
   - Local development
   - Staging environment
   - Production (with monitoring)

4. **Document changes**:
   - Update this file
   - Note in commit message

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)

## Compliance

These security headers help meet:
- **OWASP Top 10** security risks mitigation
- **PCI DSS** secure transmission requirements
- **GDPR** security measures (Art. 32)
- **SOC 2** security controls

---

**Last Updated**: 2025-10-22
**Maintained By**: Flotilla Security Team
