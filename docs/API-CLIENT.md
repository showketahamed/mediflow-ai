# Frontend API Client

The browser client lives in `src/app/services/apiClient.ts`. It sends credentials for refresh cookies, attaches an access token when available, requests a CSRF token for cookie-authenticated mutations, and retries one eligible request after a successful refresh.

## Error handling

`ApiRequestError` includes the HTTP status. UI code can use it to distinguish validation errors from access failures or service errors without parsing a message string.

Requests time out after 20 seconds. A timeout is reported as status `408` with a retry-friendly message. Callers can still provide an `AbortSignal` for cancellation when leaving a page or discarding a search.

`VITE_API_URL` must be an HTTP or HTTPS absolute URL. Invalid values fall back to the local development endpoint instead of attempting an unsafe scheme.
