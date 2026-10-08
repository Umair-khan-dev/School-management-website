// ============================================================================
// PinkEdu Frontend API Service Client
// ============================================================================

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null, remember = false) {
  inMemoryToken = token;
  try {
    if (token && remember) {
      sessionStorage.setItem('pinkedu_session_token', token);
    } else if (!token) {
      sessionStorage.removeItem('pinkedu_session_token');
    }
  } catch {
    // Ignore storage constraints in restricted iframes
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const saved = sessionStorage.getItem('pinkedu_session_token');
    if (saved) {
      inMemoryToken = saved;
      return saved;
    }
  } catch {
    // Ignore
  }
  return null;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  let url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = getAuthToken();
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: reqHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Failed to fetch';

    throw new Error(
      message.includes('Failed to fetch') || message.includes('fetch')
        ? 'Unable to connect to the PinkEdu backend. Please start the server and try again.'
        : message
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  let data: any = {
    success: false,
    message: 'Unexpected server response.',
  };

  if (rawText) {
    try {
      if (contentType.includes('application/json')) {
        data = JSON.parse(rawText);
      } else if (rawText.trim().startsWith('<')) {
        data = {
          success: false,
          message:
            'The backend returned HTML instead of JSON. Make sure the API server is running and the endpoint is valid.',
        };
      } else {
        data = {
          success: false,
          message: rawText.trim() || 'Unexpected server response.',
        };
      }
    } catch {
      data = {
        success: false,
        message: 'The server response could not be parsed. Please check the backend status.',
      };
    }
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data as T;
}
