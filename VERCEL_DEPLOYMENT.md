# Vercel Deployment Guide

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your backend API deployed and accessible via HTTPS
3. Git repository pushed to GitHub/GitLab/Bitbucket

## Deployment Steps

### 1. Push Your Code to Git

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect Next.js

### 3. Configure Environment Variables

In the Vercel project settings, add these environment variables:

**Required:**
- `NEXT_PUBLIC_API_URL` = `https://your-backend-api.com`
- `NEXT_PUBLIC_BACKEND_URL` = `https://your-backend-api.com`

**Optional:**
- `NEXT_PUBLIC_BOOKING_URL` = (if you have a custom booking URL)

### 4. Deploy

Click "Deploy" and Vercel will build and deploy your application.

## Important Notes

### Backend API Requirements

Your backend API must:
- Be deployed and accessible via HTTPS
- Have CORS configured to allow requests from your Vercel domain
- Return proper JSON responses for `/api/categories` and `/api/booking` endpoints

### CORS Configuration (Backend)

Make sure your backend allows requests from your Vercel domain. For Spring Boot, add:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("https://your-vercel-app.vercel.app")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

### Dynamic Routes

The following routes are configured as dynamic (server-side rendered):
- `/services`
- `/booking`

These will fetch fresh data on each request.

### Revalidation

Data is cached for 60 seconds using Next.js ISR (Incremental Static Regeneration).

## Troubleshooting

### Build Fails with "Dynamic Server Usage" Error

This should be fixed with the current configuration. If it persists:
1. Check that `export const dynamic = 'force-dynamic'` is present in affected pages
2. Verify environment variables are set in Vercel

### API Calls Fail

1. Check that `NEXT_PUBLIC_API_URL` is set correctly in Vercel
2. Verify your backend is accessible via HTTPS
3. Check CORS configuration on your backend
4. Check Vercel function logs for detailed error messages

### Empty Data on Pages

If pages show no data:
1. Verify backend API is returning data correctly
2. Check browser console for errors
3. Check Vercel function logs

## Local Testing Before Deployment

Test with production-like settings locally:

```bash
# Create .env.local with production API URL
echo "NEXT_PUBLIC_API_URL=https://your-backend-api.com" > .env.local
echo "NEXT_PUBLIC_BACKEND_URL=https://your-backend-api.com" >> .env.local

# Build and run
npm run build
npm start
```

## Deployment Checklist

- [ ] Backend API is deployed and accessible via HTTPS
- [ ] CORS is configured on backend
- [ ] Environment variables are set in Vercel
- [ ] Code is pushed to Git repository
- [ ] Project is imported to Vercel
- [ ] Build succeeds without errors
- [ ] Test all pages after deployment
- [ ] Verify booking form works
- [ ] Check admin panel (if deploying)

## Next Steps After Deployment

1. **Custom Domain**: Add your custom domain in Vercel project settings
2. **Analytics**: Enable Vercel Analytics for insights
3. **Monitoring**: Set up error tracking (e.g., Sentry)
4. **Performance**: Check Vercel Speed Insights
