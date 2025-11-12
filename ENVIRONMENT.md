# Environment Variables Setup

This project follows [12-Factor App](https://12factor.net/config) methodology for configuration management.

## Quick Start

1. Copy the example file to create your local environment:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual values (never commit this file)

3. For Vercel deployment, use the Vercel CLI to set environment variables

## Local Development

### Environment File Structure

SvelteKit automatically loads environment variables from `.env` files in the following order:

- `.env` - Loaded in all cases
- `.env.local` - Loaded in all cases, ignored by git (use for local overrides)
- `.env.[mode]` - Only loaded in specified mode (e.g., `.env.production`)
- `.env.[mode].local` - Only loaded in specified mode, ignored by git

### Variable Naming Conventions

**PUBLIC\_ prefix (client-side variables):**

- Variables with `PUBLIC_` prefix are exposed to the browser
- Safe for non-sensitive configuration
- Example: `PUBLIC_SUPABASE_URL`, `PUBLIC_APP_NAME`

**No prefix (server-side only):**

- Variables without prefix are server-side only
- Use for secrets, API keys, service role keys
- Example: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

### Example .env File

```bash
# Supabase Configuration
PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Other secrets
API_SECRET_KEY=your-secret-here
```

### Accessing Variables in Code

**Server-side (hooks, +page.server.ts, +server.ts):**

```typescript
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Private variables (server-side only)
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

// Public variables (available everywhere)
const supabaseUrl = PUBLIC_SUPABASE_URL;
```

**Client-side (+page.svelte, components):**

```typescript
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Only PUBLIC_ variables are available
const url = PUBLIC_SUPABASE_URL;
```

## Vercel Deployment

### Using Vercel CLI (Recommended)

The Vercel CLI allows you to manage environment variables from the command line.

#### 1. Install and Login

```bash
npm install -g vercel
vercel login
```

#### 2. Link Your Project

```bash
vercel link
```

This creates a `.vercel` directory with your project configuration (already in git).

#### 3. Add Environment Variables

**Add a single variable:**

```bash
# For all environments (production, preview, development)
vercel env add PUBLIC_SUPABASE_URL

# For specific environment only
vercel env add PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

**Add from your local .env file:**

```bash
# Pull from .env and push to Vercel
vercel env pull .env.local    # Download from Vercel to local
vercel env add < .env         # Not directly supported, use UI or individual commands
```

**Remove a variable:**

```bash
vercel env rm PUBLIC_SUPABASE_URL production
```

**List all variables:**

```bash
vercel env ls
```

**Pull variables to local .env:**

```bash
# Download Vercel environment variables to .env.local for testing
vercel env pull .env.local
```

#### 4. Environment Targets

Vercel has three environment targets:

- **production** - Variables for production deployments (main branch)
- **preview** - Variables for preview deployments (pull requests, other branches)
- **development** - Variables for local development with `vercel dev`

Example: Set different values per environment

```bash
# Production
vercel env add PUBLIC_SUPABASE_URL production
# Enter: https://prod.supabase.co

# Preview
vercel env add PUBLIC_SUPABASE_URL preview
# Enter: https://staging.supabase.co

# Development
vercel env add PUBLIC_SUPABASE_URL development
# Enter: http://localhost:54321
```

### Using Vercel Dashboard (Alternative)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add variables with appropriate environment targets

### Example: Setting Up Supabase

```bash
# Production environment
vercel env add PUBLIC_SUPABASE_URL production
# Enter your production Supabase URL when prompted

vercel env add PUBLIC_SUPABASE_ANON_KEY production
# Enter your production anon key when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter your service role key (server-side only)

# Preview environment (for staging/testing)
vercel env add PUBLIC_SUPABASE_URL preview
# Enter your preview/staging Supabase URL

vercel env add PUBLIC_SUPABASE_ANON_KEY preview
# Enter your preview anon key
```

### Verifying Deployment

After setting variables, redeploy to apply changes:

```bash
vercel --prod
```

Or trigger a redeploy from the dashboard.

## Best Practices

### Security

- ✅ **DO** use `PUBLIC_` prefix only for truly public configuration
- ✅ **DO** use server-side only variables for secrets and API keys
- ✅ **DO** add `.env` and `.env.local` to `.gitignore`
- ✅ **DO** commit `.env.example` with dummy values
- ❌ **DON'T** commit actual secrets to git
- ❌ **DON'T** expose service role keys to the client

### Development Workflow

1. Keep `.env.example` updated with all required variables (no values)
2. Each developer copies `.env.example` to `.env` and fills in their values
3. Use `.env.local` for personal overrides that shouldn't be shared
4. Document what each variable is for and where to get the values

### CI/CD

- Vercel automatically injects environment variables during build
- For GitHub Actions or other CI, use secrets management
- Test environment variables in preview deployments before promoting to production

## Troubleshooting

### Variables not loading

- Restart dev server after changing `.env`
- Check variable naming (must start with `PUBLIC_` for client-side)
- Verify `.env` file is in project root
- Check that `.env` is not gitignored prematurely

### Variables not available in Vercel

- Verify variables are set in correct environment (production/preview/development)
- Redeploy after adding/changing variables
- Check build logs for environment variable warnings
- Use `vercel env ls` to verify variables are set

### Type Safety

Add types for your environment variables:

```typescript
// src/app.d.ts
declare global {
	namespace App {
		interface Platform {
			env: {
				SUPABASE_SERVICE_ROLE_KEY: string;
			};
		}
	}
}

export {};
```

## References

- [SvelteKit Environment Variables](https://kit.svelte.dev/docs/modules#$env-dynamic-private)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel CLI](https://vercel.com/docs/cli)
- [12-Factor App Config](https://12factor.net/config)
