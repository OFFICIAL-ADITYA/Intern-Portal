import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const request = async (method, url, payload, config = {}) => {
  try {
    const isGet = method.toLowerCase() === 'get';
    const response = await adminApi({
      method,
      url,
      params: isGet ? payload : config.params,
      data: !isGet ? payload : undefined,
      ...config,
    });

    return response.data;
  } catch (error) {
    const data = error.response?.data;

    const validationMessage = data?.errors
      ?.map(({ msg }) => msg)
      .join(' ');

    throw new Error(
      validationMessage ||
        data?.message ||
        (error.response?.status === 500
          ? 'Internal server error.'
          : 'Request failed.'),
      {
        cause: error,
      }
    );
  }
};

/*
|--------------------------------------------------------------------------
| Admin User Management
|--------------------------------------------------------------------------
*/

export const createIntern = (payload) =>
  request(
    'post',
    '/api/admin/create-intern',
    payload
  );

export const createTeamLeader = (payload) =>
  request(
    'post',
    '/api/admin/create-tl',
    payload
  );


/*
|--------------------------------------------------------------------------
| Intern Management API
|--------------------------------------------------------------------------
*/

export const getAllInterns = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined && value !== ''
    )
  );

  const qs = query.toString()
    ? `?${query.toString()}`
    : '';

  return request(
    'get',
    `/api/admin/interns${qs}`
  );
};

export const getInternById = (id) =>
  request(
    'get',
    `/api/admin/interns/${id}`
  );

export const updateIntern = (id, payload) =>
  request(
    'patch',
    `/api/admin/interns/${id}`,
    payload
  );

export const assignInternTeamLeader = (
  id,
  teamLeaderId
) =>
  request(
    'patch',
    `/api/admin/interns/${id}/assignment`,
    {
      teamLeaderId,
    }
  );


/*
|--------------------------------------------------------------------------
| Team Leader Management API
|--------------------------------------------------------------------------
*/

export const getAllTeamLeaders = (params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined && value !== ''
    )
  );

  const qs = query.toString()
    ? `?${query.toString()}`
    : '';

  return request(
    'get',
    `/api/admin/teamleaders${qs}`
  );
};

export const getTeamLeaderById = (id) =>
  request(
    'get',
    `/api/admin/teamleaders/${id}`
  );

export const updateTeamLeader = (
  id,
  payload
) =>
  request(
    'patch',
    `/api/admin/teamleaders/${id}`,
    payload
  );

export const getInternsByTeamLeader = (id) =>
  request(
    'get',
    `/api/admin/teamleaders/${id}/interns`
  );


/*
|--------------------------------------------------------------------------
| Certificate Request Management
|--------------------------------------------------------------------------
*/

export const getForwardedRequests = () =>
  request(
    'get',
    '/api/admin/forwarded-requests'
  );

export const getAdminRequests = (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(
    'get',
    `/api/admin/requests${qs}`
  );
};

export const finalizeRequest = (
  id,
  action,
  rejectionReason
) =>
  request(
    'patch',
    `/api/admin/requests/${id}/finalize`,
    action === 'reject'
      ? {
          action,
          rejectionReason,
        }
      : {
          action,
        }
  );


/*
|--------------------------------------------------------------------------
| Certificate Draft Management
|--------------------------------------------------------------------------
*/

export const getCertificateDraft = (id) =>
  request(
    'get',
    `/api/admin/certificates/${id}`
  );

export const updateCertificateDraft = (
  id,
  htmlContent
) =>
  request(
    'patch',
    `/api/admin/certificates/${id}`,
    {
      htmlContent,
    }
  );

export const finalizeCertificate = (id) =>
  request(
    'post',
    `/api/admin/certificates/${id}/finalize`
  );


/*
|--------------------------------------------------------------------------
| Admin Certificates
|--------------------------------------------------------------------------
*/

export const getAllCertificates = () =>
  request(
    'get',
    '/api/admin/certificates'
  );

export const revokeCertificate = (id, reason) =>
  request(
    'patch',
    `/api/admin/certificates/${id}/revoke`,
    { reason }
  );

export const unrevokeCertificate = (id) =>
  request(
    'patch',
    `/api/admin/certificates/${id}/unrevoke`
  );

export const retryCertificateGeneration = (
  id
) =>
  request(
    'post',
    `/api/admin/requests/${id}/retry-generation`
  );

export const downloadAdminCertificate = async (
  id,
  fileName
) => {
  try {
    const response = await adminApi.get(
      `/api/admin/certificates/${id}/download`,
      {
        responseType: 'blob',
      }
    );

    const blob = new Blob(
      [response.data],
      {
        type: 'application/pdf',
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.setAttribute(
      'download',
      fileName || 'certificate.pdf'
    );

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    const data = error.response?.data;

    throw new Error(
      data?.message ||
        'Failed to download certificate.',
      {
        cause: error,
      }
    );
  }
};


/*
|--------------------------------------------------------------------------
| Certificate Template Management API
|--------------------------------------------------------------------------
*/

/**
 * Get all certificate templates.
 *
 * GET /api/admin/templates
 */
export const getCertificateTemplates = () =>
  request(
    'get',
    '/api/admin/templates'
  );


/**
 * Get supported certificate placeholders.
 *
 * GET /api/admin/templates/placeholders
 */
export const getTemplatePlaceholders = () =>
  request(
    'get',
    '/api/admin/templates/placeholders'
  );


/**
 * Create a certificate template.
 *
 * POST /api/admin/templates
 */
export const createCertificateTemplate = (
  payload
) =>
  request(
    'post',
    '/api/admin/templates',
    payload
  );


/**
 * Update a certificate template.
 *
 * PATCH /api/admin/templates/:id
 */
export const updateCertificateTemplate = (
  id,
  payload
) =>
  request(
    'patch',
    `/api/admin/templates/${id}`,
    payload
  );


/*
|--------------------------------------------------------------------------
| Retention Policy
|--------------------------------------------------------------------------
*/

/**
 * Get retention policy.
 *
 * GET /api/admin/retention-policy
 */
export const getRetentionPolicy = () =>
  request(
    'get',
    '/api/admin/retention-policy'
  );


/**
 * Update retention policy.
 *
 * PATCH /api/admin/retention-policy
 */
export const updateRetentionPolicy = (
  payload
) =>
  request(
    'patch',
    '/api/admin/retention-policy',
    payload
  );


/*
|--------------------------------------------------------------------------
| Archived Interns
|--------------------------------------------------------------------------
*/

/**
 * Get archived interns.
 *
 * GET /api/admin/interns/archived
 */
export const getArchivedInterns = () =>
  request(
    'get',
    '/api/admin/interns/archived'
  );


/**
 * Restore archived intern.
 *
 * PATCH /api/admin/interns/:id/restore
 */
export const restoreIntern = (id) =>
  request(
    'patch',
    `/api/admin/interns/${id}/restore`
  );

/*
|--------------------------------------------------------------------------
| Audit Logs
|--------------------------------------------------------------------------
*/

/**
 * Get paginated audit logs with filters.
 *
 * GET /api/admin/audit-logs
 */
export const getAuditLogs = (params) =>
  request(
    'get',
    '/api/admin/audit-logs',
    params
  );

/**
 * Export audit logs as CSV.
 *
 * GET /api/admin/audit-logs/export
 */
export const exportAuditLogs = async (params) => {
  const response = await adminApi.get('/api/admin/audit-logs/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};