/** @param {import('express').Response} res */
export function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

/** @param {import('express').Response} res */
export function fail(res, error, code = 'INTERNAL_ERROR', status = 500) {
  return res.status(status).json({ ok: false, error, code });
}
