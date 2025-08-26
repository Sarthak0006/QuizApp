export function getPagination(q: any) {
    const page = Math.max(1, Number(q.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize || 10)));
    const offset = (page - 1) * pageSize;
    const limit = pageSize;
    return { page, pageSize, offset, limit };
}
