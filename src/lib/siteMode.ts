// One codebase serves two sites. The main site (ibiareview.com) shows prices and takes payments.
// A second deploy sets VITE_HIDE_PRICING=true in its Netlify environment variables to hide every price,
// the Pricing links and checkout, and to ask search engines not to index it.
export const HIDE_PRICING = import.meta.env.VITE_HIDE_PRICING === 'true';
