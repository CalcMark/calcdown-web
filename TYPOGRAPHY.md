# Typography Configuration Guide

This document explains how to manage fonts in the CalcDown application.

## Current Configuration

**Font Family:** Google Roboto
**Weights:** 300 (Light), 400 (Regular), 700 (Bold)
**Styles:** Normal and Italic for each weight

## File Locations

- **Typography CSS:** `src/lib/styles/typography.css`
- **Import Location:** `src/routes/+layout.svelte`

## Changing the Application Font

To change the font for the entire application, update `src/lib/styles/typography.css`:

### Option 1: Change to Another Google Font

1. Visit [Google Fonts](https://fonts.google.com/)
2. Select your desired font and weights
3. Copy the `@import` URL
4. Update `typography.css`:

```css
/* Replace this line */
@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap');

/* With your new font, e.g., Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap');

/* Update the font-family variable */
:root {
	--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

### Option 2: Self-Host Font Files

1. Place font files in `static/fonts/`
2. Update `typography.css`:

```css
/* Define @font-face rules */
@font-face {
	font-family: 'Roboto';
	src: url('/fonts/Roboto-Regular.woff2') format('woff2');
	font-weight: 400;
	font-style: normal;
	font-display: swap;
}

@font-face {
	font-family: 'Roboto';
	src: url('/fonts/Roboto-Bold.woff2') format('woff2');
	font-weight: 700;
	font-style: normal;
	font-display: swap;
}

/* Add more @font-face rules for other weights/styles */
```

### Option 3: Use System Fonts Only

```css
/* Remove @import statement */

:root {
	--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}
```

## Font Weights

The application defines three semantic weight variables:

- `--font-weight-light: 300` - For subtle, secondary text
- `--font-weight-regular: 400` - Default body text weight
- `--font-weight-bold: 700` - For headings and emphasis

To use different weight values, update the CSS variables in `typography.css`:

```css
:root {
	--font-weight-light: 200;    /* Example: Extra light */
	--font-weight-regular: 400;   /* Keep regular */
	--font-weight-bold: 800;      /* Example: Extra bold */
}
```

## Utility Classes

Use these classes anywhere in the application:

```html
<p class="font-light">Light weight text</p>
<p class="font-regular">Regular weight text (default)</p>
<p class="font-bold">Bold weight text</p>
```

## High-Quality Rendering

The typography configuration includes cross-browser font smoothing:

- `-webkit-font-smoothing: antialiased` (Safari, Chrome)
- `-moz-osx-font-smoothing: grayscale` (Firefox)
- `text-rendering: optimizeLegibility` (All browsers)

These settings ensure crisp, consistent font rendering across browsers.

## Locale-Specific Fonts (Future)

To add locale-specific fonts (e.g., Japanese, Chinese):

1. Conditionally import fonts based on locale in `typography.css`:

```css
/* Default (Latin) */
@import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap');

/* Japanese - Noto Sans JP */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap');

/* Chinese - Noto Sans SC */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;700&display=swap');
```

2. Update the font stack to include locale fonts:

```css
:root {
	--font-family: 'Roboto', 'Noto Sans JP', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

3. Or use JavaScript to dynamically switch fonts based on detected locale.

## Testing

After changing fonts:

1. Check the dev server at http://localhost:5174
2. Verify font loads in browser DevTools (Network tab → Filter by "font")
3. Test all weights and styles are rendering correctly
4. Run E2E tests to ensure no layout regressions:

```bash
npm run test:e2e
```

## Performance Considerations

- **`&display=swap`**: Ensures text is visible while fonts load (FOUT over FOIT)
- **Weight selection**: Only import weights you actually use to reduce payload
- **Self-hosting**: Consider self-hosting for production to improve performance and privacy

## Monospace Fonts for Code

For code blocks or calculator expressions requiring monospace fonts, create a separate variable:

```css
:root {
	--font-family-mono: 'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace;
}

/* Apply to code elements */
code, pre, .code-block {
	font-family: var(--font-family-mono);
}
```
