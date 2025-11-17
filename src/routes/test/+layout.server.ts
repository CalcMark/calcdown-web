import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// Prevent /test routes from being accessible in production
export async function load() {
	if (!dev) {
		// In production, throw 404 for all /test routes
		throw error(404, 'Not found');
	}

	// In development, allow access
	return {};
}
