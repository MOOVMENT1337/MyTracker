import { randomUUID } from 'node:crypto';
import { ApiError, required, type Filters, type IssueInput, type IssuePatch, type PublicUser } from '../domain.js';
import { transaction, type Database, type Queryable } from '../db/pool.js';
import { requireAdmin } from './users.js';

const issueColumns = `i.id, i.key, i.queue_id AS "queueId", i.summary, i.description, i.status,
  i.priority, i.type, i.assignee_id AS "assigneeId", i.reporter_id AS "reporterId",
  i.created_at AS "createdAt", i.updated_at AS "updatedAt", i.status_changed_at AS "statusChangedAt", i.version`;
const commentColumns = `c.id, c.issue_id AS "issueId", c.author_id AS "authorId", u.display_name AS author, c.text, c.created_at AS "createdAt"`;
type Row = Record<string, any>;

export async function logActivity(db: Queryable, actorId: string, msg: string) {
  await db.query('INSERT INTO activity_log (actor_id,msg) VALUES ($1,$2)', [actorId, msg]);
}
export async function getIssue(db: Queryable, id: string) {
  const issue = required((await db.query(`SELECT ${issueColumns} FROM issues i WHERE i.id=$1`, [id])).rows[0], 'Issue');
  issue.comments = (await db.query(`SELECT ${commentColumns} FROM comments c JOIN users u ON u.id=c.author_id WHERE c.issue_id=$1 ORDER BY c.created_at,c.id`, [id])).rows;
  return issue;
}
export function buildWhere(filters: Filters, userId: string) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown, operator = '=') => {
    values.push(value); clauses.push(`${column} ${operator} $${values.length}`);
  };
  if (filters.queueId) add('i.queue_id', filters.queueId);
  if (filters.assigneeId) add('i.assignee_id', filters.assigneeId);
  if (filters.myTasks === 'true') add('i.assignee_id', userId);
  for (const field of ['status', 'priority', 'type'] as const) {
    const selected = filters[field];
    if (selected) {
      values.push(Array.isArray(selected) ? selected : [selected]);
      clauses.push(`i.${field} = ANY($${values.length}::text[])`);
    }
  }
  if (filters.search) {
    // Escape LIKE metacharacters: user search is literal text, not a SQL pattern.
    values.push(`%${filters.search.replace(/[\\%_]/g, '\\$&')}%`);
    clauses.push(`(i.summary ILIKE $${values.length} OR i.description ILIKE $${values.length} OR i.key ILIKE $${values.length})`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}
export async function listIssues(pool: Database, filters: Filters, actorId: string) {
  return transaction(pool, async db => {
    await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const { sql, values } = buildWhere(filters, actorId);
    const total = Number((await db.query(`SELECT count(*) FROM issues i ${sql}`, values)).rows[0].count);
    const issues = (await db.query(`SELECT ${issueColumns} FROM issues i ${sql}
      ORDER BY i.updated_at DESC,i.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, filters.limit, filters.offset])).rows;
    const comments = (await db.query(`SELECT ${commentColumns} FROM comments c JOIN users u ON u.id=c.author_id
      WHERE c.issue_id=ANY($1::text[]) ORDER BY c.created_at,c.id`, [issues.map(i => i.id)])).rows;
    const grouped = new Map<string, Row[]>();
    for (const comment of comments) grouped.set(comment.issueId, [...(grouped.get(comment.issueId) || []), comment]);
    for (const issue of issues) issue.comments = grouped.get(issue.id) || [];
    return { data: issues, pagination: { total, limit: filters.limit, offset: filters.offset } };
  });
}
export async function stats(pool: Database, filters: Filters, actorId: string) {
  const { sql, values } = buildWhere(filters, actorId);
  const rows = (await pool.query(`SELECT status,count(*)::int AS count FROM issues i ${sql} GROUP BY status`, values)).rows;
  const byStatus: Record<string, number> = { Open: 0, 'In Progress': 0, 'Need Info': 0, Done: 0, Closed: 0 };
  for (const row of rows) byStatus[row.status] = row.count;
  return { total: rows.reduce((sum, row) => sum + row.count, 0), byStatus };
}
export async function createQueue(pool: Database, actorId: string, input: { name: string; key: string; color: string }) {
  return transaction(pool, async db => {
    const queue = (await db.query('INSERT INTO queues (id,name,key,color) VALUES ($1,$2,$3,$4) RETURNING *', [randomUUID(), input.name, input.key, input.color])).rows[0];
    await logActivity(db, actorId, `Queue "${queue.name}" (${queue.key}) created`);
    return queue;
  });
}
export async function deleteQueue(pool: Database, actor: PublicUser, id: string) {
  requireAdmin(actor);
  return transaction(pool, async db => {
    // Same queue-first locking order as issue creation prevents counter/delete races.
    const queue = required((await db.query('SELECT * FROM queues WHERE id=$1 FOR UPDATE', [id])).rows[0], 'Queue');
    const issueCount = Number((await db.query('SELECT count(*) FROM issues WHERE queue_id=$1', [id])).rows[0].count);
    await db.query('DELETE FROM queues WHERE id=$1', [id]);
    await logActivity(db, actor.id, `Queue "${queue.name}" (${queue.key}) deleted with ${issueCount} issue(s)`);
    return { queue, issueCount };
  });
}
export async function createIssue(pool: Database, actorId: string, input: IssueInput) {
  return transaction(pool, async db => {
    const queue = required((await db.query('UPDATE queues SET counter=counter+1 WHERE id=$1 RETURNING key,counter', [input.queueId])).rows[0], 'Queue');
    const id = randomUUID();
    const key = `${queue.key}-${queue.counter}`;
    await db.query(`INSERT INTO issues (id,key,queue_id,summary,description,status,priority,type,assignee_id,reporter_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [id, key, input.queueId, input.summary, input.description, input.status, input.priority, input.type, input.assigneeId, actorId]);
    await logActivity(db, actorId, `Issue "${key}: ${input.summary}" created`);
    return getIssue(db, id);
  });
}
export async function updateIssue(pool: Database, actorId: string, id: string, changes: IssuePatch) {
  return transaction(pool, async db => {
    const old = required((await db.query('SELECT * FROM issues WHERE id=$1 FOR UPDATE', [id])).rows[0], 'Issue');
    if (changes.version !== undefined && old.version !== changes.version) throw new ApiError(409, 'VERSION_CONFLICT', 'Issue changed; reload before saving');
    const statusChanged = changes.status !== undefined && changes.status !== old.status;
    const columns: Record<string, string> = { summary: 'summary', description: 'description', status: 'status', priority: 'priority', type: 'type', assigneeId: 'assignee_id' };
    const values: unknown[] = [id];
    const assignments = ['updated_at=clock_timestamp()', 'version=version+1'];
    for (const [field, column] of Object.entries(columns)) {
      if (Object.hasOwn(changes, field)) {
        values.push(changes[field as keyof IssuePatch]);
        assignments.push(`${column}=$${values.length}`);
      }
    }
    if (statusChanged) assignments.push('status_changed_at=clock_timestamp()');
    await db.query(`UPDATE issues SET ${assignments.join(',')} WHERE id=$1`, values);
    if (statusChanged) await logActivity(db, actorId, `"${old.key}" status changed: ${old.status} → ${changes.status}`);
    return getIssue(db, id);
  });
}
export async function deleteIssue(pool: Database, actorId: string, id: string) {
  return transaction(pool, async db => {
    const issue = required((await db.query('DELETE FROM issues WHERE id=$1 RETURNING key', [id])).rows[0], 'Issue');
    await logActivity(db, actorId, `Issue "${issue.key}" deleted`);
  });
}
export async function addComment(pool: Database, actorId: string, issueId: string, text: string) {
  return transaction(pool, async db => {
    const issue = required((await db.query('UPDATE issues SET updated_at=clock_timestamp(),version=version+1 WHERE id=$1 RETURNING key', [issueId])).rows[0], 'Issue');
    const id = randomUUID();
    await db.query('INSERT INTO comments (id,issue_id,author_id,text) VALUES ($1,$2,$3,$4)', [id, issueId, actorId, text]);
    await logActivity(db, actorId, `Comment added on "${issue.key}"`);
    return (await db.query(`SELECT ${commentColumns} FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=$1`, [id])).rows[0];
  });
}
export async function deleteComment(pool: Database, actor: PublicUser, issueId: string, commentId: string) {
  return transaction(pool, async db => {
    required((await db.query('SELECT id FROM issues WHERE id=$1 FOR UPDATE', [issueId])).rows[0], 'Issue');
    const comment = required((await db.query('SELECT author_id FROM comments WHERE id=$1 AND issue_id=$2', [commentId, issueId])).rows[0], 'Comment');
    if (comment.author_id !== actor.id) throw new ApiError(403, 'FORBIDDEN', 'Only the author can delete this comment');
    await db.query('DELETE FROM comments WHERE id=$1', [commentId]);
    await db.query('UPDATE issues SET updated_at=clock_timestamp(),version=version+1 WHERE id=$1', [issueId]);
  });
}
